import type { ErrorComponentProps } from "@tanstack/react-router";
import { PwaUpdater } from "@/components/PwaUpdater";
import { ThaliwalaLoader } from "@/components/ThaliwalaLoader";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ThelaWala — Bhubaneswar Street Food" },
      { name: "description", content: "Fresh street food delivered across Bhubaneswar." },
      { name: "author", content: "ThelaWala" },
      { property: "og:title", content: "ThelaWala" },
      { property: "og:description", content: "Fresh street food delivered across Bhubaneswar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#0A4D3C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Thaleewala" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
            { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        src: "https://sdk.cashfree.com/js/v3/cashfree.js",
      },
    ],
  }),
  
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: () => <ThaliwalaLoader fullScreen />,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Clear all cached data on logout/account switch so the previous
  // account's orders, wallet, etc. never leak into the next session.
  useEffect(() => {
    let prevUserId: string | null = null;
    supabase.auth.getSession().then(({ data }) => {
      prevUserId = data.session?.user?.id ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (event === "SIGNED_OUT" || (nextUserId && prevUserId && nextUserId !== prevUserId)) {
        queryClient.clear();
      }
      prevUserId = nextUserId;
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <PwaUpdater />
      <OfflineScreen />
      
    </QueryClientProvider>
  );
}
function OfflineScreen() {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setChecking(true);
      setTimeout(() => setChecking(false), 800);
    }
  };

  if (!isOffline) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fbeae5", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ background: "#ffffff", width: "100%", maxWidth: "340px", borderRadius: "32px", padding: "48px 24px 40px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}>
        <div style={{ width: "84px", height: "84px", background: "#fff2ec", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff6600" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 10px 0" }}>No internet connection</h2>
        <p style={{ fontSize: "13px", color: "#737373", margin: "0 0 32px 0", lineHeight: "1.45", maxWidth: "230px" }}>Please check your internet connection and try again</p>
        <button onClick={handleRetry} style={{ width: "100%", maxWidth: "200px", padding: "12px 20px", background: "#ff6600", color: "#ffffff", fontSize: "14px", fontWeight: "600", border: "none", borderRadius: "9999px", cursor: "pointer", boxShadow: "0 6px 16px rgba(255,102,0,0.3)" }}>
          {checking ? "Checking..." : "Retry"}
        </button>
      </div>
    </div>
  );
}
