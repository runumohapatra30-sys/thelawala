import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";

type Campaign = { id: string; title: string; allowed_prices: number[] };
type MenuItem = { id: string; name: string; price: number; in_stock: boolean };
type OptIn = { id: string; menu_item_id: string; offer_price: number };

export function VendorCampaignOptIn({ vendorId, items }: { vendorId: string; items: MenuItem[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [optedIn, setOptedIn] = useState<OptIn[]>([]);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const campaign = campaigns.find((entry) => entry.id === campaignId);

  const loadOptIns = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("commerce_campaign_items")
        .select("id,menu_item_id,offer_price")
        .eq("campaign_id", id)
        .eq("vendor_id", vendorId)
        .eq("source", "vendor");
      if (error) {
        console.error("Could not load vendor campaign choices:", error);
        toast.error(`Could not load campaign choices: ${error.message}`);
        return;
      }
      const rows = (data ?? []) as OptIn[];
      setOptedIn(rows);
      setSelection(
        Object.fromEntries(rows.map((row) => [row.menu_item_id, Number(row.offer_price)])),
      );
    },
    [vendorId],
  );

  useEffect(() => {
    let alive = true;
    void supabase
      .from("commerce_campaigns")
      .select("id,title,allowed_prices")
      .eq("is_active", true)
      .order("title")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Could not load vendor campaigns:", error);
          toast.error(`Could not load campaigns: ${error.message}`);
        } else {
          const rows = (data ?? []) as Campaign[];
          setCampaigns(rows);
          setCampaignId(rows[0]?.id ?? "");
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (campaignId) void loadOptIns(campaignId);
  }, [campaignId, loadOptIns]);

  async function save() {
    if (!campaign) return;
    const available = items.filter((item) => item.in_stock);
    const selectedRows = available.filter(
      (item) =>
        Boolean(selection[item.id]) &&
        campaign.allowed_prices.some(
          (price) => price <= customerPrice(item.price) && price === selection[item.id],
        ),
    );
    if (selectedRows.some((item) => !campaign.allowed_prices.includes(selection[item.id]!))) {
      toast.error("Choose one of the campaign's available price tiers for every selected item.");
      return;
    }
    setSaving(true);
    const keepIds = selectedRows.map((item) => item.id);
    const removedIds = optedIn
      .filter((row) => !keepIds.includes(row.menu_item_id))
      .map((row) => row.id);
    if (removedIds.length) {
      const { error } = await supabase
        .from("commerce_campaign_items")
        .delete()
        .in("id", removedIds);
      if (error) {
        setSaving(false);
        toast.error(`Could not remove deselected items: ${error.message}`);
        return;
      }
    }
    if (selectedRows.length) {
      const { error } = await supabase.from("commerce_campaign_items").upsert(
        selectedRows.map((item) => ({
          campaign_id: campaign.id,
          menu_item_id: item.id,
          vendor_id: vendorId,
          offer_price: selection[item.id]!,
          source: "vendor" as const,
          is_active: true,
        })),
        { onConflict: "campaign_id,menu_item_id,source" },
      );
      if (error) {
        setSaving(false);
        toast.error(`Could not save campaign participation: ${error.message}`);
        return;
      }
    }
    await loadOptIns(campaign.id);
    setSaving(false);
    setOpen(false);
    toast.success(`Your ${campaign.title} selections have been saved.`);
  }

  if (loading || campaigns.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[#d7e9d8] bg-[linear-gradient(130deg,#f1fff3,#fff8e7)] p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#16804a] text-xs font-black text-white">
          99
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">Boost your stall with a campaign</span>
          <span className="block text-[10px] text-muted-foreground">
            {optedIn.length} menu item(s) opted in
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-[#16804a] px-3 py-2 text-[10px] font-black text-white"
        >
          {optedIn.length ? "Manage" : "Join"}
        </button>
      </div>

      {open ? (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-campaign-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-border p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#16804a] text-sm font-black text-white">
                99
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="vendor-campaign-title" className="text-base font-black">
                  Join a deal campaign?
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose approved, in-stock items and a campaign tier. Your menu price is never
                  changed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close campaign dialog"
                className="grid h-9 w-9 place-items-center rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3 p-4">
              {campaigns.length > 1 ? (
                <select
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
                >
                  {campaigns.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              ) : null}
              {campaign ? (
                <p className="rounded-xl bg-[#effaf1] p-3 text-xs font-semibold text-[#28603d]">
                  Sell selected menu items at{" "}
                  {campaign.allowed_prices.map((price) => inr(price)).join(" / ")} for boosted
                  visibility.
                </p>
              ) : null}
              <div className="max-h-[44dvh] space-y-2 overflow-y-auto pr-1">
                {items
                  .filter((item) => item.in_stock)
                  .map((item) => (
                    <CampaignMenuChoice
                      key={item.id}
                      item={item}
                      prices={campaign?.allowed_prices ?? []}
                      value={selection[item.id]}
                      onChange={(price) =>
                        setSelection((current) => {
                          if (price === null) {
                            const next = { ...current };
                            delete next[item.id];
                            return next;
                          }
                          return { ...current, [item.id]: price };
                        })
                      }
                    />
                  ))}
                {items.filter((item) => item.in_stock).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                    Add an approved, in-stock item to your menu to join this campaign.
                  </p>
                ) : null}
              </div>
            </div>
            <footer className="flex gap-2 border-t border-border p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold"
              >
                Not now
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 rounded-xl bg-[#16804a] py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? (
                  "Saving…"
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4" /> Save selection
                  </span>
                )}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function CampaignMenuChoice({
  item,
  prices,
  value,
  onChange,
}: {
  item: MenuItem;
  prices: number[];
  value?: number | undefined;
  onChange: (price: number | null) => void;
}) {
  const tiers = prices.filter((price) => price <= customerPrice(item.price));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <input
        type="checkbox"
        aria-label={`Include ${item.name}`}
        checked={Boolean(value && tiers.includes(value))}
        disabled={tiers.length === 0}
        onChange={(event) => onChange(event.target.checked ? (tiers[0] ?? null) : null)}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold">{item.name}</span>
        <span className="text-[10px] text-muted-foreground">
          {tiers.length
            ? `Menu price ${inr(Number(item.price))}`
            : "No campaign tier below this menu price"}
        </span>
      </span>
      {value && tiers.length ? (
        <select
          aria-label={`Campaign price for ${item.name}`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-black"
        >
          {tiers.map((price) => (
            <option key={price} value={price}>
              {inr(price)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
