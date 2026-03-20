import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, X, MessageCircle, RotateCcw } from "lucide-react";
import FAQMessage from "@/components/faq/FAQMessage";
import FAQSuggestions from "@/components/faq/FAQSuggestions";

const PAGE_LABELS = {
  Home: "Species Search",
  SavedData: "My Data",
  DataManagement: "Data Management",
  ArcGISTools: "ArcGIS Tools",
  ClimateProjections: "Climate Data",
  MAXENTModeler: "MAXENT Modeller",
  DataPreparation: "Data Prep",
  VariableSelector: "Variable Filter",
  ModelReadinessCheck: "QC Checklist",
  ModelPerformance: "Model Performance",
  MaxentResultsMap: "Results Map",
  MaxentBatchSubmit: "Batch Submit",
  ClimateScenarioComparison: "Scenario Compare",
  Community: "Community",
};

export default function FAQBot() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const BOT_AVATAR = "https://media.base44.com/images/public/69821d606837970a4a3c0ef2/0d5777eaa_generated_image.png";

  const urlParams = new URLSearchParams(window.location.search);
  const fromPage = urlParams.get("from");
  const fromPageLabel = fromPage ? (PAGE_LABELS[fromPage] ?? fromPage) : null;

  useEffect(() => {
    startConversation();
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

  async function startConversation() {
    const conv = await base44.agents.createConversation({
      agent_name: "faq_bot",
      metadata: { name: "FAQ Session" },
    });
    setConversation(conv);
    setMessages(conv.messages ?? []);

    // If user arrived from a specific page, send a silent context primer
    if (fromPage && PAGE_LABELS[fromPage]) {
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `[CONTEXT: The user is currently on the "${PAGE_LABELS[fromPage]}" page. Please greet them and proactively offer the most useful tip or next step for that page. Keep it brief and friendly.]`,
      });
    }
  }

  async function sendMessage(text) {
    const msg = text ?? input.trim();
    if (!msg || isLoading || !conversation) return;
    setInput("");
    setShowSuggestions(false);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: msg, id: "temp-user-" + Date.now() }]);
    await base44.agents.addMessage(conversation, { role: "user", content: msg });
    setIsLoading(false);
    inputRef.current?.focus();
  }

  async function resetConversation() {
    setMessages([]);
    setConversation(null);
    setShowSuggestions(true);
    await startConversation();
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
           style={{ height: "min(85vh, 720px)" }}>

        {/* Header */}
        <div className="bg-bangor-red px-5 py-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shadow-md shrink-0">
            {BOT_AVATAR ? (
              <img src={BOT_AVATAR} alt="DataWinder Assistant" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm leading-tight">DataWinder Assistant</h2>
            <p className="text-white/70 text-xs">Bangor University · Species Distribution Modelling</p>
          </div>
          <button
            onClick={resetConversation}
            title="Start new conversation"
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
          {/* Welcome */}
          {messages.length === 0 && (
            <div className="flex gap-2.5 justify-start">
              <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-bangor-red/30 shadow-sm">
                {BOT_AVATAR ? (
                  <img src={BOT_AVATAR} alt="Assistant" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-bangor-red flex items-center justify-center text-white text-xs font-bold">
                    DW
                  </div>
                )}
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-white border border-slate-200 text-slate-700 shadow-sm">
                {fromPageLabel
              ? `👋 Hello! I'm your DataWinder assistant. I can see you've come from the ${fromPageLabel} page — loading a helpful tip for you…`
              : "👋 Hello! I'm the DataWinder assistant. I can help you with species search, climate data, MAXENT modelling, data preparation, and more. What would you like to know?"
            }
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <FAQMessage key={msg.id ?? i} message={msg} botAvatar={BOT_AVATAR} />
          ))}

          {isLoading && (
            <FAQMessage
              message={{ role: "assistant", content: "", isLoading: true }}
              botAvatar={BOT_AVATAR}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="border-t border-slate-100 pt-3 bg-white shrink-0">
            <FAQSuggestions onSelect={(q) => sendMessage(q)} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white flex gap-2 items-end shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about DataWinder…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bangor-red/30 focus:border-bangor-red/50 bg-slate-50 max-h-28 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-9 h-9 rounded-xl bg-bangor-red text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}