import { useEffect, useRef, useState } from "react";
import { openLoginModal } from "@/components/LoginModal";
import { askHomeBot } from "@/lib/homebot.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function HomeChat({ userId }: { userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: "ନମସ୍କାର! 👋 I'm ThelaWala Care. Ask me about your order, bill, refund or anything else!",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, open]);

  function openChat() {
    if (!userId) {
      openLoginModal();
      return;
    }
    setOpen(true);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await askHomeBot({
        data: {
          message: text,
          history: next.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Sorry, something went wrong. Please call care on 9078492360." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={openChat}
        aria-label="Chat with ThelaWala Care"
        className="press pop-in fixed bottom-[180px] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-2xl shadow-[0_16px_32px_-12px_var(--color-primary)]"
      >
        💬
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-destructive" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="rise-in mx-auto flex h-[75dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[2rem] bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brand-header flex items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-card/25 text-xl">🤖</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold leading-tight">ThelaWala Care</p>
                <p className="flex items-center gap-1 text-[11px] font-semibold opacity-85">
                  <span className="live-dot" /> Online · replies instantly
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="press grid h-9 w-9 place-items-center rounded-full bg-card/25 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.map((m, i) =>
                m.role === "assistant" ? (
                  <div key={i} className="mr-10 text-[13px] leading-relaxed text-foreground">
                    {m.content}
                  </div>
                ) : (
                  <div key={i} className="ml-10 flex justify-end">
                    <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground">
                      {m.content}
                    </div>
                  </div>
                ),
              )}
              {busy ? <p className="text-[12px] font-semibold text-muted-foreground">Typing…</p> : null}
              <div ref={endRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                placeholder="Ask about your order…"
                className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
              />
              <button
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M4 12l16-8-5 16-3.5-6L4 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
