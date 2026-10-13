import { useCallback, useEffect, useState } from "react";
import { ImagePlus, PackageCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadSectionImage } from "@/lib/homeSections";
import {
  EMPTY_SOUNDBOX_PRODUCT,
  readSoundboxProductSettings,
  updateSoundboxProductSettings,
  type SoundboxProductSettings,
} from "@/lib/soundboxProductSettings";

type HardwareOrder = {
  id: string;
  vendor_id: string;
  payment_plan: string;
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
};

type VendorInfo = {
  id: string;
  stall_name: string;
  mobile: string | null;
};

const GALLERY = [
  { key: "front_image_url", label: "Front view" },
  { key: "back_image_url", label: "Back view" },
  { key: "packaging_image_url", label: "Packaging" },
] as const;

const STATUSES = ["REQUESTED", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"];

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function AdminSoundbox() {
  const [product, setProduct] = useState<SoundboxProductSettings>(EMPTY_SOUNDBOX_PRODUCT);
  const [orders, setOrders] = useState<HardwareOrder[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorInfo>>({});
  const [loading, setLoading] = useState(true);
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [settingsResult, { data: rows, error: ordersError }] = await Promise.all([
      readSoundboxProductSettings()
        .then((data) => ({ data, error: null }))
        .catch((error: Error) => ({
          data: EMPTY_SOUNDBOX_PRODUCT,
          error,
        })),
      supabase
        .from("soundbox_hardware_orders")
        .select("id,vendor_id,payment_plan,total_amount,delivery_address,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const { data: settings, error: settingsError } = settingsResult;
    if (settingsError) toast.error(`Could not load Soundbox settings: ${settingsError.message}`);
    setProduct(settings);
    if (ordersError) {
      toast.error(`Could not load Soundbox orders: ${ordersError.message}`);
      setOrders([]);
      setVendors({});
      setLoading(false);
    }
    const orderRows = ordersError ? [] : (rows ?? []);
    setOrders(orderRows);
    const vendorIds = [...new Set(orderRows.map((order) => order.vendor_id))];
    if (vendorIds.length) {
      const { data: vendorRows, error: vendorError } = await supabase
        .from("vendors")
        .select("id,stall_name,mobile")
        .in("id", vendorIds);
      if (vendorError) toast.error(`Could not load vendor names: ${vendorError.message}`);
      else setVendors(Object.fromEntries((vendorRows ?? []).map((vendor) => [vendor.id, vendor])));
    } else {
      setVendors({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-soundbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "soundbox_hardware_orders" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function uploadImage(key: (typeof GALLERY)[number]["key"], file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Use a JPG, PNG or WebP image.");
      return;
    }
    setBusyImage(key);
    const uploaded = await uploadSectionImage(file);
    if ("error" in uploaded) {
      setBusyImage(null);
      toast.error(uploaded.error);
      return;
    }
    const update =
      key === "front_image_url"
        ? { front_image_url: uploaded.url }
        : key === "back_image_url"
          ? { back_image_url: uploaded.url }
          : { packaging_image_url: uploaded.url };
    try {
      await updateSoundboxProductSettings(update);
    } catch (error) {
      setBusyImage(null);
      toast.error(
        `Image uploaded but could not be published: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }
    setBusyImage(null);
    setProduct((previous) => ({ ...previous, [key]: uploaded.url }));
    toast.success("Soundbox gallery updated.");
  }

  async function updateStock(isInStock: boolean) {
    setSavingStock(true);
    try {
      await updateSoundboxProductSettings({ is_in_stock: isInStock });
    } catch (error) {
      setSavingStock(false);
      toast.error(
        `Could not update stock: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return;
    }
    setSavingStock(false);
    setProduct((previous) => ({ ...previous, is_in_stock: isInStock }));
    toast.success(isInStock ? "Soundbox is now in stock." : "Soundbox marked out of stock.");
  }

  async function updateOrderStatus(order: HardwareOrder, status: string) {
    setSavingOrder(order.id);
    const { error } = await supabase
      .from("soundbox_hardware_orders")
      .update({ status })
      .eq("id", order.id);
    setSavingOrder(null);
    if (error) {
      toast.error(`Could not update the order: ${error.message}`);
      return;
    }
    setOrders((previous) =>
      previous.map((item) => (item.id === order.id ? { ...item, status } : item)),
    );
    toast.success("Soundbox order status updated.");
  }

  return (
    <div className="space-y-4">
      <section className="card-soft space-y-3 border border-border p-4">
        <div>
          <h2 className="text-base font-black">Soundbox product</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage vendor-facing product photos and live stock availability.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
          <div>
            <p className="text-sm font-bold">Live stock status</p>
            <p
              className={`mt-0.5 text-xs font-black ${product.is_in_stock ? "text-emerald-600" : "text-destructive"}`}
            >
              {product.is_in_stock ? "In Stock" : "Out of Stock"}
            </p>
          </div>
          <button
            type="button"
            disabled={savingStock}
            onClick={() => void updateStock(!product.is_in_stock)}
            className={`rounded-xl px-3 py-2 text-xs font-black text-white disabled:opacity-50 ${product.is_in_stock ? "bg-destructive" : "bg-emerald-600"}`}
          >
            {savingStock ? "Saving…" : product.is_in_stock ? "Mark out of stock" : "Mark in stock"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {GALLERY.map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-border p-3">
              <div className="grid h-28 place-items-center overflow-hidden rounded-xl bg-muted/50">
                {product[key] ? (
                  <img
                    src={product[key] ?? undefined}
                    alt={`Soundbox ${label}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2 text-xs font-bold">{label}</p>
              <label className="mt-2 block cursor-pointer rounded-xl bg-primary px-3 py-2 text-center text-xs font-black text-primary-foreground">
                {busyImage === key ? "Uploading…" : product[key] ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busyImage !== null}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(key, file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="card-soft space-y-3 border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black">Soundbox order requests</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirm, dispatch and track merchant hardware orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh Soundbox orders"
            className="rounded-full border border-border p-2 text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading orders…</p>
        ) : null}
        {!loading && orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <PackageCheck className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold">No Soundbox orders yet</p>
          </div>
        ) : null}
        {orders.map((order) => {
          const vendor = vendors[order.vendor_id];
          return (
            <article key={order.id} className="space-y-3 rounded-2xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black">
                    {vendor?.stall_name ?? "Vendor"}
                    {vendor?.mobile ? ` · ${vendor.mobile}` : ""}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Order {order.id.slice(0, 8)} ·{" "}
                    {new Date(order.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-[#FF5200]">
                  {money(Number(order.total_amount))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {order.payment_plan === "ONE_TIME"
                  ? "One-time purchase · full payment"
                  : "Split Pay · 10 daily instalments"}{" "}
                · Delivery: {order.delivery_address}
              </p>
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1.5 text-[10px] font-black">
                  {order.status.replaceAll("_", " ")}
                </span>
                <select
                  aria-label={`Update order status for ${vendor?.stall_name ?? "vendor"}`}
                  value={order.status}
                  disabled={savingOrder === order.id}
                  onChange={(event) => void updateOrderStatus(order, event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
