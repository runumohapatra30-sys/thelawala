import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CircleUserRound, Grid2X2, House, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  {
    to: "/",
    label: "Home",
    Icon: House,
  },
  {
    to: "/orders",
    label: "Order Again",
    Icon: RotateCcw,
  },
  {
    to: "/categories",
    label: "Categories",
    Icon: Grid2X2,
  },
  {
    to: "/profile",
    label: "Account",
    Icon: CircleUserRound,
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background pb-36 shadow-[0_0_48px_color-mix(in_oklab,var(--color-primary)_10%,transparent)]">
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto grid w-[calc(100%-24px)] max-w-[440px] grid-cols-4 items-center rounded-[1.5rem] border border-border bg-card px-2 py-2 shadow-[0_18px_45px_-20px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className="press flex min-w-0 flex-col items-center gap-1"
            >
              <span
                className={`grid h-10 w-12 place-items-center rounded-xl transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_10px_22px_-10px_color-mix(in_oklab,var(--color-primary)_85%,transparent)]"
                    : "text-muted-foreground"
                }`}
              >
                <n.Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span
                className={`truncate text-[9px] font-extrabold uppercase ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      }}
      className={`press shrink-0 rounded-full bg-card/80 px-3 py-1.5 text-[11px] font-bold text-primary ${className}`}
    >
      Log out
    </button>
  );
}

export function PortalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="brand-header sticky top-0 z-30 rounded-b-[2rem] px-4 py-4 shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)]">
      <div className="flex items-center gap-3">
        <Link to="/" className="press grid h-10 w-10 shrink-0 place-items-center rounded-2xl glass-chip">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold">{title}</h1>
          {subtitle ? <p className="truncate text-xs font-medium opacity-80">{subtitle}</p> : null}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

export function GreenButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`press w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function ThelaLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="6" y="16" width="30" height="14" rx="3" fill="var(--color-primary)" />
      <path d="M6 16l4-8h22l4 8z" fill="var(--color-brand)" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="14" cy="36" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
      <circle cx="31" cy="36" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
      <path d="M36 22h6" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
