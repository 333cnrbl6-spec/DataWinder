import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, X, ChevronDown, RotateCcw, Wrench, Bug, Lightbulb, Zap, AlertTriangle } from "lucide-react";
import FAQMessage from "@/components/faq/FAQMessage";

const QUICK_ACTIONS = [
  { icon: Bug, label: "Report a bug", msg: "I want to report a bug I found." },
  { icon: AlertTriangle, label: "Found a glitch", msg: "I found a visual glitch or UI issue." },
  { icon: Lightbulb, label: "Suggest a feature", msg: "I have a feature suggestion or improvement idea." },
  { icon: Zap, label: "Help me repair this", msg: "Help me repair this — something isn't working and I'd like help fixing it." },
];

export default function FeedbackBot({ currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShowTooltip(true), 5000);
    const t2 = setTimeout(() => setShowTooltip(false), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages ?? []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  async function openPanel() {
    setIsOpen(true);
    setShowTooltip(false);
    if (initialised) return;
    setInitialised(true);
    setIsLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "beta_tester_bot",
      metadata: { name: `Beta Feedback — ${currentPageName || "App"}` },
    });
    setConversation(conv);
    setMessages(conv.messages ?? []);
    await base44.agents.addMessage(conv, {
      role: "user",
      content: `[CONTEXT: Beta tester is currently on the "${currentPageName || 'App'}" page. Greet them briefly as a QA helper, remind them this chat is FREE and doesn't use credits, and invite them to report a bug, glitch, or suggestion — or use 'Help me repair this' if something is broken. 2-3 sentences max.]`,
    });
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage(text) {
    const msg = text ?? input.trim();
    if (!msg || isLoading || !conversation) return;
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: msg, id: "temp-" + Date.now() }]);
    await base44.agents.addMessage(conversation, { role: "user", content: msg });
    setIsLoading(false);
    inputRef.current?.focus();
  }

  async function resetConversation() {
    setMessages([]);
    setConversation(null);
    setIsLoading(false);
    setInitialised(true);
    setIsLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "beta_tester_bot",
      metadata: { name: `Beta Feedback — ${currentPageName || "App"}` },
    });
    setConversation(conv);
    setMessages(conv.messages ?? []);
    await base44.agents.addMessage(conv, {
      role: "user",
      content: `[CONTEXT: Beta tester started a new session on "${currentPageName || 'App'}". Greet them briefly and invite new feedback. 1-2 sentences.]`,
    });
    setIsLoading(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const visibleMessages = messages.filter(
    (m) => !(m.role === "user" && m.content?.startsWith("[CONTEXT:"))
  );

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">

      {/* Panel */}
      {isOpen && (
        <div
          className="w-80 sm:w-96 flex flex-col bg-white rounded-2xl shadow-2xl border-2 border-amber-400 overflow-hidden"
          style={{ height: "min(70vh, 540px)" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs leading-tight">🚧 Beta Tester Hub</p>
              <p className="text-white/70 text-xs">Report bugs · Suggest features · FREE</p>
            </div>
            <button onClick={resetConversation} title="New report"
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsOpen(false)} title="Close"
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* FREE badge */}
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">FREE</span>
            <span className="text-xs text-amber-700">This bot doesn't use credits — report freely!</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {visibleMessages.length === 0 && !isLoading && (
              <div className="space-y-3">
                <div className="flex gap-2 justify-start">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="max-w-[85%] bg-white border border-amber-200 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-slate-600 shadow-sm">
                    🚧 Welcome to the Beta Tester Hub! Found something broken? Got a great idea? I'm here to help — and it won't cost you any credits.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pl-9">
                  {QUICK_ACTIONS.map(({ icon: Icon, label, msg }) => (
                    <button
                      key={label}
                      onClick={() => sendMessage(msg)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 hover:border-amber-400 transition-all duration-200 text-left"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span className="leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {visibleMessages.map((msg, i) => (
              <FAQMessage
                key={msg.id ?? i}
                message={msg}
                botAvatar={null}
                botIcon={<Wrench className="w-4 h-4 text-amber-600" />}
                botColor="bg-amber-100 border-amber-200"
              />
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="shrink-0 w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <div className="bg-white border border-amber-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick repair button when conversation active */}
          {visibleMessages.length > 0 && (
            <div className="border-t border-amber-100 px-3 py-2 bg-amber-50 flex gap-2">
              <button
                onClick={() => sendMessage("Help me repair this — something isn't working and I need help diagnosing and fixing it.")}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Help me repair this
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-amber-200 px-3 py-2.5 bg-white flex gap-2 items-end shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a bug, glitch, or idea…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-amber-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/50 bg-slate-50 max-h-20 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {!isOpen && showTooltip && (
        <div className="relative bg-white border-2 border-amber-300 shadow-xl rounded-2xl px-4 py-3 text-xs text-slate-700 max-w-[200px] text-center ml-2">
          🚧 Beta tester? Report bugs &amp; ideas here — it's FREE!
          <div className="absolute bottom-[-6px] left-8 w-3 h-3 bg-white border-r-2 border-b-2 border-amber-300 rotate-45" />
        </div>
      )}

      {/* Trigger button — toolbox/construction style */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : openPanel}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-14 h-14 rounded-2xl shadow-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 flex items-center justify-center transition-all duration-200 hover:scale-110 ring-4 ring-amber-200"
        aria-label="Beta tester feedback"
        style={{ animation: isOpen ? 'none' : 'toolboxPulse 3s ease-in-out infinite' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Wrench className="w-6 h-6 text-white" />
          <span className="text-white text-[8px] font-bold leading-none">BETA</span>
        </div>
      </button>

      <style>{`
        @keyframes toolboxPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4), 0 10px 25px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0), 0 10px 25px rgba(0,0,0,0.2); }
        }
      `}</style>
    </div>
  );
}