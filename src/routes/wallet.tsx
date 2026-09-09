import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalHeader, Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { startOnlinePayment } from "@/lib/checkout";
import { inr, type Settings } from "@/lib/fees";
import { useSession } from "@/lib/session";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — ThelaWala" },
      { name: "description", content: "Add money to your ThelaWala wallet, see every credit and debit, and get your balance back any time." },
      { property: "og:title", content: "Wallet — ThelaWala" },
      { property: "og:description", content: "Balance, top-ups, refunds and wallet closure." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Wallet,
});

type Txn = { id: string; amount: number; transaction_type: string; source: string; note: string | null; created_at: string };

function Wallet() {
  const { user, loading } = useSession();
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState("ACTIVE");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [amount, setAmount] = useState("200");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(uid: string) {
    const [w, t] = await Promise.all([
      supabase.from("wallets").select("balance,status").eq("user_id", uid).maybeSingle(),
      supabase.from("wallet_transactions").select("id,amount,transaction_type,source,note,created_at").order("created_at", { ascending: false }).limit(30),
    ]);
    setBalance(Number(w.data?.balance ?? 0));
    setStatus(w.data?.status ?? "ACTIVE");
    setTxns((t.data ?? []) as Txn[]);
  }

  useEffect(() => {
    supabase.from("system_settings").select("*").maybeSingle().then(({ data }) => setSettings(data as Settings | null));
  }, []);

  useEffect(() => {
    if (user) void load(user.id);
  }, [user?.id]);

  if (loading) return <Shell><PortalHeader title="Wallet" /><ThaliwalaLoader /></Shell>;

  if (!user) {
    return (
      <Shell>
        <PortalHeader title="Wallet" />
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Sign in to use your wallet.</p>
          <Link to="/auth" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link>
        </div>
      </Shell>
    );
  }

  const min = Number(settings?.wallet_min_topup ?? 50);
  const max = Number(settings?.wallet_max_topup ?? 2000);

  async function addMoney() {
    setMsg(null);
    const amt = Number(amount);
    if (!(amt >= min && amt <= max)) return setMsg(`Please enter an amount between ${inr(min)} and ${inr(max)}.`);
    if (!user) return;
    setBusy(true);
    try {
      const { data: p } = await supabase.from("profiles").select("full_name,mobile").eq("id", user.id).maybeSingle();
      await startOnlinePayment({
        gateway: settings?.payment_gateway,
        amount: amt,
        purpose: "WALLET",
        name: p?.full_name ?? "Customer",
        email: user.email ?? "",
        mobile: p?.mobile ?? "",
      });
    } catch (e) {
      setBusy(false);
      setMsg(e instanceof Error ? e.message : "Could not start the payment.");
    }
  }

  return (
    <Shell>
      <PortalHeader title="Wallet" subtitle="Money for faster checkout" />
      <div className="space-y-3 p-4">
        <div className="rise-in card-elevated shine p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><span className="live-dot" /> Available balance</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary">{inr(balance)}</p>
          {status !== "ACTIVE" ? (
            <p className="mt-1 text-[11px] font-semibold text-destructive">Wallet {status.toLowerCase().replace("_", " ")}</p>
          ) : null}
        </div>

        <div className="rise-in card-elevated space-y-2 p-4" style={{ animationDelay: "60ms" }}>
          <p className="text-sm font-bold">Add money</p>
          <div className="flex gap-2">
            {[100, 200, 500].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-xl border border-border py-2 text-sm font-bold">
                {inr(v)}
              </button>
            ))}
          </div>
          <input
            type="tel"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <p className="text-[11px] text-muted-foreground">Between {inr(min)} and {inr(max)} per transaction.</p>
          <button
            disabled={busy}
            onClick={addMoney}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Opening payment…" : "Add money"}
          </button>
          {msg ? <p className="text-xs font-semibold text-destructive">{msg}</p> : null}
        </div>

        <div className="rise-in card-elevated p-4" style={{ animationDelay: "120ms" }}>
          <p className="text-sm font-bold">Wallet history</p>
          <div className="mt-2 space-y-2">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.note ?? t.source}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <p className={`font-bold ${t.transaction_type === "CREDIT" ? "text-primary" : ""}`}>
                  {t.transaction_type === "CREDIT" ? "+" : "−"} {inr(Number(t.amount))}
                </p>
              </div>
            ))}
            {txns.length === 0 ? <p className="text-xs text-muted-foreground">Nothing here yet.</p> : null}
          </div>
        </div>

        <button
          onClick={async () => {
            setMsg(null);
            const { error } = await supabase.rpc("request_wallet_closure");
            if (error) return setMsg(error.message);
            setMsg("Closure requested. Our team will return the balance to your bank.");
            if (user) void load(user.id);
          }}
          className="w-full rounded-xl border border-border py-3 text-sm font-bold"
        >
          Close wallet &amp; get balance back
        </button>
      </div>
    </Shell>
  );
}
