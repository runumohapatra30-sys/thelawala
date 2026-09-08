import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
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
        <PortalHeader title="Your account" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to see your account.</p>
          <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PortalHeader title="Your account" subtitle={user?.email ?? ""} />
      <div className="space-y-3 p-4">
        <div className="card-soft border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground">ThelaWala wallet</p>
          <p className="text-2xl font-extrabold text-primary">{inr(balance)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Refunds land here instantly and can be spent on your next order.
          </p>
          <Link to="/wallet" className="mt-2 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            Add money &amp; history
          </Link>
        </div>

        <div className="card-soft space-y-2 border border-border p-3">
          <p className="text-sm font-bold">Your details</p>
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
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            {saved ? "Saved" : "Save details"}
          </button>
        </div>

        <div className="card-soft divide-y divide-border border border-border">
          <Link to="/orders" className="block px-3 py-3 text-sm font-semibold">Your orders</Link>
          <Link to="/terms" className="block px-3 py-3 text-sm font-semibold">Terms, cancellation &amp; refunds</Link>
          <a href="tel:9078492360" className="block px-3 py-3 text-sm font-semibold text-primary">Call support · 9078492360</a>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="w-full rounded-xl border border-border py-3 text-sm font-bold"
        >
          Sign out
        </button>
      </div>
    </Shell>
  );
}
