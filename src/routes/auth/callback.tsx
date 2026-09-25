import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? search["next"] : "/",
  }),
  component: AuthCallback,
});

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function AuthCallback() {
  const { next } = Route.useSearch();
  const [message, setMessage] = useState("Finishing sign in...");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setMessage("This sign-in link has expired. Please try again.");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!cancelled) setMessage("We could not complete sign in. Please try again.");
        return;
      }

      window.location.replace(safeNext(next));
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
      <div className="rounded-3xl bg-card p-6 shadow-card">
        <p className="font-display text-2xl text-primary">ThelaWala</p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
