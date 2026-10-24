import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function HomeChat({ userId, cartVisible }: { userId?: string | null; cartVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: "ନମସ୍କାର! 👋 I'm ThelaWala Care. Ask me about your order, bill, refund or anything else!"
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, open]);

  function openChat() {
    setOpen(true);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setBusy(true);

    setTimeout(() => {
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: `Thank you for your query: "${text}". Our customer support assistant is checking your order details right now!`
        }
      ]);
      setBusy(false);
    }, 1000);
  }

  return (
    <>
      {/* Floating Chat Button with Orange Glow Theme */}
      <button
        onClick={openChat}
        aria-label="Chat with ThelaWala Care"
        className={`fixed z-40 right-4 ${
          cartVisible ? "bottom-[130px]" : "bottom-[80px]"
        } w-14 h-14 rounded-full orange-glow-btn flex items-center justify-center text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95`}
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Chat Window with Liquid Glass Concierge Theme */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] glass-concierge rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
            
            {/* Header */}
            <div className="bg-orange-500/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between border-b border-orange-400/30 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner font-bold text-lg">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">ThelaWala Care</h3>
                  <p className="text-[11px] text-orange-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online · replies instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-orange-500 text-white rounded-br-none shadow-orange-500/20"
                        : "glass-chat-bubble text-gray-800 rounded-bl-none border border-orange-100"
                    }`}
                  >
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="glass-chat-bubble rounded-2xl px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white/70 backdrop-blur-md border-t border-orange-100 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask about your order..."
                className="flex-1 bg-white/80 border border-orange-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-800 placeholder:text-gray-400"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="w-10 h-10 rounded-full orange-glow-btn flex items-center justify-center text-white disabled:opacity-50 transition-all shrink-0"
              >
                ➤
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
