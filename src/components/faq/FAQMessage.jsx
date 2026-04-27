import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";

export default function FAQMessage({ message, botAvatar }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-bangor-red/30 shadow-sm">
          {botAvatar ? (
            <img src={botAvatar} alt="Assistant" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-bangor-red flex items-center justify-center text-white text-xs font-bold">
              DW
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
        isUser
          ? "bg-bangor-red text-white rounded-tr-sm"
          : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
      }`}>
        {message.isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Ollie is thinking…</span>
          </div>
        ) : isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-bangor-red underline">
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}