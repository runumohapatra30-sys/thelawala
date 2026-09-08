import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LiveMap } from "@/components/LiveMap";
import { Field, GreenButton, PortalHeader, Shell } from "@/components/Shell";
import { VENDORS } from "@/lib/data";
import { STATUS_LABEL, actions, inr, useApp } from "@/lib/store";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "Deliver with Thaleewala — rider portal" },
      { name: "description", content: "Go on duty, verify pickup OTP, navigate and complete deliveries with photo proof." },
      { property: "og:title", content: "Deliver with Thaleewala" },
      { property: "og:description", content: "Rider dashboard with earnings, live navigation and OTP verification." },
    ],
  }),
  component: RiderPortal,
});

function RiderPortal() {
  const riders = useApp((s) => s.riders);
  const orders = useApp((s) => s.orders);
  const [tab, setTab] = useState<"duty" | "register">("duty");
  const rider = riders.find((r) => r.status === "APPROVED") ?? riders[0]!;
  const active = orders.find(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED" && o.status !== "PLACED",
  );
  const doneToday = orders.filter((o) => o.status === "DELIVERED");
  const earnings = doneToday.length * 38 + doneToday.length * 12;

  return (
    <Shell>
      <PortalHeader title="Deliver with Thaleewala" subtitle={rider.name} />
      <div className="flex gap-2 p-4 pb-0">
        {(["duty", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "duty" ? "Dashboard" : "Join as rider"}
          </button>
        ))}
      </div>

      {tab === "register" ? (
        <RegisterRider />
      ) : (
        <div className="space-y-3 p-4">
          <div className="card-soft grid grid-cols-3 gap-2 border border-border p-3 text-center">
            <Stat label="Earnings" value={inr(earnings)} />
            <Stat label="Trips" value={String(doneToday.length)} />
            <Stat label="Rating" value="4.9" />
          </div>

          <div className="card-soft flex items-center justify-between border border-border p-3">
            <div>
              <p className="text-sm font-bold">{rider.onDuty ? "ON DUTY" : "OFF DUTY"}</p>
              <p className="text-xs text-muted-foreground">
                {rider.onDuty ? "Location shared for active trips only" : "You will not receive orders"}
              </p>
            </div>
            <button
              onClick={() => actions.toggleDuty(rider.id)}
              className={`h-7 w-12 rounded-full p-1 transition ${rider.onDuty ? "bg-primary" : "bg-muted"}`}
              aria-label="Toggle duty"
            >
              <span
                className={`block h-5 w-5 rounded-full bg-card transition ${rider.onDuty ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          <div className="card-soft border border-border p-3 text-xs">
            <p className="text-sm font-bold">Earnings breakdown</p>
            <p className="mt-1 text-muted-foreground">Base ₹25 · Distance ₹8/km · Peak bonus ₹12 · Tips 100% yours</p>
          </div>

          {active ? (
            <ActiveTrip order={active} onDuty={rider.onDuty} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No trip assigned. Waiting for the stall to accept an order.
            </p>
          )}

          <a
            href="tel:112"
            className="block rounded-xl border border-destructive py-3 text-center text-sm font-bold text-destructive"
          >
            SOS · Emergency & support
          </a>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ActiveTrip({ order, onDuty }: { order: Order; onDuty: boolean }) {
  const vendor = VENDORS.find((v) => v.id === order.vendorId)!;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(Boolean(order.riderId));
  const [timer, setTimer] = useState(45);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (accepted) return;
    const t = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [accepted]);

  if (!onDuty) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Go ON DUTY to see your trip.</p>;
  }

  if (!accepted) {
    return (
      <div className="card-soft border border-border p-3">
        <p className="text-sm font-bold">New trip · #{order.id}</p>
        <p className="text-xs text-muted-foreground">{vendor.stallName} → {order.address}</p>
        <p className="mt-1 text-xs font-bold text-destructive">Respond in {timer}s</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              actions.assignRider(order.id, "r1");
              setAccepted(true);
            }}
            disabled={timer === 0}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            ACCEPT
          </button>
          <button className="flex-1 rounded-xl border border-border py-3 text-sm font-bold">REJECT</button>
        </div>
      </div>
    );
  }

  const toStall = order.status === "PACKED" || order.status === "VENDOR_ACCEPTED" || order.status === "PREPARING";

  return (
    <div className="card-soft space-y-3 border border-border p-3">
      <div className="flex justify-between">
        <p className="text-sm font-bold">#{order.id}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-primary">
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <LiveMap
        from={toStall ? { lat: vendor.location.lat - 0.006, lng: vendor.location.lng - 0.004 } : vendor.location}
        to={toStall ? vendor.location : order.drop}
        fromKind={toStall ? "rider" : "stall"}
        className="h-48 w-full overflow-hidden rounded-2xl"
      />

      {toStall ? (
        <>
          <p className="text-xs text-muted-foreground">Step 1 · Ride to {vendor.stallName}</p>
          {!order.arrivedAtStall ? (
            <GreenButton onClick={() => actions.markArrived(order.id, "stall")}>ARRIVED AT STALL</GreenButton>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Enter pickup OTP from the stall
              </label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-primary"
              />
              <GreenButton
                className="mt-2"
                onClick={() => {
                  const res = actions.verifyPickup(order.id, otp);
                  setError(res.ok ? null : (res.error ?? "Verification failed"));
                  if (res.ok) setOtp("");
                }}
              >
                VERIFY PICKUP
              </GreenButton>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Step 2 · Deliver to {order.address}</p>
          {!order.arrivedAtDrop ? (
            <GreenButton onClick={() => actions.markArrived(order.id, "drop")}>ARRIVED AT CUSTOMER</GreenButton>
          ) : (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setPhoto(String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-border py-3 text-sm font-bold"
              >
                {photo ? "RETAKE HANDOVER PHOTO" : "CAPTURE HANDOVER PHOTO"}
              </button>
              {photo ? <img src={photo} alt="Handover proof" className="w-full rounded-xl" /> : null}
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                maxLength={4}
                placeholder="Delivery OTP"
                className="w-full rounded-xl border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-primary"
              />
              <GreenButton
                onClick={() => {
                  const res = actions.verifyDelivery(order.id, otp, photo);
                  setError(res.ok ? null : (res.error ?? "Verification failed"));
                }}
              >
                COMPLETE DELIVERY
              </GreenButton>
              <a href="tel:9078492360" className="block py-1 text-center text-xs font-semibold text-primary">
                Customer not available? Call now
              </a>
            </div>
          )}
        </>
      )}

      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}

function RegisterRider() {
  const [form, setForm] = useState({ name: "", mobile: "", dl: "", pan: "", accountNo: "", ifsc: "" });
  const [done, setDone] = useState(false);
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  if (done) {
    return (
      <div className="p-4">
        <div className="card-soft border border-border p-4 text-center">
          <p className="text-sm font-bold text-primary">Application submitted</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status: PENDING_APPROVAL. You can go on duty once admin approves your KYC.
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
        actions.addRider({
          id: `r${Date.now().toString().slice(-5)}`,
          name: form.name,
          mobile: form.mobile,
          dl: form.dl,
          pan: form.pan,
          accountNo: form.accountNo,
          ifsc: form.ifsc,
          status: "PENDING_APPROVAL",
          onDuty: false,
        });
        setDone(true);
      }}
    >
      <Field label="Full name" required value={form.name} onChange={upd("name")} />
      <Field label="Mobile" required inputMode="numeric" maxLength={10} value={form.mobile} onChange={upd("mobile")} />
      <Field label="Driving licence" value={form.dl} onChange={upd("dl")} />
      <Field label="PAN" value={form.pan} onChange={upd("pan")} />
      <Field label="Bank account number" value={form.accountNo} onChange={upd("accountNo")} />
      <Field label="IFSC" value={form.ifsc} onChange={upd("ifsc")} />
      <GreenButton type="submit">SUBMIT FOR APPROVAL</GreenButton>
    </form>
  );
}
