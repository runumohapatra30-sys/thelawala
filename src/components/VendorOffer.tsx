import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PRESETS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

/** Stall-run offer. A discount is applied to a customer's bill only when this is above 0. */
export function VendorOffer({ vendorId }: { vendorId: string }) {
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("vendors")
      .select("offer_percent,offer_label")
      .eq("id", vendorId)
      .maybeSingle()
      .then(({ data }) => {
        setPct(Number(data?.offer_percent ?? 0));
        setLabel(data?.offer_label ?? "");
      });
  }, [vendorId]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({ offer_percent: pct, offer_label: label.trim() || null })
      .eq("id", vendorId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(pct > 0 ? `${pct}% offer is live on your stall` : "Offer switched off");
  }

  return (
    <div className="portal-panel mt-3">
      <p className="text-sm font-bold">Stall offer</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Customers get a discount only when you run an offer. Keep it at 0% for normal pricing.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setPct(p)}
            className={`press rounded-full border px-3 py-1.5 text-[11px] font-black ${
              pct === p ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {p === 0 ? "No offer" : `${p}%`}
          </button>
        ))}
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value.slice(0, 40))}
        placeholder="Offer name (e.g. Festive special)"
        className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={save}
        disabled={saving}
        className="press mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save offer"}
      </button>
    </div>
  );
}
