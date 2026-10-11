import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_LOGIN_HERO = "/food/food-biryani.jpg";
export const DEFAULT_BRAND_TITLE = "ThelaWala";
export const AUTH_BRANDING_PAGE = "auth_branding";

export type AuthBranding = {
  loginHeroImage: string;
  logoUrl: string;
  brandTitle: string;
};

export const DEFAULT_AUTH_BRANDING: AuthBranding = {
  loginHeroImage: DEFAULT_LOGIN_HERO,
  logoUrl: "",
  brandTitle: DEFAULT_BRAND_TITLE,
};

function parseBranding(value: unknown): AuthBranding {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_AUTH_BRANDING;
  }
  const config = value as Record<string, unknown>;
  return {
    loginHeroImage:
      typeof config["loginHeroImage"] === "string" &&
      config["loginHeroImage"].trim()
        ? config["loginHeroImage"]
        : DEFAULT_LOGIN_HERO,
    logoUrl: typeof config["logoUrl"] === "string" ? config["logoUrl"] : "",
    brandTitle:
      typeof config["brandTitle"] === "string" &&
      config["brandTitle"].trim()
        ? config["brandTitle"].trim()
        : DEFAULT_BRAND_TITLE,
  };
}

export async function loadAuthBranding(): Promise<AuthBranding> {
  const { data, error } = await supabase
    .from("app_page_layouts")
    .select("sections")
    .eq("target_app", "customer")
    .eq("page_name", AUTH_BRANDING_PAGE)
    .maybeSingle();
  if (error) throw error;
  return parseBranding(data?.sections);
}

export async function saveAuthBranding(branding: AuthBranding) {
  const { error } = await supabase.from("app_page_layouts").upsert(
    {
      target_app: "customer",
      page_name: AUTH_BRANDING_PAGE,
      sections: branding,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "target_app,page_name" },
  );
  if (error) throw error;
}

export async function uploadAuthBrandingImage(file: File, kind: "hero" | "logo") {
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 8 MB.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "img";
  const path = `auth-branding/${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("banners").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage
    .from("banners")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (urlError || !data?.signedUrl) {
    throw urlError ?? new Error("Could not create an image URL.");
  }
  return data.signedUrl;
}

export function useAuthBranding() {
  const [branding, setBranding] = useState(DEFAULT_AUTH_BRANDING);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      void loadAuthBranding()
        .then((value) => {
          if (alive) setBranding(value);
        })
        .catch((error: unknown) => {
          if (alive) console.error("Could not load auth branding:", error);
        });
    };
    pull();
    const channel = supabase
      .channel("auth-branding")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_page_layouts",
          filter: "page_name=eq.auth_branding",
        },
        pull,
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return branding;
}
