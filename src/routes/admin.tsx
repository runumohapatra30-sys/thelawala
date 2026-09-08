import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, GreenButton, PortalHeader, Shell } from "@/components/Shell";
import { ZONES } from "@/lib/geo";
import { STATUS_LABEL, actions, inr, useApp } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Thaleewala" },
      { name: "description", content: "Approve stalls and riders, watch orders, ledger and promotions." },
      { property: "og:title", content: "Administration — Thaleewala" },
      { property: "og:description", content: "Thaleewala control centre for zones, KYC, ledger and banners." },
    ],
  }),
  component: Admin,
});

const TABS = ["Overview", "KYC", "Orders", "Promos", "Audit"] as const;

function Admin() {
  const adminEmail = useApp((s) => s.adminEmail);
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const vendors = useApp((s) => s.vendors);
  const riders = useApp((s) => s.riders);
  const orders = useApp((s) => s.orders);
  const banners = useApp((s) => s.banners);
  const audit = useApp((s) => s.audit);

  if (!adminEmail) {
    return (
      <Shell>
        <PortalHeader title="Administration" subtitle="Authorised staff only" />
        <form
          className="space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            actions.signInAdmin(email);
          }}
        >
          <Field
            label="Admin email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="runumohapatra808@gmail.com"
          />
          <GreenButton type="submit">CONTINUE</GreenButton>
          <p className="text-[11px] text-muted-foreground">
            Roles are checked on the server before any approval or payout action.
          </p>
        </form>
      </Shell>
    );
  }

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const gmv = orders.reduce((s, o) => s + o.bill.grand, 0);
  const charity = orders.reduce((s, o) => s + o.bill.charity, 0);

  return (
    <Shell>
      <PortalHeader title="Administration" subtitle={adminEmail} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto p-4 pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3 p-4">
        {tab === "Overview" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card label="Orders" value={String(orders.length)} />
              <Card label="Delivered" value={String(delivered.length)} />
              <Card label="GMV" value={inr(Math.round(gmv))} />
              <Card label="Platform profit" value={inr(delivered.length * 7.5)} />
              <Card label="Charity pool" value={inr(Math.round(charity))} />
              <Card label="Active zones" value={String(ZONES.length)} />
            </div>
            <div className="card-soft border border-border p-3">
              <p className="text-sm font-bold">Delivery zones</p>
              {ZONES.map((z) => (
                <p key={z.id} className="mt-1 text-xs text-muted-foreground">
                  {z.name} · polygon geofence active · ETA 15 min
                </p>
              ))}
            </div>
          </>
        ) : null}

        {tab === "KYC" ? (
          <>
            <p className="text-sm font-bold">Stalls</p>
            {vendors.map((v) => (
              <div key={v.id} className="card-soft border border-border p-3">
                <p className="text-sm font-semibold">{v.stallName}</p>
                <p className="text-xs text-muted-foreground">
                  {v.ownerName} · {v.mobile} · {v.status}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => actions.setVendorStatus(v.id, "APPROVED")}
                    className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => actions.setVendorStatus(v.id, "REJECTED")}
                    className="flex-1 rounded-xl border border-destructive py-2 text-xs font-bold text-destructive"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            ))}
            <p className="pt-2 text-sm font-bold">Riders</p>
            {riders.map((r) => (
              <div key={r.id} className="card-soft border border-border p-3">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.mobile} · {r.status} · {r.onDuty ? "on duty" : "off duty"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => actions.setRiderStatus(r.id, "APPROVED")}
                    className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => actions.setRiderStatus(r.id, "REJECTED")}
                    className="flex-1 rounded-xl border border-destructive py-2 text-xs font-bold text-destructive"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {tab === "Orders" ? (
          orders.length ? (
            orders.map((o) => (
              <div key={o.id} className="card-soft border border-border p-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>#{o.id}</span>
                  <span className="text-primary">{STATUS_LABEL[o.status]}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ZONES.find((z) => z.id === o.zoneId)?.name} · {o.payment} · {inr(o.bill.grand)}
                </p>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
          )
        ) : null}

        {tab === "Promos" ? <Promos banners={banners} /> : null}

        {tab === "Audit" ? (
          <div className="card-soft border border-border p-3 text-xs">
            {audit.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : null}
            {audit.map((a) => (
              <p key={a.id} className="border-b border-border py-1.5 last:border-0">
                <span className="font-semibold">{a.type}</span>{" "}
                <span className="text-muted-foreground">
                  {a.orderId ? `#${a.orderId} · ` : ""}
                  {new Date(a.at).toLocaleTimeString("en-IN")}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft border border-border p-3">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Promos({ banners }: { banners: { id: string; title: string; subtitle: string; code?: string; percent?: number }[] }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<{ title: string; subtitle: string; code?: string; percent?: number } | null>(null);

  function parse(input: string) {
    const percent = Number(input.match(/(\d{1,2})\s*%/)?.[1] ?? 0) || undefined;
    const code = input.match(/\b([A-Z]{3,}\d{0,3})\b/)?.[1];
    const title = /evening/i.test(input) ? "Evening snacks fest" : "Thaleewala special offer";
    setDraft({
      title,
      subtitle: percent ? `Flat ${percent}% off with ${code ?? "code"}` : "Limited time offer",
      ...(code ? { code } : {}),
      ...(percent ? { percent } : {}),
    });
  }

  return (
    <>
      <div className="card-soft border border-border p-3">
        <p className="text-sm font-bold">AI promo assistant</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder='Create a 20% discount coupon FEST20 and banner for evening snacks'
          className="mt-2 w-full rounded-xl border border-border p-2.5 text-sm outline-none focus:border-primary"
        />
        <GreenButton className="mt-2" onClick={() => parse(text)}>
          GENERATE DRAFT
        </GreenButton>
        {draft ? (
          <div className="mt-3 rounded-xl bg-muted p-3">
            <p className="text-sm font-bold">{draft.title}</p>
            <p className="text-xs text-muted-foreground">{draft.subtitle}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  actions.addBanner({ id: `b${Date.now()}`, ...draft });
                  setDraft(null);
                  setText("");
                }}
                className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
              >
                CONFIRM & PUBLISH
              </button>
              <button onClick={() => setDraft(null)} className="flex-1 rounded-xl border border-border py-2 text-xs font-bold">
                DISCARD
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {banners.map((b) => (
        <div key={b.id} className="card-soft border border-border p-3">
          <p className="text-sm font-semibold">{b.title}</p>
          <p className="text-xs text-muted-foreground">
            {b.subtitle} {b.code ? `· ${b.code}` : ""}
          </p>
        </div>
      ))}
    </>
  );
}
