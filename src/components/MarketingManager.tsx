import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listBanners,
  listCampaigns,
  uploadBannerImage,
  type Banner,
  type Campaign,
  type PromoCard,
} from "@/lib/marketing";
import { SmartAssetManager } from "@/components/SmartAssetManager";
import { AdminBannerStudio } from "@/components/AdminBannerStudio";
import { AdminDynamicLayout } from "@/components/AdminDynamicLayout";

const inputCls =
  "w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary";

type Opt = { id: string; name: string };

export function MarketingManager() {
  const [vendors, setVendors] = useState<Opt[]>([]);
  const [cats, setCats] = useState<Opt[]>([]);

  useEffect(() => {
    supabase.from("vendors").select("id,stall_name").eq("status", "APPROVED").then(({ data }) =>
      setVendors((data ?? []).map((v) => ({ id: v.id, name: v.stall_name }))),
    );
    supabase.from("categories").select("id,name").order("sort_order").then(({ data }) =>
      setCats((data ?? []).map((c) => ({ id: c.id, name: c.name }))),
    );
  }, []);

  return (
    <div className="space-y-3">
      <AdminDynamicLayout />
      <AdminBannerStudio />
      <BannerManager vendors={vendors} cats={cats} />
      <CampaignBuilder cats={cats} />
      <SmartAssetManager />
    </div>
  );
}

function BannerManager({ vendors, cats }: { vendors: Opt[]; cats: Opt[] }) {
  const [rows, setRows] = useState<Banner[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("NONE");
  const [vendorId, setVendorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = () => listBanners(false).then(setRows);
  useEffect(() => { load(); }, []);

  async function publish() {
    if (!file) { toast.error("Choose a banner picture first."); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast.error("Use a JPG, PNG or WebP picture."); return; }
    const p = Math.min(5, Math.max(1, Number(priority) || 1));
    setBusy(true);
    const up = await uploadBannerImage(file);
    if ("error" in up) { setBusy(false); toast.error(up.error); return; }
    const { error } = await supabase.from("banners").insert({
      image_url: up.url,
      image_path: up.path,
      target_type: target,
      vendor_id: target === "STALL" ? vendorId || null : null,
      category_id: target === "CATEGORY" ? categoryId || null : null,
      priority: p,
      is_active: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Banner published.");
    setFile(null);
    setPriority("1");
    load();
  }

  async function toggle(b: Banner) {
    const { error } = await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !b.is_active } : x)));
  }

  async function remove(b: Banner) {
    if (!window.confirm("Delete this banner permanently?")) return;
    if (b.image_path) await supabase.storage.from("banners").remove([b.image_path]);
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.filter((x) => x.id !== b.id));
    toast.success("Banner deleted.");
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <p className="text-sm font-bold">Banner upload</p>
      <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP · best in 3:1 or 16:9 shape.</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full rounded-xl border border-border px-3 py-2 text-xs"
      />
      <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls}>
        <option value="NONE">General promo (no link)</option>
        <option value="STALL">Open a stall</option>
        <option value="CATEGORY">Open a category</option>
      </select>
      {target === "STALL" ? (
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
          <option value="">Choose stall…</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      ) : null}
      {target === "CATEGORY" ? (
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
          <option value="">Choose category…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Slide order (1 to 5)</span>
        <input type="number" min={1} max={5} value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls} />
      </label>
      <button
        onClick={publish}
        disabled={busy}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Publish banner"}
      </button>

      <p className="pt-2 text-sm font-bold">Active banners</p>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">No banners yet. The home screen hides the banner space.</p> : null}
      <div className="grid gap-2">
        {rows.map((b) => (
          <div key={b.id} className="overflow-hidden rounded-xl border border-border">
            <img src={b.image_url} alt="Banner" className="aspect-[3/1] w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                #{b.priority} · {b.target_type === "NONE" ? "No link" : b.target_type === "STALL" ? "Stall" : "Category"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(b)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold ${b.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                >
                  {b.is_active ? "Active" : "Inactive"}
                </button>
                <button onClick={() => remove(b)} className="rounded-full border border-destructive px-3 py-1 text-[11px] font-bold text-destructive">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const emptyCard: PromoCard = { title: "", subtitle: "", image_url: "", redirect_category_or_filter: "" };

function CampaignBuilder({ cats }: { cats: Opt[] }) {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => listCampaigns(false).then(setRows);
  useEffect(() => { load(); }, []);

  const blank = (): Campaign => ({
    id: "",
    title: "",
    is_active: false,
    theme_bg_color: "#ffe9a8",
    theme_bg_image_url: "",
    top_tab_icon_url: "",
    top_tab_label: "",
    promo_cards: [{ ...emptyCard }],
    deals_section_active: false,
  });

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Give the campaign a title."); return; }
    setBusy(true);
    const payload = {
      title: editing.title.trim(),
      is_active: editing.is_active,
      theme_bg_color: editing.theme_bg_color || null,
      theme_bg_image_url: editing.theme_bg_image_url || null,
      top_tab_icon_url: editing.top_tab_icon_url || null,
      top_tab_label: editing.top_tab_label || null,
      promo_cards: editing.promo_cards.filter((c) => c.title || c.image_url),
      deals_section_active: editing.deals_section_active,
    };
    // Only one campaign may run live at a time.
    if (editing.is_active) await supabase.from("campaigns").update({ is_active: false }).neq("id", editing.id || "00000000-0000-0000-0000-000000000000");
    const { error } = editing.id
      ? await supabase.from("campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("campaigns").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.is_active ? "Campaign is live." : "Campaign saved.");
    setEditing(null);
    load();
  }

  async function setLive(c: Campaign, live: boolean) {
    if (live) await supabase.from("campaigns").update({ is_active: false }).neq("id", c.id);
    const { error } = await supabase.from("campaigns").update({ is_active: live }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function remove(c: Campaign) {
    if (!window.confirm("Delete this campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <section className="card-soft space-y-2 border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Festive campaign builder</p>
        <button onClick={() => setEditing(blank())} className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">
          New campaign
        </button>
      </div>

      {rows.length === 0 && !editing ? (
        <p className="text-xs text-muted-foreground">No campaigns yet. The festive space stays hidden on the home screen.</p>
      ) : null}

      {rows.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{c.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {c.is_active ? "Live now" : "Archived"} · {c.promo_cards.length} card(s)
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => setEditing(c)} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold">Edit</button>
            <button
              onClick={() => setLive(c, !c.is_active)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${c.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {c.is_active ? "Archive" : "Publish live"}
            </button>
            <button onClick={() => remove(c)} className="rounded-full border border-destructive px-2.5 py-1 text-[11px] font-bold text-destructive">✕</button>
          </div>
        </div>
      ))}

      {editing ? (
        <div className="space-y-2 rounded-xl border border-primary/40 p-2">
          <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder='Campaign title e.g. "Celebrate Ganesh Chaturthi"' className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input value={editing.theme_bg_color ?? ""} onChange={(e) => setEditing({ ...editing, theme_bg_color: e.target.value })} placeholder="Background colour #ffe9a8" className={inputCls} />
            <input value={editing.theme_bg_image_url ?? ""} onChange={(e) => setEditing({ ...editing, theme_bg_image_url: e.target.value })} placeholder="Background image link" className={inputCls} />
            <input value={editing.top_tab_label ?? ""} onChange={(e) => setEditing({ ...editing, top_tab_label: e.target.value })} placeholder="Top tab label e.g. Raja" className={inputCls} />
            <input value={editing.top_tab_icon_url ?? ""} onChange={(e) => setEditing({ ...editing, top_tab_icon_url: e.target.value })} placeholder="Top tab icon link" className={inputCls} />
          </div>

          <p className="pt-1 text-[11px] font-bold text-muted-foreground">Promo cards</p>
          {editing.promo_cards.map((card, n) => (
            <div key={n} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2">
              <input value={card.title} onChange={(e) => setEditing({ ...editing, promo_cards: editing.promo_cards.map((x, i) => (i === n ? { ...x, title: e.target.value } : x)) })} placeholder="Card title" className={inputCls} />
              <input value={card.subtitle} onChange={(e) => setEditing({ ...editing, promo_cards: editing.promo_cards.map((x, i) => (i === n ? { ...x, subtitle: e.target.value } : x)) })} placeholder="Subtitle" className={inputCls} />
              <input value={card.image_url} onChange={(e) => setEditing({ ...editing, promo_cards: editing.promo_cards.map((x, i) => (i === n ? { ...x, image_url: e.target.value } : x)) })} placeholder="Image link" className={inputCls} />
              <select
                value={card.redirect_category_or_filter}
                onChange={(e) => setEditing({ ...editing, promo_cards: editing.promo_cards.map((x, i) => (i === n ? { ...x, redirect_category_or_filter: e.target.value } : x)) })}
                className={inputCls}
              >
                <option value="">No filter</option>
                {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          ))}
          <button
            onClick={() => setEditing({ ...editing, promo_cards: [...editing.promo_cards, { ...emptyCard }] })}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground"
          >
            + Add card
          </button>

          <div className="grid gap-2">
            <button
              onClick={() => setEditing({ ...editing, deals_section_active: !editing.deals_section_active })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${editing.deals_section_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              Deals row {editing.deals_section_active ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${editing.is_active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {editing.is_active ? "Will publish live" : "Keep archived"}
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? "Saving…" : "Save campaign"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground">Cancel</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
