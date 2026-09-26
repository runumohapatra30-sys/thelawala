import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CircleUserRound, Grid2X2, House, Play, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GUEST_PROFILE_EVENT, LoginModal, OPEN_LOGIN_EVENT } from "@/components/LoginModal";
import { useSession } from "@/lib/session";

const NAV = [
  { to: "/", label: "Today", Icon: House },
  { to: "/categories", label: "Aisles", Icon: Grid2X2 },
  { to: "/", label: "Finds", Icon: Play },
  { to: "/orders", label: "Reorder", Icon: RotateCcw },
  { to: "/profile", label: "Profile", Icon: CircleUserRound },
];

export function Shell({ children, hideNavigation = false }: { children: ReactNode; hideNavigation?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestProfile, setGuestProfile] = useState(() => ({
    name: typeof window === "undefined" ? "" : localStorage.getItem("thelawala.guest_name") || "",
    mobile:
      typeof window === "undefined" ? "" : localStorage.getItem("thelawala.guest_mobile") || "",
  }));

  useEffect(() => {
    const open = () => setLoginOpen(true);
    const updateGuest = (event: Event) => {
      const profile = (event as CustomEvent<{ name: string; mobile: string }>).detail;
      setGuestProfile(profile);
    };
    window.addEventListener(OPEN_LOGIN_EVENT, open);
    window.addEventListener(GUEST_PROFILE_EVENT, updateGuest);
    return () => {
      window.removeEventListener(OPEN_LOGIN_EVENT, open);
      window.removeEventListener(GUEST_PROFILE_EVENT, updateGuest);
    };
  }, []);

  const displayName =
    user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"] || guestProfile.name;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-36 shadow-[0_0_48px_color-mix(in_oklab,var(--color-primary)_10%,transparent)]">
        {children}
      </div>
      {!hideNavigation ? <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto grid w-[calc(100%-24px)] max-w-[480px] grid-cols-5 items-end rounded-full border border-border bg-card/95 px-2 py-2 shadow-[0_18px_45px_-20px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] backdrop-blur-xl">
        {NAV.map((n) => {
          const active =
            n.label === "Today"
              ? path === "/"
              : n.label === "Finds"
                ? false
                : path.startsWith(n.to);
          return (
            <Link
              key={n.label}
              to={n.to}
              onClick={(event) => {
                if (n.label === "Profile" && !user) {
                  event.preventDefault();
                  setLoginOpen(true);
                }
              }}
              className="press flex min-w-0 flex-col items-center gap-1"
            >
              <span
                className={`grid h-10 w-12 place-items-center rounded-full transition-all ${n.label === "Finds" ? "-mt-5 h-12 w-12 border-4 border-background bg-[url('/food/food-roll.jpg')] bg-cover bg-center text-primary-foreground shadow-[0_10px_22px_-10px_color-mix(in_oklab,var(--color-primary)_85%,transparent)]" : active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {n.label === "Profile" && user?.user_metadata?.["avatar_url"] ? (
                  <img
                    src={String(user.user_metadata["avatar_url"])}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <n.Icon className="h-5 w-5" strokeWidth={2} />
                )}
              </span>
              <span
                className={`truncate text-[9px] font-extrabold uppercase ${
                  active || n.label === "Finds" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {n.label === "Profile" && displayName ? displayName : n.label}
              </span>
            </Link>
          );
        })}
      </nav> : null}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        navigate({ to: "/login", replace: true });
      }}
      className={`press shrink-0 rounded-full bg-card/80 px-3 py-1.5 text-[11px] font-bold text-primary ${className}`}
    >
      Log out
    </button>
  );
}

export function LoginButton({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_LOGIN_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}

export function PortalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="brand-header sticky top-0 z-30 rounded-b-[2.25rem] px-4 pb-5 pt-4 shadow-[0_18px_34px_-24px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-2xl glass-chip"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl leading-none">{title}</h1>
          {subtitle ? <p className="truncate text-xs font-medium opacity-80">{subtitle}</p> : null}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}

export function PortalTabs<T extends string>({
  active,
  onChange,
}: {
  active: T;
  onChange: (tab: T) => void;
}) {
  const tabs = [
    ["live", "Live Orders & Trips"],
    ["accounts", "Payouts & Accounts"],
  ] as const;
  return (
    <div className="sticky top-[72px] z-20 -mx-1 grid grid-cols-2 gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key as T)}
          className={`rounded-lg px-2 py-2.5 text-[11px] font-black transition-colors ${active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
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

export function GreenButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`press w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function ThelaLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="6" y="16" width="30" height="14" rx="3" fill="var(--color-primary)" />
      <path
        d="M6 16l4-8h22l4 8z"
        fill="var(--color-brand)"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="36" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
      <circle cx="31" cy="36" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
      <path d="M36 22h6" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
