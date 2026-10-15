import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CircleUserRound, Grid2X2, House, ReceiptText, ShoppingCart, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GUEST_PROFILE_EVENT, LoginModal, OPEN_LOGIN_EVENT } from "@/components/LoginModal";
import { useSession } from "@/lib/session";
import { useCart } from "@/lib/cart";
import { useAuthBranding } from "@/lib/authBranding";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Home", Icon: House },
  { to: "/stalls", label: "Stalls", Icon: Store },
  { to: "/categories", label: "Explore", Icon: Grid2X2 },
  { to: "/cart", label: "Cart", Icon: ShoppingCart },
  { to: "/orders", label: "Orders", Icon: ReceiptText },
  { to: "/profile", label: "Profile", Icon: CircleUserRound },
];

export function Shell({ children, hideNavigation = false, className = "" }: { children: ReactNode; hideNavigation?: boolean; className?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const branding = useAuthBranding();
  const cartLines = useCart();
  const cartCount = cartLines.reduce((total, line) => total + line.qty, 0);
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
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-36 shadow-[0_0_48px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]">
        {children}
      </div>
      {!hideNavigation && path !== "/cart" && !loginOpen ? <nav aria-label="Customer navigation" className="customer-bottom-nav fixed inset-x-0 bottom-3 z-40 mx-auto grid w-[calc(100%-24px)] max-w-[480px] grid-cols-6 items-end rounded-full border border-border bg-card/95 px-2 py-2 shadow-[0_18px_45px_-20px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] backdrop-blur-xl">
        {NAV.map((n) => {
          const active =
            n.label === "Home"
              ? path === "/"
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
                className={`relative grid h-9 w-10 place-items-center rounded-full transition-all ${active ? "bg-primary/8 text-primary" : "text-muted-foreground"}`}
              >
                {n.label === "Profile" && user?.user_metadata?.["avatar_url"] ? (
                  <img
                    src={String(user.user_metadata["avatar_url"])}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : n.label === "Home" && branding.appLogoUrl ? (
                  <img
                    src={branding.appLogoUrl}
                    alt=""
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                    className="h-6 w-6 object-contain"
                  />
                ) : (
                  <n.Icon className="h-5 w-5" strokeWidth={1.6} />
                )}
                {n.label === "Cart" && cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </span>
              <span
                className={`truncate text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
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
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.error(`Could not sign out: ${error.message}`);
          return;
        }
        window.localStorage.removeItem("thelawala_onboarding_completed");
        navigate({ to: "/", replace: true });
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
  const branding = useAuthBranding();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background px-4 pb-4 pt-4">
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
        {branding.appLogoUrl ? (
          <img
            src={branding.appLogoUrl}
            alt=""
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            className="h-8 w-8 shrink-0 object-contain"
          />
        ) : null}
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
    ["soundbox", "Soundbox Hardware"],
  ] as const;
  return (
    <div className="sticky top-[72px] z-20 -mx-1 grid grid-cols-3 gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key as T)}
          className={`rounded-lg px-1.5 py-2.5 text-[10px] font-black transition-colors sm:px-2 sm:text-[11px] ${active === key ? "bg-primary/8 text-primary" : "text-muted-foreground"}`}
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
