import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Kind = "VENDOR" | "PARTNER";

type Doc = { label: string; value: string | null };

/** Turns a stored KYC path into a viewable link (already-public links pass through). */
async function viewUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  for (const bucket of ["kyc-docs", "dish-photos", "banners"]) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(value, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}

export function AdminApprovals() {
  const [vendors, setVendors] = useState<Record<string, unknown>[]>([]);
  const [riders, setRiders] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState<{ kind: Kind; row: Record<string, unknown> } | null>(null);

  const load = async () => {
    const [{ data: v }, { data: r }] = await Promise.all([
      supabase.from("vendors").select("*").order("created_at", { ascending: false }),
      supabase.from("delivery_partners").select("*").order("created_at", { ascending: false }),
    ]);
    setVendors((v ?? []) as Record<string, unknown>[]);
    setRiders((r ?? []) as Record<string, unknown>[]);
  };
  useEffect(() => { void load(); }, []);

  async function decide(kind: Kind, id: string, status: string, reason?: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "REJECTED") patch['rejection_reason'] = reason ?? null;
    const { error } = kind === "VENDOR"
      ? await supabase.from("vendors").update(patch).eq("id", id)
      : await supabase.from("delivery_partners").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "APPROVED" ? "Partner approved." : "Application rejected.");
    setOpen(null);
    void load();
  }

  const card = (kind: Kind, row: Record<string, unknown>) => {
    const title = String(kind === "VENDOR" ? row['stall_name'] : row['name']);
    const status = String(row['status'] ?? "PENDING");
    return (
      <button
        key={String(row['id'])}
        onClick={() => setOpen({ kind, row })}
        className="press mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border p-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {String(row['mobile'] ?? "No phone")} · tap to check papers
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
            status === "APPROVED" ? "bg-primary/10 text-primary"
            : status === "REJECTED" ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
          }`}
        >
          {status}
        </span>
      </button>
    );
  };

  return (
    <>
      <section className="card-soft border border-border p-3">
        <p className="text-sm font-bold">Stall approvals</p>
        {vendors.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No applications yet.</p> : null}
        {vendors.map((v) => card("VENDOR", v))}
      </section>

      <section className="card-soft border border-border p-3">
        <p className="text-sm font-bold">Delivery partner approvals</p>
        {riders.filter((r) => r['status'] === "UNDER_REVIEW").length > 0 ? (
          <p className="mt-1 rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-bold text-destructive">
            {riders.filter((r) => r['status'] === "UNDER_REVIEW").length} partner(s) changed their driving licence and are off duty until you approve.
          </p>
        ) : null}
        {riders.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No applications yet.</p> : null}
        {riders.map((r) => card("PARTNER", r))}
      </section>

      {open ? <DetailDrawer kind={open.kind} row={open.row} onClose={() => setOpen(null)} onDecide={decide} /> : null}
    </>
  );
}

function DetailDrawer({
  kind, row, onClose, onDecide,
}: {
  kind: Kind;
  row: Record<string, unknown>;
  onClose: () => void;
  onDecide: (kind: Kind, id: string, status: string, reason?: string) => Promise<void>;
}) {
  const [urls, setUrls] = useState<{ label: string; url: string }[]>([]);
  const [zoom, setZoom] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const str = (k: string) => {
    const v = row[k];
    return v === null || v === undefined || v === "" ? null : String(v);
  };

  useEffect(() => {
    let alive = true;
    const docs: Doc[] =
      kind === "PARTNER"
        ? [
            { label: "Photo", value: str("profile_photo_url") },
            { label: "Driving licence", value: str("dl_document_url") },
            { label: "PAN card", value: str("pan_card_url") },
            { label: "Identity proof", value: str("identity_document_url") },
            { label: "Bank passbook / UPI", value: str("bank_proof_url") },
          ]
        : [
            { label: "Stall photo", value: str("photo_url") },
            { label: "FSSAI / trade licence", value: str("fssai_certificate_url") },
            { label: "Identity proof", value: str("id_document_url") },
            { label: "Bank passbook / UPI", value: str("bank_proof_url") },
          ];
    (async () => {
      const extra =
        kind === "VENDOR"
          ? ((row['stall_photos'] as string[] | null) ?? []).map((p, i) => ({ label: `Stall photo ${i + 1}`, value: p }))
          : [];
      const all = [...docs, ...extra].filter((d) => d.value);
      const resolved = await Promise.all(all.map(async (d) => ({ label: d.label, url: (await viewUrl(d.value)) ?? "" })));
      if (alive) setUrls(resolved.filter((d) => d.url));
    })();
    return () => { alive = false; };
  }, [String(row['id'])]);

  const facts: [string, string | null][] =
    kind === "PARTNER"
      ? [
          ["Full name", str("name")],
          ["Phone", str("mobile")],
          ["Emergency phone", str("emergency_phone")],
          ["Address", str("address")],
          ["Vehicle", [str("vehicle_type"), str("vehicle_no")].filter(Boolean).join(" · ") || null],
          ["Driving licence", str("dl_number")],
          ["PAN", str("pan_number")],
          ["ID proof", [str("identity_proof_type"), str("identity_number")].filter(Boolean).join(" · ") || null],
          ["Zones", ((row['assigned_zones'] as string[] | null) ?? []).join(", ") || null],
          ["Bank", [str("bank_holder"), str("bank_name"), str("bank_account_no"), str("bank_ifsc")].filter(Boolean).join(" · ") || null],
          ["UPI", str("upi_id")],
        ]
      : [
          ["Stall name", str("stall_name")],
          ["Owner", str("owner_name")],
          ["Phone", str("mobile")],
          ["Address", str("address")],
          ["Zone", str("zone")],
          ["FSSAI", str("fssai_number")],
          ["PAN", str("pan_number")],
          ["ID proof", [str("identity_proof_type"), str("identity_number")].filter(Boolean).join(" · ") || null],
          ["Cuisines", ((row['cuisine_types'] as string[] | null) ?? []).join(", ") || null],
          ["Bank", [str("bank_holder"), str("bank_name"), str("bank_account_no"), str("bank_ifsc")].filter(Boolean).join(" · ") || null],
          ["UPI", str("upi_id")],
        ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-[480px] flex-col bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black">{kind === "VENDOR" ? str("stall_name") : str("name")}</p>
            <p className="text-[11px] text-muted-foreground">
              {kind === "VENDOR" ? "Stall application" : "Delivery partner application"} · {str("status")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-border px-3 py-1 text-xs font-bold">Close</button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <section className="card-soft border border-border p-3">
            <p className="text-sm font-bold">Details</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              {facts.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card-soft border border-border p-3">
            <p className="text-sm font-bold">Documents</p>
            {urls.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No documents uploaded.</p> : null}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {urls.map((d) => (
                <button key={d.label + d.url} onClick={() => setZoom(d.url)} className="press overflow-hidden rounded-xl border border-border text-left">
                  <img src={d.url} alt={d.label} loading="lazy" className="h-32 w-full bg-muted object-cover" />
                  <p className="px-2 py-1 text-[11px] font-bold">{d.label}</p>
                </button>
              ))}
            </div>
          </section>

          {str("rejection_reason") ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              Rejected earlier: {str("rejection_reason")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          {rejecting ? (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why are you rejecting? (kept on the application)"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          ) : null}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await onDecide(kind, String(row['id']), "APPROVED"); setBusy(false); }}
              className="press flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              Approve partner
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (!rejecting) { setRejecting(true); return; }
                setBusy(true);
                await onDecide(kind, String(row['id']), "REJECTED", reason.trim() || undefined);
                setBusy(false);
              }}
              className="press flex-1 rounded-xl bg-destructive py-3 text-sm font-black text-destructive-foreground disabled:opacity-50"
            >
              {rejecting ? "Confirm reject" : "Reject partner"}
            </button>
          </div>
        </div>
      </div>

      {zoom ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-3" onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
          <img src={zoom} alt="Document" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
