import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";
import { ChevronRight, Gift, Headphones, Heart, MapPin, MessageSquareText, Pencil, ShoppingBag, Wallet } from "lucide-react";

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
  const [refCode, setRefCode] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState("");
  const [refMsg, setRefMsg] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,mobile,referral_code,referred_by").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name ?? "");
      setMobile(data?.mobile ?? "");
      setRefCode(data?.referral_code ?? "");
      setReferredBy(data?.referred_by ?? null);
    });
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBalance(Number(data?.balance ?? 0));
    });
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => {
      setOrderCount(count ?? 0);
    });
  }, [user?.id]);

  if (loading) return <Shell><ThaliwalaLoader /></Shell>;

  if (!user) {
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
       <header className="relative overflow-hidden rounded-b-[2rem] bg-primary px-5 pb-8 pt-7 text-primary-foreground shadow-card">
        <div className="flex min-w-0 items-center gap-3">
          <div className="pop-in grid h-16 w-16 shrink-0 rotate-2 place-items-center rounded-lg border-4 border-card bg-brand text-2xl font-black text-brand-foreground shadow-card">
            {(name || user?.email || "T").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
             <p className="truncate font-display text-3xl">{name || "ThelaWala customer"}</p>
            <p className="truncate text-xs font-semibold opacity-80">{mobile || user?.email}</p>
            <span className="mt-2 inline-flex rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-2 py-1 text-[10px] font-black uppercase">Street food member</span>
          </div>
          <button aria-label="Edit profile" onClick={() => setEditing(true)} className="press grid h-9 w-9 place-items-center rounded-full border border-primary-foreground/25"><Pencil className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="space-y-5 px-4 py-5 pb-8">
        <div className="grid grid-cols-3 gap-2">
          <Metric to="/orders" value={String(orderCount)} label="Orders" icon={<ShoppingBag className="h-4 w-4" />} />
          <Metric to="/wallet" value={inr(balance)} label="Wallet" icon={<Wallet className="h-4 w-4" />} />
          <Metric to="/" value="Saved" label="Wishlist" icon={<Heart className="h-4 w-4" />} />
        </div>

        <div>
          <p className="mb-2 text-[11px] font-black uppercase text-muted-foreground">Your account</p>
          <div className="card-soft divide-y divide-border border border-border">
          <MenuLink icon={<Gift />} label="Cashback rewards" to="/wallet" />
          <button
            onClick={() => setEditing((e) => !e)}
            className="press flex w-full items-center justify-between px-3 py-3.5 text-left text-sm font-bold"
          >
            <span className="flex items-center gap-3"><MenuIcon><MapPin /></MenuIcon>Saved addresses</span><Chevron />
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
          <MenuLink icon={<Headphones />} label="Help & support" to="/support" />
          <a href="mailto:founder@thelawala.com" className="flex items-center justify-between px-3 py-3.5 text-sm font-bold"><span className="flex items-center gap-3"><MenuIcon><MessageSquareText /></MenuIcon>Write to Founder</span><Chevron /></a>
          </div>
        </div>

         <div className="coupon-card relative overflow-hidden p-4 text-foreground shadow-card">
          <p className="font-display text-xl">Refer &amp; earn ₹25</p>
          <p className="mt-1 max-w-[250px] text-[11px] font-semibold opacity-75">Bring your food buddy. You both receive wallet credit.</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex-1 rounded-lg border border-dashed border-brand-foreground/40 bg-card/60 px-3 py-2.5 text-sm font-black text-primary">
              {refCode || "—"}
            </span>
            <button
              onClick={async () => {
                const text = `Order hot street food on ThelaWala! Use my code ${refCode} and we both get ₹25.`;
                if (navigator.share) await navigator.share({ text }).catch(() => {});
                else {
                  await navigator.clipboard?.writeText(text);
                  setRefMsg("Invite copied. Share it with your friends!");
                }
              }}
              className="press shrink-0 rounded-lg bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground"
            >
              Share
            </button>
          </div>
          {referredBy ? (
            <p className="mt-2 text-[11px] font-semibold text-primary">You already used a friend&apos;s code. 🎉</p>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="Have a friend's code?"
                className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
              />
              <button
                onClick={async () => {
                  const { data, error } = await supabase.rpc("apply_referral", { _code: friendCode });
                  if (error) return setRefMsg("Could not apply this code.");
                  if (data === "OK") {
                    setReferredBy("done");
                    setBalance((b) => b + 25);
                    setRefMsg("₹25 added to your wallet!");
                  } else if (data === "ALREADY_USED") setRefMsg("You have already used a referral code.");
                  else setRefMsg("This code is not valid.");
                }}
                className="press shrink-0 rounded-xl border border-primary px-4 text-xs font-black text-primary"
              >
                Apply
              </button>
            </div>
          )}
          {refMsg ? <p className="mt-1.5 text-[11px] font-semibold text-primary">{refMsg}</p> : null}
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
    <Link to={to} className="card-elevated rise-in press p-3 text-center">
      <span className="block text-xl float-slow">{emoji}</span>
      <span className="mt-1 block text-[11px] font-bold leading-tight">{label}</span>
      {note ? <span className="mt-0.5 block text-[11px] font-black text-primary">{note}</span> : null}
    </Link>
  );
}

function Metric({ to, value, label, icon }: { to: string; value: string; label: string; icon: React.ReactNode }) {
  return <Link to={to} className="press rounded-lg border border-border bg-card p-3 text-center shadow-card"><span className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-primary">{icon}</span><span className="block truncate text-sm font-black">{value}</span><span className="text-[10px] font-bold text-muted-foreground">{label}</span></Link>;
}

function MenuIcon({ children }: { children: React.ReactNode }) {
  return <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-primary [&_svg]:h-4 [&_svg]:w-4">{children}</span>;
}

function MenuLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return <Link to={to} className="flex items-center justify-between px-3 py-3.5 text-sm font-bold"><span className="flex items-center gap-3"><MenuIcon>{icon}</MenuIcon>{label}</span><Chevron /></Link>;
}

function Chevron() {
  return <ChevronRight className="h-4 w-4 text-muted-foreground" />;
}
