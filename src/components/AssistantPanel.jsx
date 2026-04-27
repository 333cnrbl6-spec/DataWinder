import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, RotateCcw, ChevronDown } from "lucide-react";
import FAQMessage from "@/components/faq/FAQMessage";

const BOT_AVATAR = "https://media.base44.com/images/public/69821d606837970a4a3c0ef2/317bea612_generated_image.png";

const PAGE_CHIPS = {
  Home: [
    "How do I get an IUCN API token?",
    "What can I do without an IUCN token?",
    "How do I search for a species?",
    "What data sources does the search use?",
  ],
  SavedData: [
    "How do I create a species list?",
    "Can I share my saved data?",
    "How do I export my saved species?",
  ],
  DataManagement: [
    "How do I merge duplicate records?",
    "What does the taxonomy check do?",
    "How do I import species data?",
  ],
  ArcGISTools: [
    "How do buffer analysis works?",
    "What is a spatial join?",
    "How do I overlay species ranges?",
  ],
  ClimateProjections: [
    "What climate datasets are available?",
    "What are SSP scenarios?",
    "Which dataset is best for MAXENT?",
  ],
  MAXENTModeler: [
    "How do I set up a MAXENT run?",
    "What is regularisation multiplier?",
    "Which feature types should I use?",
  ],
  DataPreparation: [
    "What is spatial thinning?",
    "How do I export occurrence data?",
    "What formats does MAXENT accept?",
  ],
  VariableSelector: [
    "How do I choose climate variables?",
    "What is multicollinearity?",
    "How many variables should I use?",
  ],
  ModelReadinessCheck: [
    "What checks does the QC run?",
    "How many occurrences do I need?",
    "What does 'model ready' mean?",
  ],
  ModelPerformance: [
    "What is AUC score?",
    "What is a good TSS value?",
    "How do I interpret the ROC curve?",
  ],
  MaxentResultsMap: [
    "How do I read the suitability map?",
    "What do the colour ranges mean?",
    "Can I export the results map?",
  ],
  MaxentBatchSubmit: [
    "How do I set up a batch run?",
    "Can I run multiple species at once?",
    "How do I track job progress?",
  ],
  ClimateScenarioComparison: [
    "How do I compare SSP scenarios?",
    "What does habitat gain/loss mean?",
    "How do I interpret the overlap map?",
  ],
  Community: [
    "How do I join the community?",
    "What is a Founding Member?",
    "Can I share my species lists?",
  ],
};

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

export default function AssistantPanel({ currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const pageLabel = PAGE_LABELS[currentPageName] ?? currentPageName;

  // Show tooltip on mount briefly
  useEffect(() => {
    const t1 = setTimeout(() => setShowTooltip(true), 2500);
    const t2 = setTimeout(() => setShowTooltip(false), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages ?? []);
    });
    return unsubscribe;
  }, [conversation?.id]);

  // Initialise conversation when panel first opened
  async function openPanel() {
    setIsOpen(true);
    setShowTooltip(false);
    if (initialised) return;
    setInitialised(true);
    setIsLoading(true);

    const conv = await base44.agents.createConversation({
      agent_name: "faq_bot",
      metadata: { name: `Help: ${pageLabel}` },
    });
    setConversation(conv);
    setMessages(conv.messages ?? []);

    // Send silent context primer — on Home page, check for missing IUCN token
    if (currentPageName === 'Home') {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) {}
      const hasToken = !!user?.iucn_api_token;
      const primer = hasToken
        ? `[CONTEXT: The user is on the Species Search page and has an IUCN API token configured. Welcome them warmly and offer one practical tip about searching for species. Keep it to 2-3 sentences.]`
        : `[CONTEXT: The user is on the Species Search page and does NOT yet have an IUCN API token. Welcome them warmly to DataWinder, briefly explain that connecting an IUCN token unlocks the full Red List conservation data, and give them a short 3-step guide: (1) visit https://www.iucnredlist.org/ and create a free account or log in, (2) go to their profile/account page to find their API token, (3) paste it into their DataWinder profile settings. Keep it friendly and encouraging — mention they can still explore iNaturalist and GBIF data right now without a token. 4-5 sentences max.]`;
      await base44.agents.addMessage(conv, { role: "user", content: primer });
    } else if (currentPageName && PAGE_LABELS[currentPageName]) {
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `[CONTEXT: The user is currently on the "${pageLabel}" page. Please greet them warmly and offer one concise, practical tip or next step for this page. Keep it to 2-3 sentences.]`,
      });
    }

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
    // Re-init fresh — bypass the initialised guard by running init inline
    setInitialised(true);
    setIsOpen(true);
    setIsLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "faq_bot",
      metadata: { name: `Help: ${pageLabel}` },
    });
    setConversation(conv);
    setMessages(conv.messages ?? []);
    if (currentPageName === 'Home') {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) {}
      const hasToken = !!user?.iucn_api_token;
      const primer = hasToken
        ? `[CONTEXT: The user is on the Species Search page and has an IUCN API token configured. Welcome them warmly and offer one practical tip about searching for species. Keep it to 2-3 sentences.]`
        : `[CONTEXT: The user is on the Species Search page and does NOT yet have an IUCN API token. Welcome them warmly to DataWinder, briefly explain that connecting an IUCN token unlocks the full Red List conservation data, and give them a short 3-step guide: (1) visit https://www.iucnredlist.org/ and create a free account or log in, (2) go to their profile/account page to find their API token, (3) paste it into their DataWinder profile settings. Keep it friendly and encouraging — mention they can still explore iNaturalist and GBIF data right now without a token. 4-5 sentences max.]`;
      await base44.agents.addMessage(conv, { role: "user", content: primer });
    } else if (currentPageName && PAGE_LABELS[currentPageName]) {
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `[CONTEXT: The user is currently on the "${pageLabel}" page. Please greet them warmly and offer one concise, practical tip or next step for this page. Keep it to 2-3 sentences.]`,
      });
    }
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter out the silent context primer messages from display
  const visibleMessages = messages.filter(
    (m) => !(m.role === "user" && m.content?.startsWith("[CONTEXT:"))
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* Panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
             style={{ height: "min(70vh, 540px)" }}>

          {/* Header */}
          <div className="bg-bangor-red px-4 py-3 flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/40 shrink-0">
              <img src={BOT_AVATAR} alt="Assistant" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs leading-tight">Ollie — Research Assistant</p>
              {currentPageName && PAGE_LABELS[currentPageName] && (
                <p className="text-white/60 text-xs truncate">Helping with: {pageLabel}</p>
              )}
            </div>
            <button onClick={resetConversation} title="New conversation"
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsOpen(false)} title="Close"
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
            {visibleMessages.length === 0 && !isLoading && (
              <div className="space-y-3">
                <div className="flex gap-2 justify-start">
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-bangor-red/30">
                    <img src={BOT_AVATAR} alt="Assistant" className="w-full h-full object-cover" />
                  </div>
                  <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-slate-600 shadow-sm">
                    👋 Hi! I'm Ollie, your conservation research assistant. Ask me anything about this page or the platform.
                  </div>
                </div>
                {PAGE_CHIPS[currentPageName] && (
                  <div className="pl-9">
                    <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Quick questions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PAGE_CHIPS[currentPageName].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => sendMessage(chip)}
                          className="text-xs px-2.5 py-1 rounded-full bg-bangor-red/10 border border-bangor-red/20 text-bangor-red hover:bg-bangor-red hover:text-white transition-all duration-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {visibleMessages.map((msg, i) => (
              <FAQMessage key={msg.id ?? i} message={msg} botAvatar={BOT_AVATAR} />
            ))}

            {isLoading && (
              <FAQMessage message={{ role: "assistant", content: "", isLoading: true }} botAvatar={BOT_AVATAR} />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 px-3 py-2.5 bg-white flex gap-2 items-end shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bangor-red/30 focus:border-bangor-red/50 bg-slate-50 max-h-20 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-xl bg-bangor-red text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {!isOpen && showTooltip && (
        <div className="relative bg-white border border-slate-200 shadow-xl rounded-2xl px-4 py-3 text-xs text-slate-700 max-w-[200px] text-center">
          👋 Need help with {pageLabel ? pageLabel.toLowerCase() : "the app"}?
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
        </div>
      )}

      {/* Trigger bubble */}
      <button
        onClick={isOpen ? () => setIsOpen(false) : openPanel}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-40 h-40 rounded-full shadow-2xl border-4 border-bangor-red overflow-hidden hover:scale-110 transition-transform duration-200 bg-white ring-4 ring-bangor-red/20"
        aria-label="Toggle assistant"
        style={{ animation: isOpen ? 'none' : 'botFloat 3s ease-in-out infinite' }}
      >
        <img src={BOT_AVATAR} alt="Assistant" className="w-full h-full object-cover object-top" />
      </button>

      <style>{`
        @keyframes botFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}