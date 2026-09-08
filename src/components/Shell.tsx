import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home", icon: "M4 11l8-7 8 7v8a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1z" },
  { to: "/orders", label: "Orders", icon: "M6 4h12v16l-6-3-6 3z" },
  { to: "/vendor", label: "Stall", icon: "M4 10l1.5-4h13L20 10v2H4z M6 12h12v7H6z" },
  { to: "/rider", label: "Rider", icon: "M5 17a3 3 0 106 0 3 3 0 00-6 0zm8 0a3 3 0 106 0 3 3 0 00-6 0zM7 15l3-6h4l2 6" },
  { to: "/admin", label: "Admin", icon: "M12 3l8 4v5c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V7z" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background pb-24 shadow-[0_0_40px_rgba(0,0,0,0.05)]">
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] items-stretch border-t border-border bg-card">
        {NAV.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d={n.icon} strokeLinejoin="round" />
              </svg>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PortalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Link to="/" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
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
      className={`w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
