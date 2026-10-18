import { supabase } from "@/integrations/supabase/client";

export type CommerceCampaign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  allowed_prices: number[];
  is_active: boolean;
};

export type CommerceCampaignItem = {
  campaign_id: string;
  menu_item_id: string;
  vendor_id: string;
  offer_price: number;
  source: "admin" | "vendor";
};

export type CampaignMenuItem = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  photo_url: string | null;
  unit: string | null;
  price: number;
  mrp: number;
  in_stock: boolean;
  food_type: string;
};

export type CampaignVendor = {
  id: string;
  stall_name: string;
  is_open: boolean;
  status: string;
};

export type CampaignCatalogEntry = CommerceCampaignItem & {
  item: CampaignMenuItem;
  vendor: CampaignVendor;
};

export async function loadCommerceCampaign(slug: string): Promise<{
  campaign: CommerceCampaign | null;
  entries: CampaignCatalogEntry[];
}> {
  const { data: campaignData, error: campaignError } = await supabase
    .from("commerce_campaigns")
    .select("id,slug,title,description,allowed_prices,is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (campaignError) throw campaignError;
  if (!campaignData) return { campaign: null, entries: [] };

  const { data: entryData, error: entryError } = await supabase
    .from("commerce_campaign_items")
    .select("campaign_id,menu_item_id,vendor_id,offer_price,source")
    .eq("campaign_id", campaignData.id)
    .eq("is_active", true);
  if (entryError) throw entryError;
  const entries = (entryData ?? []) as CommerceCampaignItem[];
  if (entries.length === 0) return { campaign: campaignData as CommerceCampaign, entries: [] };

  const itemIds = [...new Set(entries.map((entry) => entry.menu_item_id))];
  const vendorIds = [...new Set(entries.map((entry) => entry.vendor_id))];
  const [itemsResult, vendorsResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id,vendor_id,category_id,name,photo_url,unit,price,mrp,in_stock,food_type")
      .in("id", itemIds)
      .eq("in_stock", true),
    supabase
      .from("vendors")
      .select("id,stall_name,is_open,status")
      .in("id", vendorIds)
      .eq("status", "APPROVED"),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (vendorsResult.error) throw vendorsResult.error;

  const itemMap = new Map(((itemsResult.data ?? []) as CampaignMenuItem[]).map((item) => [item.id, item]));
  const vendorMap = new Map(((vendorsResult.data ?? []) as CampaignVendor[]).map((vendor) => [vendor.id, vendor]));
  const byMenuItem = new Map<string, CampaignCatalogEntry>();
  for (const entry of entries) {
    const item = itemMap.get(entry.menu_item_id);
    const vendor = vendorMap.get(entry.vendor_id);
    if (!item || !vendor) continue;
    const previous = byMenuItem.get(entry.menu_item_id);
    if (!previous || entry.source === "admin") byMenuItem.set(entry.menu_item_id, { ...entry, item, vendor });
  }
  return {
    campaign: campaignData as CommerceCampaign,
    entries: [...byMenuItem.values()].sort((a, b) => a.offer_price - b.offer_price || a.item.name.localeCompare(b.item.name)),
  };
}
