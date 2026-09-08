import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your account — ThelaWala" },
      { name: "description", content: "Your ThelaWala profile, wallet balance, saved addresses and support options." },
      { property: "og:title", content: "Your account — ThelaWala" },
      { property: "og:description", content: "Wallet, addresses and help in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [balance, setBalance] = useState(0);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,mobile").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name ?? "");
      setMobile(data?.mobile ?? "");
    });
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(Number(data?.balance ?? 0));
    });
  }, [user?.id]);

  if (!loading && !user) {
    return (
      <Shell>
        <header className="brand-header px-4 pb-6 pt-5">
          <h1 className="text-xl font-black">Your account</h1>
        </header>
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to see your account.</p>
          <Link to="/auth" className="press mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="brand-header px-4 pb-8 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-card text-xl font-black">
            {(name || user?.email || "T").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{name || "ThelaWala customer"}</p>
            <p className="truncate text-xs font-semibold opacity-80">{mobile || user?.email}</p>
          </div>
        </div>
      </header>

      <div className="-mt-5 space-y-3 px-4 pb-6">
        <div className="grid grid-cols-3 gap-2">
          <QuickCard to="/orders" emoji="📦" label="Your Orders" />
          <QuickCard to="/wallet" emoji="👛" label="ThelaWala Wallet" note={inr(balance)} />
          <QuickCard to="/terms" emoji="🎧" label="Need Help?" />
        </div>

        <div className="card-soft divide-y divide-border border border-border">
          <button
            onClick={() => setEditing((e) => !e)}
            className="press flex w-full items-center justify-between px-3 py-3.5 text-left text-sm font-bold"
          >
            Address book &amp; details <Chevron />
          </button>
          {editing ? (
            <div className="space-y-2 p-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile number"
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={async () => {
                  if (!user) return;
                  await supabase.from("profiles").update({ full_name: name, mobile }).eq("id", user.id);
                  setSaved(true);
                }}
                className="press w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
              >
                {saved ? "Saved" : "Save details"}
              </button>
            </div>
          ) : null}
          <Link to="/wallet" className="flex items-center justify-between px-3 py-3.5 text-sm font-bold">
            Payment settings <Chevron />
          </Link>
          <Link to="/terms" className="flex items-center justify-between px-3 py-3.5 text-sm font-bold">
            Account privacy, cancellation &amp; refunds <Chevron />
          </Link>
          <a href="tel:9078492360" className="flex items-center justify-between px-3 py-3.5 text-sm font-bold text-primary">
            Call support · 9078492360 <Chevron />
          </a>
        </div>

        <div className="card-soft divide-y divide-border border border-border">
          <Link to="/vendor" className="flex items-center justify-between px-3 py-3.5 text-sm font-semibold">
            Stall partner portal <Chevron />
          </Link>
          <Link to="/rider" className="flex items-center justify-between px-3 py-3.5 text-sm font-semibold">
            Delivery partner portal <Chevron />
          </Link>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="press w-full rounded-xl border border-border py-3 text-sm font-bold"
        >
          Sign out
        </button>
      </div>
    </Shell>
  );
}

function QuickCard({ to, emoji, label, note }: { to: string; emoji: string; label: string; note?: string }) {
  return (
    <Link to={to} className="card-soft press border border-border p-3 text-center">
      <span className="block text-xl">{emoji}</span>
      <span className="mt-1 block text-[11px] font-bold leading-tight">{label}</span>
      {note ? <span className="mt-0.5 block text-[11px] font-black text-primary">{note}</span> : null}
    </Link>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
