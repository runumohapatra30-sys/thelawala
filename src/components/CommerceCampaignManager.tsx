import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { customerPrice } from "@/lib/pricing";

type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  allowed_prices: number[];
  is_active: boolean;
};
type MenuItem = {
  id: string;
  vendor_id: string;
  name: string;
  price: number;
  mrp: number;
  in_stock: boolean;
};
type Vendor = { id: string; stall_name: string; status: string };
type CampaignItem = {
  id: string;
  campaign_id: string;
  menu_item_id: string;
  vendor_id: string;
  offer_price: number;
  source: "admin" | "vendor";
  is_active: boolean;
};
type CreditSettings = {
  is_enabled: boolean;
  credit_amount: number;
  daily_delivery_threshold: number;
  rolling_delivery_threshold: number;
  rolling_window_days: number;
};

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
const blankCampaign = { title: "", slug: "", description: "", prices: "49, 89, 99" };

export function CommerceCampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignItem[]>([]);
  const [credit, setCredit] = useState<CreditSettings | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [newCampaign, setNewCampaign] = useState(blankCampaign);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const vendorMap = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);

  async function load() {
    setLoading(true);
    const [campaignResult, itemResult, vendorResult, creditResult] = await Promise.all([
      supabase
        .from("commerce_campaigns")
        .select("id,slug,title,description,allowed_prices,is_active")
        .order("title"),
      supabase.from("menu_items").select("id,vendor_id,name,price,mrp,in_stock").order("name"),
      supabase
        .from("vendors")
        .select("id,stall_name,status")
        .eq("status", "APPROVED")
        .order("stall_name"),
      supabase
        .from("promo_credit_settings")
        .select(
          "is_enabled,credit_amount,daily_delivery_threshold,rolling_delivery_threshold,rolling_window_days",
        )
        .eq("id", true)
        .maybeSingle(),
    ]);
    const error =
      campaignResult.error ?? itemResult.error ?? vendorResult.error ?? creditResult.error;
    if (error) {
      console.error("Could not load commerce campaign settings:", error);
      toast.error(`Could not load campaign settings: ${error.message}`);
      setLoading(false);
      return;
    }
    const nextCampaigns = (campaignResult.data ?? []) as Campaign[];
    setCampaigns(nextCampaigns);
    setItems((itemResult.data ?? []) as MenuItem[]);
    setVendors((vendorResult.data ?? []) as Vendor[]);
    setCredit(creditResult.data as CreditSettings | null);
    setSelectedCampaign((current) => current || nextCampaigns[0]?.id || "");
    setLoading(false);
  }

  async function loadCampaignItems(campaignId: string) {
    const { data, error } = await supabase
      .from("commerce_campaign_items")
      .select("id,campaign_id,menu_item_id,vendor_id,offer_price,source,is_active")
      .eq("campaign_id", campaignId);
    if (error) {
      console.error("Could not load curated campaign items:", error);
      toast.error(`Could not load campaign items: ${error.message}`);
      return;
    }
    setCampaignItems((data ?? []) as CampaignItem[]);
  }

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (selectedCampaign) void loadCampaignItems(selectedCampaign);
  }, [selectedCampaign]);

  async function saveCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!credit) return;
    setSaving(true);
    const { error } = await supabase.from("promo_credit_settings").update(credit).eq("id", true);
    setSaving(false);
    if (error) {
      toast.error(`Could not save free-cash settings: ${error.message}`);
      return;
    }
    toast.success("Free-cash settings saved.");
  }

  async function updateCampaign(campaign: Campaign, patch: Partial<Campaign>) {
    const { error } = await supabase.from("commerce_campaigns").update(patch).eq("id", campaign.id);
    if (error) {
      toast.error(`Could not update ${campaign.title}: ${error.message}`);
      return;
    }
    setCampaigns((current) =>
      current.map((row) => (row.id === campaign.id ? { ...row, ...patch } : row)),
    );
    if (patch.is_active) {
      const { data: approvedVendors, error: vendorError } = await supabase
        .from("vendors")
        .select("owner_id")
        .eq("status", "APPROVED")
        .not("owner_id", "is", null);
      if (vendorError) {
        console.error(
          "Campaign was enabled but vendor owners could not be loaded for notifications:",
          vendorError,
        );
        toast.error(`Campaign is live, but vendors could not be notified: ${vendorError.message}`);
        return;
      }
      const userIds = [
        ...new Set(
          (approvedVendors ?? [])
            .map((vendor) => vendor.owner_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (userIds.length) {
        const { error: notificationError } = await supabase.from("notifications").insert(
          userIds.map((userId) => ({
            user_id: userId,
            title: `Join ${campaign.title}`,
            body: `Choose approved menu items and a campaign price tier to boost your stall's visibility.`,
          })),
        );
        if (notificationError) {
          console.error(
            "Campaign was enabled but vendor opt-in notifications could not be sent:",
            notificationError,
          );
          toast.error(
            `Campaign is live, but vendor notifications failed: ${notificationError.message}`,
          );
          return;
        }
      }
    }
    toast.success(`${campaign.title} updated.`);
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = newCampaign.slug.trim().toLowerCase();
    const allowedPrices = [
      ...new Set(
        newCampaign.prices
          .split(",")
          .map((price) => Number(price.trim()))
          .filter((price) => Number.isInteger(price) && price > 0),
      ),
    ];
    if (!newCampaign.title.trim() || !/^[a-z0-9-]+$/.test(slug) || allowedPrices.length === 0) {
      toast.error(
        "Enter a campaign title, a lowercase hyphenated slug, and one or more whole-number price tiers.",
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("commerce_campaigns").insert({
      slug,
      title: newCampaign.title.trim(),
      description: newCampaign.description.trim() || null,
      allowed_prices: allowedPrices,
      is_active: false,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not create this campaign: ${error.message}`);
      return;
    }
    setNewCampaign(blankCampaign);
    await load();
    toast.success("Campaign created. Enable it to invite vendors.");
  }

  async function addCuratedItem() {
    const campaign = campaigns.find((row) => row.id === selectedCampaign);
    const item = itemMap.get(selectedItem);
    const offerPrice = Number(selectedPrice);
    if (
      !campaign ||
      !item ||
      !campaign.allowed_prices.includes(offerPrice) ||
      offerPrice > customerPrice(item.price)
    ) {
      toast.error("Choose a campaign, approved price tier and menu item.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("commerce_campaign_items").upsert(
      {
        campaign_id: campaign.id,
        menu_item_id: item.id,
        vendor_id: item.vendor_id,
        offer_price: offerPrice,
        source: "admin",
        is_active: true,
      },
      { onConflict: "campaign_id,menu_item_id,source" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Could not add the campaign item: ${error.message}`);
      return;
    }
    setSelectedItem("");
    await loadCampaignItems(campaign.id);
    toast.success("Item curated in this campaign.");
  }

  async function removeCuratedItem(row: CampaignItem) {
    const { error } = await supabase.from("commerce_campaign_items").delete().eq("id", row.id);
    if (error) {
      toast.error(`Could not remove this item: ${error.message}`);
      return;
    }
    setCampaignItems((current) => current.filter((entry) => entry.id !== row.id));
  }

  if (loading)
    return (
      <section className="card-soft p-4 text-sm text-muted-foreground">
        Loading commerce campaigns…
      </section>
    );

  return (
    <section className="card-soft space-y-5 border border-border p-4">
      <div>
        <p className="text-sm font-black">Commerce campaigns</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage automatic customer credit, flash-deal visibility and admin-curated 99 Store items.
        </p>
      </div>

      {credit ? (
        <form
          onSubmit={(event) => void saveCredit(event)}
          className="space-y-3 rounded-2xl border border-[#d9c281] bg-[#fffaf0] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">₹ free-cash loyalty offer</p>
              <p className="text-[11px] text-muted-foreground">
                No rollover; applies to food subtotal after discounts.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={credit.is_enabled}
                onChange={(event) => setCredit({ ...credit, is_enabled: event.target.checked })}
              />{" "}
              Enabled
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-muted-foreground">
              Credit amount (₹)
              <input
                type="number"
                min="1"
                step="1"
                value={credit.credit_amount}
                onChange={(event) =>
                  setCredit({ ...credit, credit_amount: Number(event.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="text-[10px] font-bold text-muted-foreground">
              Delivered today
              <input
                type="number"
                min="1"
                step="1"
                value={credit.daily_delivery_threshold}
                onChange={(event) =>
                  setCredit({ ...credit, daily_delivery_threshold: Number(event.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="text-[10px] font-bold text-muted-foreground">
              Delivered in rolling window
              <input
                type="number"
                min="1"
                step="1"
                value={credit.rolling_delivery_threshold}
                onChange={(event) =>
                  setCredit({ ...credit, rolling_delivery_threshold: Number(event.target.value) })
                }
                className={inputClass}
              />
            </label>
            <label className="text-[10px] font-bold text-muted-foreground">
              Rolling window (days)
              <input
                type="number"
                min="1"
                step="1"
                value={credit.rolling_window_days}
                onChange={(event) =>
                  setCredit({ ...credit, rolling_window_days: Number(event.target.value) })
                }
                className={inputClass}
              />
            </label>
          </div>
          <button
            disabled={saving}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save free-cash rules"}
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-destructive/30 p-3 text-xs text-destructive">
          Free-cash settings are unavailable. Apply the commerce campaigns migration.
        </p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-black">99 Store and flash deals</p>
        <form
          onSubmit={(event) => void createCampaign(event)}
          className="grid gap-2 rounded-xl border border-border p-3"
        >
          <p className="text-xs font-bold">Create a deal campaign</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={newCampaign.title}
              onChange={(event) => setNewCampaign({ ...newCampaign, title: event.target.value })}
              placeholder="Campaign name"
              className={inputClass}
            />
            <input
              required
              value={newCampaign.slug}
              onChange={(event) =>
                setNewCampaign({
                  ...newCampaign,
                  slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              placeholder="url-slug"
              className={inputClass}
            />
          </div>
          <input
            value={newCampaign.description}
            onChange={(event) =>
              setNewCampaign({ ...newCampaign, description: event.target.value })
            }
            placeholder="Customer-facing description"
            className={inputClass}
          />
          <input
            required
            value={newCampaign.prices}
            onChange={(event) => setNewCampaign({ ...newCampaign, prices: event.target.value })}
            placeholder="Price tiers (comma separated)"
            className={inputClass}
          />
          <button
            disabled={saving}
            className="rounded-xl border border-primary py-2.5 text-xs font-black text-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create campaign"}
          </button>
        </form>
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{campaign.title}</p>
              <p className="text-[10px] text-muted-foreground">
                Vendor tiers: {campaign.allowed_prices.map((price) => inr(price)).join(" · ")}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-[11px] font-bold">
              <input
                type="checkbox"
                checked={campaign.is_active}
                onChange={(event) =>
                  void updateCampaign(campaign, { is_active: event.target.checked })
                }
              />{" "}
              Live
            </label>
          </div>
        ))}
        {campaigns.length ? (
          <>
            <select
              value={selectedCampaign}
              onChange={(event) => setSelectedCampaign(event.target.value)}
              className={inputClass}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_90px_auto] gap-2">
              <select
                value={selectedItem}
                onChange={(event) => setSelectedItem(event.target.value)}
                className={inputClass}
              >
                <option value="">Choose menu item…</option>
                {items
                  .filter((item) => item.in_stock && vendorMap.has(item.vendor_id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {vendorMap.get(item.vendor_id)?.stall_name} · {item.name}
                    </option>
                  ))}
              </select>
              <select
                value={selectedPrice}
                onChange={(event) => setSelectedPrice(event.target.value)}
                className={inputClass}
              >
                <option value="">Tier</option>
                {(
                  campaigns.find((campaign) => campaign.id === selectedCampaign)?.allowed_prices ??
                  []
                ).map((price) => (
                  <option key={price} value={price}>
                    ₹{price}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={saving}
                onClick={() => void addCuratedItem()}
                className="rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {campaignItems.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {itemMap.get(row.menu_item_id)?.name ?? "Menu item"} ·{" "}
                    {vendorMap.get(row.vendor_id)?.stall_name ?? "Stall"}
                  </span>
                  <span className="text-xs font-black text-primary">₹{row.offer_price}</span>
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">
                    {row.source}
                  </span>
                  {row.source === "admin" ? (
                    <button
                      type="button"
                      aria-label="Remove curated item"
                      onClick={() => void removeCuratedItem(row)}
                      className="px-1 text-sm font-black text-destructive"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              {campaignItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No vendor opt-ins or admin picks yet.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
