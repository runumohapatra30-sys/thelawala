import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, GreenButton, PortalHeader, Shell } from "@/components/Shell";
import { ZONES } from "@/lib/geo";
import { STATUS_LABEL, actions, inr, useApp } from "@/lib/store";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Stall partner portal — Thaleewala" },
      { name: "description", content: "Accept orders, prepare, pack and share the pickup OTP with riders." },
      { property: "og:title", content: "Stall partner portal — Thaleewala" },
      { property: "og:description", content: "Register your Bhubaneswar street stall and run live orders." },
    ],
  }),
  component: VendorPortal,
});

function VendorPortal() {
  const vendors = useApp((s) => s.vendors);
  const orders = useApp((s) => s.orders);
  const [tab, setTab] = useState<"orders" | "register">("orders");
  const me = vendors[vendors.length - 1];
  const live = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");

  return (
    <Shell>
      <PortalHeader title="Partner with Us" subtitle="Thaleewala stall portal" />
      <div className="flex gap-2 p-4 pb-0">
        {(["orders", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "orders" ? "Live orders" : "Register stall"}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <div className="space-y-3 p-4">
          {live.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No live orders right now.</p>
          ) : null}
          {live.map((o) => (
            <div key={o.id} className="card-soft border border-border p-3">
              <div className="flex justify-between">
                <p className="text-sm font-bold">#{o.id}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-primary">
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground">
                {o.lines.map((l) => (
                  <li key={l.productId}>
                    {l.qty} × {l.name}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">
                {ZONES.find((z) => z.id === o.zoneId)?.name} · {inr(o.bill.grand)}
              </p>

              {o.status === "PLACED" ? (
                <GreenButton className="mt-3" onClick={() => actions.advance(o.id, "VENDOR_ACCEPTED")}>
                  ACCEPT ORDER
                </GreenButton>
              ) : null}
              {o.status === "VENDOR_ACCEPTED" ? (
                <GreenButton className="mt-3" onClick={() => actions.advance(o.id, "PREPARING")}>
                  START PREPARING
                </GreenButton>
              ) : null}
              {o.status === "PREPARING" ? (
                <GreenButton className="mt-3" onClick={() => actions.advance(o.id, "PACKED")}>
                  PACKED · READY FOR PICKUP
                </GreenButton>
              ) : null}
              {o.status === "PACKED" ? (
                <div className="mt-3 rounded-xl bg-muted p-3 text-center">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground">PICKUP OTP</p>
                  <p className="text-2xl font-extrabold tracking-[0.3em] text-primary">{o.pickupOtp}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Share only with the assigned delivery partner.
                  </p>
                </div>
              ) : null}
              {o.status === "PICKED_UP" || o.status === "OUT_FOR_DELIVERY" ? (
                <p className="mt-3 text-xs font-semibold text-primary">Pickup verified · rider on the way</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <RegisterStall lastStatus={me?.status} />
      )}
    </Shell>
  );
}

function RegisterStall({ lastStatus }: { lastStatus: string | undefined }) {
  const [form, setForm] = useState({
    stallName: "",
    ownerName: "",
    mobile: "",
    pan: "",
    accountNo: "",
    ifsc: "",
    fssai: "",
    zoneId: "dumduma",
  });
  const [done, setDone] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (done) {
    return (
      <div className="p-4">
        <div className="card-soft border border-border p-4 text-center">
          <p className="text-sm font-bold text-primary">Application submitted</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status: PENDING_APPROVAL. Thaleewala admin will verify your KYC and approve your stall.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const zone = ZONES.find((z) => z.id === form.zoneId)!;
        actions.addVendor({
          id: `v${Date.now().toString().slice(-5)}`,
          stallName: form.stallName,
          ownerName: form.ownerName,
          mobile: form.mobile,
          zoneId: form.zoneId,
          location: zone.center,
          status: "PENDING_APPROVAL",
          fssai: form.fssai,
          pan: form.pan,
          accountNo: form.accountNo,
          ifsc: form.ifsc,
        });
        setDone(true);
      }}
    >
      <Field label="Stall name" required value={form.stallName} onChange={upd("stallName")} />
      <Field label="Owner name" required value={form.ownerName} onChange={upd("ownerName")} />
      <Field label="Mobile" required inputMode="numeric" maxLength={10} value={form.mobile} onChange={upd("mobile")} />
      <Field label="FSSAI licence" value={form.fssai} onChange={upd("fssai")} />
      <Field label="PAN" value={form.pan} onChange={upd("pan")} />
      <Field label="Bank account number" value={form.accountNo} onChange={upd("accountNo")} />
      <Field label="IFSC" value={form.ifsc} onChange={upd("ifsc")} />
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">Delivery zone</span>
        <select
          value={form.zoneId}
          onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-muted-foreground">
        Documents stay private and are visible only to Thaleewala admin.
      </p>
      <GreenButton type="submit">SUBMIT FOR APPROVAL</GreenButton>
      {lastStatus ? <p className="text-center text-[11px] text-muted-foreground">Last application: {lastStatus}</p> : null}
    </form>
  );
}
