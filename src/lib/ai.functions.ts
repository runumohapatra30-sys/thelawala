import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-3.8-flash";

/** Morning / Afternoon / Evening / Late-night in Bhubaneswar (IST). */
function bhubaneswarSlot(now = new Date()) {
  const ist = new Date(now.getTime() + (5.5 * 60 - now.getTimezoneOffset()) * 60000);
  const h = ist.getHours();
  if (h >= 5 && h < 11) return { slot: "MORNING", hour: h };
  if (h >= 11 && h < 16) return { slot: "AFTERNOON", hour: h };
  if (h >= 16 && h < 22) return { slot: "EVENING", hour: h };
  return { slot: "LATE_NIGHT", hour: h };
}

async function bhubaneswarWeather() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=20.2961&longitude=85.8245&current=temperature_2m,precipitation,weather_code",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return { tag: "CLEAR", temperature: null as number | null };
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; precipitation?: number; weather_code?: number };
    };
    const c = json.current ?? {};
    const code = Number(c.weather_code ?? 0);
    const temp = Number(c.temperature_2m ?? 0);
    let tag = "CLEAR";
    if (code >= 51) tag = "RAIN";
    else if (code >= 45) tag = "FOG";
    else if (code >= 1) tag = "CLOUDY";
    if (tag === "CLEAR" && temp >= 34) tag = "HOT";
    if (temp && temp <= 18) tag = "COLD";
    return { tag, temperature: temp || null };
  } catch {
    return { tag: "CLEAR", temperature: null as number | null };
  }
}

/**
 * Picks the best home-screen banner + animation for the current time of day and
 * Bhubaneswar weather, and activates it. Safe to call on every home screen load:
 * it only re-thinks once every 30 minutes.
 */
export const refreshDynamicAsset = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: assets } = await supabaseAdmin
    .from("app_dynamic_assets")
    .select("id,title,subtitle,banner_image_url,lottie_url,time_slots,weather_tags,is_enabled,is_active,activated_at,ai_reason")
    .eq("is_enabled", true)
    .order("created_at");

  const pool = assets ?? [];
  if (pool.length === 0) return { active: null, skipped: "no-assets" as const };

  const current = pool.find((a) => a.is_active) ?? null;
  const freshFor = 30 * 60 * 1000;
  if (current?.activated_at && Date.now() - new Date(current.activated_at).getTime() < freshFor) {
    return { active: current, skipped: "fresh" as const };
  }

  const { slot, hour } = bhubaneswarSlot();
  const weather = await bhubaneswarWeather();

  let chosenId = pool[0]!.id;
  let reason = `Fallback pick for ${slot.toLowerCase()} / ${weather.tag.toLowerCase()}.`;

  const key = process.env["LOVABLE_API_KEY"];
  if (key) {
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway(MODEL),
        system:
          "You choose the best marketing banner for a Bhubaneswar street-food delivery app. " +
          "Answer with ONLY compact JSON: {\"id\":\"<asset id>\",\"reason\":\"<max 15 words>\"}. Pick exactly one id from the list.",
        prompt: [
          `Local time slot: ${slot} (hour ${hour} IST).`,
          `Weather: ${weather.tag}${weather.temperature ? `, ${weather.temperature}°C` : ""}.`,
          "Assets:",
          ...pool.map(
            (a) =>
              `- id=${a.id} | title=${a.title} | slots=${(a.time_slots ?? []).join("/") || "any"} | weather=${(a.weather_tags ?? []).join("/") || "any"}`,
          ),
        ].join("\n"),
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { id?: string; reason?: string };
        if (parsed.id && pool.some((a) => a.id === parsed.id)) {
          chosenId = parsed.id;
          reason = parsed.reason ?? reason;
        }
      }
    } catch {
      /* keep the fallback pick */
    }
  }

  await supabaseAdmin.from("app_dynamic_assets").update({ is_active: false }).eq("is_active", true);
  const { data: activated } = await supabaseAdmin
    .from("app_dynamic_assets")
    .update({ is_active: true, ai_reason: reason, activated_at: new Date().toISOString() })
    .eq("id", chosenId)
    .select("id,title,subtitle,banner_image_url,lottie_url,ai_reason")
    .maybeSingle();

  return { active: activated ?? null, slot, weather: weather.tag };
});

const VoiceInput = z.object({
  transcript: z.string().min(1).max(400),
  stalls: z.array(z.string().max(80)).max(60).default([]),
  items: z.array(z.string().max(80)).max(200).default([]),
});

/** Turns colloquial Odia / English speech into a clean search query. */
export const parseVoiceSearch = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => VoiceInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    const fallback = { query: data.transcript.trim(), stall: null as string | null, qty: 1, spoken: data.transcript.trim() };
    if (!key) return fallback;

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway(MODEL),
        system: [
          "You convert spoken Odia or English food orders into a search query for a Bhubaneswar street-food app.",
          'Reply with ONLY JSON: {"query":"<food item words in English>","stall":"<exact stall name or null>","qty":<number>}.',
          "query must be short (1-3 words) and match the menu vocabulary. stall must be one of the given stalls or null.",
          'Example: "Mote 2 ta egg roll Khandagiri ru darkar" -> {"query":"egg roll","stall":"<stall near Khandagiri or null>","qty":2}',
        ].join("\n"),
        prompt: [
          `Speech: ${data.transcript}`,
          `Stalls: ${data.stalls.join(", ") || "none"}`,
          `Menu items: ${data.items.slice(0, 120).join(", ") || "none"}`,
        ].join("\n"),
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return fallback;
      const parsed = JSON.parse(match[0]) as { query?: string; stall?: string | null; qty?: number };
      return {
        query: (parsed.query ?? data.transcript).trim(),
        stall: parsed.stall && data.stalls.includes(parsed.stall) ? parsed.stall : null,
        qty: Number(parsed.qty) > 0 ? Math.min(20, Math.round(Number(parsed.qty))) : 1,
        spoken: data.transcript.trim(),
      };
    } catch {
      return fallback;
    }
  });

const LayoutSection = z.object({
  id: z.string(),
  type: z.string(),
  is_visible: z.boolean(),
  order: z.number(),
  config: z.record(z.string(), z.unknown()).default({}),
});

const LayoutCopilotInput = z.object({
  app: z.enum(["customer", "vendor", "rider"]),
  page: z.string().min(1).max(40),
  prompt: z.string().min(2).max(400),
  sections: z.array(LayoutSection).min(1).max(30),
});

type LayoutSectionT = z.infer<typeof LayoutSection>;

const VARIANTS = [
  { key: "compact", label: "Compact", scale: 0.8, gap: 6, padding: 8, font: 0.92 },
  { key: "balanced", label: "Balanced", scale: 1, gap: 10, padding: 12, font: 1 },
  { key: "roomy", label: "Roomy", scale: 1.22, gap: 16, padding: 18, font: 1.08 },
] as const;

function localVariant(sections: LayoutSectionT[], v: (typeof VARIANTS)[number]) {
  return sections.map((s) => {
    const cfg = s.config as Record<string, unknown>;
    const height = Number(cfg["height"] ?? 140);
    return {
      ...s,
      config: {
        ...cfg,
        height: Math.max(80, Math.min(320, Math.round(height * v.scale))),
        gap: v.gap,
        padding: v.padding,
        fontScale: v.font,
      },
    };
  });
}

/** Turns an admin's Odia / Hinglish / English feedback into 3 layout variants for one screen. */
export const layoutCopilot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => LayoutCopilotInput.parse(raw))
  .handler(async ({ data }) => {
    const fallback = VARIANTS.map((v) => ({
      key: v.key,
      label: v.label,
      sections: localVariant(data.sections, v),
      explanation_od: `${v.label}: ବ୍ଲକ୍‌ର ଉଚ୍ଚତା, ଫାଙ୍କ ଓ ପ୍ୟାଡିଂ ${v.label.toLowerCase()} ଢଙ୍ଗରେ ସଜାଗଲା।`,
    }));

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { variants: fallback, ai: false as const };

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway(MODEL),
        system: [
          "You are a mobile UI layout agent for a food-delivery app (Blinkit-like).",
          "Input: the current layout JSON of one screen plus an admin instruction in Odia, Hinglish or English.",
          "Return ONLY JSON: {\"variants\":[{\"key\":\"compact|balanced|roomy\",\"sections\":[...],\"explanation_od\":\"<Odia, max 20 words>\"}]}",
          "Exactly 3 variants in the order compact, balanced, roomy.",
          "Each sections array MUST keep the same section ids and types; you may change order, is_visible and config only.",
          "Allowed config keys: title, height (80-320), rounded (0-32), gap (0-24), padding (0-24), fontScale (0.85-1.25), limit, layout, content, autoplay, fullWidth (boolean), buttonSize ('sm'|'md'|'lg'), buttonColor (hex).",
        ].join("\n"),
        prompt: [
          `Role: ${data.app}`,
          `Screen: ${data.page}`,
          `Admin instruction: ${data.prompt}`,
          `Current layout JSON: ${JSON.stringify(data.sections)}`,
        ].join("\n"),
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { variants: fallback, ai: false as const };
      const parsed = JSON.parse(match[0]) as {
        variants?: { key?: string; sections?: unknown; explanation_od?: string }[];
      };
      const ids = new Set(data.sections.map((s) => s.id));
      const out = VARIANTS.map((v) => {
        const hit = parsed.variants?.find((p) => p.key === v.key);
        const arr = Array.isArray(hit?.sections) ? (hit!.sections as LayoutSectionT[]) : null;
        const clean = arr?.filter((s) => s && typeof s.type === "string" && ids.has(s.id));
        return {
          key: v.key,
          label: v.label,
          sections:
            clean && clean.length === data.sections.length
              ? clean.map((s, i) => ({
                  ...s,
                  order: i + 1,
                  is_visible: s.is_visible !== false,
                  config: (s.config ?? {}) as Record<string, unknown>,
                }))
              : localVariant(data.sections, v),
          explanation_od: hit?.explanation_od?.trim() || fallback.find((f) => f.key === v.key)!.explanation_od,
        };
      });
      return { variants: out, ai: true as const };
    } catch {
      return { variants: fallback, ai: false as const };
    }
  });
