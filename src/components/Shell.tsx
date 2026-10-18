import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CircleUserRound, Grid2X2, House, ReceiptText, ShoppingCart, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GUEST_PROFILE_EVENT, LoginModal, OPEN_LOGIN_EVENT } from "@/components/LoginModal";
import { useSession } from "@/lib/session";
import { CART_CONFLICT_EVENT, type CartConflictDetail, cart, useCart } from "@/lib/cart";
import { useAuthBranding } from "@/lib/authBranding";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/", label: "Home", Icon: House },
  { to: "/stalls", label: "Stalls", Icon: Store },
  { to: "/categories", label: "Explore", Icon: Grid2X2 },
  { to: "/cart", label: "Cart", Icon: ShoppingCart },
  { to: "/orders", label: "Orders", Icon: ReceiptText },
  { to: "/profile", label: "Profile", Icon: CircleUserRound },
];

export function Shell({ children, hideNavigation = false }: { children: ReactNode; hideNavigation?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const branding = useAuthBranding();
  const cartLines = useCart();
  const cartCount = cartLines.reduce((total, line) => total + line.qty, 0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cartConflict, setCartConflict] = useState<CartConflictDetail | null>(null);
  const [conflictStallNames, setConflictStallNames] = useState<{ current: string; incoming: string } | null>(null);

  useEffect(() => {
    const open = () => setLoginOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, open);
    return () => {
      window.removeEventListener(OPEN_LOGIN_EVENT, open);
    };
  }, []);

  useEffect(() => {
    const handleConflict = (event: Event) => {
      const detail = (event as CustomEvent<CartConflictDetail>).detail;
      setCartConflict(detail);
      setConflictStallNames({
        current: detail.currentVendorName ?? cart.lines.find((line) => line.vendorId === detail.currentVendorId)?.vendorName ?? "your current stall",
        incoming: detail.incoming.vendorName ?? "the selected stall",
      });
      if (detail.currentVendorName && detail.incoming.vendorName) return;
      void supabase
        .from("vendors")
        .select("id,stall_name")
        .in("id", [detail.currentVendorId, detail.incoming.vendorId])
        .then(({ data, error }) => {
          if (error) {
            console.error("Could not load stall names for cart conflict:", error);
            return;
          }
          const names = new Map((data ?? []).map((vendor) => [vendor.id, vendor.stall_name]));
          setConflictStallNames({
            current: detail.currentVendorName ?? names.get(detail.currentVendorId) ?? "your current stall",
            incoming: detail.incoming.vendorName ?? names.get(detail.incoming.vendorId) ?? "the selected stall",
          });
        });
    };
    window.addEventListener(CART_CONFLICT_EVENT, handleConflict);
    return () => window.removeEventListener(CART_CONFLICT_EVENT, handleConflict);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background pb-36 shadow-[0_0_48px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]">
        {children}
      </div>
      {!hideNavigation ? <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto grid w-[calc(100%-24px)] max-w-[480px] grid-cols-6 items-end rounded-full border border-border bg-card/95 px-2 py-2 shadow-[0_18px_45px_-20px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] backdrop-blur-xl">
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
                className={`relative grid h-10 w-12 place-items-center rounded-full transition-all ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
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
                  <n.Icon className="h-5 w-5" strokeWidth={2} />
                )}
                {n.label === "Cart" && cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#5B9BD5] px-1 text-[9px] font-black text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </span>
              <span
                className={`truncate text-[9px] font-extrabold uppercase ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav> : null}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <AlertDialog open={cartConflict !== null} onOpenChange={(open) => {
        if (!open) {
          setCartConflict(null);
          setConflictStallNames(null);
        }
      }}>
        <AlertDialogContent className="top-auto bottom-0 translate-y-0 rounded-t-3xl sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace cart items?</AlertDialogTitle>
            <AlertDialogDescription>
              Your cart contains items from {conflictStallNames?.current ?? "your current stall"}. Reset your cart to add items from {conflictStallNames?.incoming ?? "the selected stall"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2">
            <AlertDialogCancel className="mt-0 rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (cartConflict) cart.replaceWith(cartConflict.incoming);
                setCartConflict(null);
                setConflictStallNames(null);
              }}
            >
              Clear &amp; Add
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          className={`rounded-lg px-1.5 py-2.5 text-[10px] font-black transition-colors sm:px-2 sm:text-[11px] ${active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
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
