import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { layoutCopilot } from "@/lib/ai.functions";
import {
  PAGES,
  SECTION_LABELS,
  defaultSections,
  loadLayout,
  saveLayout,
  type PageSection,
  type SectionConfig,
  type TargetApp,
} from "@/lib/pageLayout";


const APPS: { key: TargetApp; label: string }[] = [
  { key: "customer", label: "Customer app" },
  { key: "vendor", label: "Vendor app" },
  { key: "rider", label: "Rider app" },
];

const CONTENT = [
  { key: "image", label: "Single image" },
  { key: "video", label: "Auto video loop" },
  { key: "lottie", label: "Lottie animation" },
  { key: "grid", label: "Food grid" },
] as const;

const selCls = "rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold outline-none";

export function PageStudio() {
  const [app, setApp] = useState<TargetApp>("customer");
  const [page, setPage] = useState("home");
  const [sections, setSections] = useState<PageSection[]>(defaultSections("customer", "home"));
  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const askCopilot = useServerFn(layoutCopilot);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [variants, setVariants] = useState<
    { key: string; label: string; sections: PageSection[]; explanation_od: string }[]
  >([]);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    loadLayout(app, page).then((s) => { setSections(s); setPicked(null); });
    setVariants([]);
    setChosen(null);
  }, [app, page]);

  async function runCopilot() {
    if (prompt.trim().length < 2) { toast.error("Kichhi likhantu — kemiti badalibe."); return; }
    setThinking(true);
    try {
      const res = await askCopilot({
        data: { app, page, prompt: prompt.trim(), sections },
      });
      const list = res.variants.map((v) => ({
        key: v.key,
        label: v.label,
        explanation_od: v.explanation_od,
        sections: (v.sections as PageSection[]).map((s, i) => ({
          ...s,
          order: i + 1,
          config: (s.config ?? {}) as SectionConfig,
        })),
      }));
      setVariants(list);
      const first = list[0];
      if (first) { setChosen(first.key); setSections(first.sections); }
      toast.success(res.ai ? "AI 3 ta design bahara kala." : "Design variant taiyar (offline mode).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI kaam kalanahin. Aau tie try karantu.");
    } finally {
      setThinking(false);
    }
  }

  function useVariant(key: string) {
    const v = variants.find((x) => x.key === key);
    if (!v) return;
    setChosen(key);
    setSections(v.sections);
    setPicked(null);
  }


  function switchApp(next: TargetApp) {
    setApp(next);
    setPage(PAGES[next][0]!.key);
  }

  function move(fromId: string, toId: string) {
    if (fromId === toId) return;
    setSections((prev) => {
      const list = [...prev];
      const from = list.findIndex((s) => s.id === fromId);
      const to = list.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0) return prev;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it!);
      return list.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  function patch(id: string, next: Partial<PageSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...next, config: { ...s.config, ...(next.config ?? {}) } } : s)));
  }

  async function publish() {
    setBusy(true);
    const err = await saveLayout(app, page, sections);
    setBusy(false);
    if (err) { toast.error(err); return; }
    toast.success("Layout is live on the app.");
  }

  function reset() {
    setSections(defaultSections(app, page));
    setPicked(null);
    toast.message("Default layout restored. Publish to make it live.");
  }

  const current = sections.find((s) => s.id === picked) ?? null;

  return (
    <section className="card-soft space-y-3 border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-bold">Visual Page Studio</p>
        <select value={app} onChange={(e) => switchApp(e.target.value as TargetApp)} className={selCls}>
          {APPS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <select value={page} onChange={(e) => setPage(e.target.value)} className={selCls}>
          {PAGES[app].map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button onClick={reset} className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
          Reset default
        </button>
        <button
          onClick={publish}
          disabled={busy}
          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish changes live"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag a block up or down inside the phone to reorder it. Tap a block to change its settings.
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="mx-auto w-[375px] max-w-full rounded-[2.2rem] border-[10px] border-foreground/85 bg-background p-2 shadow-[0_24px_50px_-24px_rgba(15,23,42,0.7)]">
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-foreground/25" />
          <div className="space-y-2">
            {sections.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDrag(s.id)}
                onDragOver={(e) => { e.preventDefault(); if (drag) move(drag, s.id); }}
                onDragEnd={() => setDrag(null)}
                onClick={() => setPicked(s.id)}
                className={`cursor-grab select-none border-2 p-2 transition ${
                  picked === s.id ? "border-primary" : "border-dashed border-border"
                } ${s.is_visible ? "" : "opacity-40"}`}
                style={{ borderRadius: `${s.config.rounded ?? 16}px` }}
              >
                <div
                  className="grid place-items-center bg-[color-mix(in_oklab,var(--color-primary)_10%,white)] text-center"
                  style={{
                    minHeight: `${s.config.height ?? 96}px`,
                    borderRadius: `${Math.max(0, (s.config.rounded ?? 16) - 4)}px`,
                  }}
                >
                  <div>
                    <p className="text-[12px] font-extrabold">{s.config.title ?? SECTION_LABELS[s.type] ?? s.type}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {s.is_visible ? "Showing" : "Hidden"} · {s.config.content ?? "auto"}
                      {s.config.height ? ` · ${s.config.height}px` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-[240px] flex-1 space-y-2 rounded-2xl border border-border p-3">
          {!current ? (
            <p className="text-xs text-muted-foreground">Tap a block inside the phone to open its settings.</p>
          ) : (
            <>
              <p className="text-sm font-bold">{SECTION_LABELS[current.type] ?? current.type}</p>
              <button
                onClick={() => patch(current.id, { is_visible: !current.is_visible })}
                className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${
                  current.is_visible ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {current.is_visible ? "👁 Showing on app" : "🚫 Hidden"}
              </button>

              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Height · {current.config.height ?? 140}px
                </span>
                <input
                  type="range"
                  min={100}
                  max={240}
                  value={current.config.height ?? 140}
                  onChange={(e) => patch(current.id, { config: { height: Number(e.target.value) } })}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Corner radius · {current.config.rounded ?? 16}px
                </span>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={current.config.rounded ?? 16}
                  onChange={(e) => patch(current.id, { config: { rounded: Number(e.target.value) } })}
                  className="w-full"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Content type</span>
                <select
                  value={current.config.content ?? "image"}
                  onChange={(e) => patch(current.id, { config: { content: e.target.value as "image" } })}
                  className={`${selCls} w-full`}
                >
                  {CONTENT.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Heading text</span>
                <input
                  value={current.config.title ?? ""}
                  onChange={(e) => patch(current.id, { config: { title: e.target.value } })}
                  placeholder={SECTION_LABELS[current.type] ?? current.type}
                  className={`${selCls} w-full`}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
