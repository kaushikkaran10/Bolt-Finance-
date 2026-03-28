"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "bot";
  content: string;
}

// ── Smart local fallback responses ─────────────────────────────────────────
const KNOWLEDGE_BASE: { keywords: string[]; response: string }[] = [
  {
    keywords: ["portfolio", "holdings", "diversif"],
    response: "Your portfolio shows a **74% return** vs the S&P 500's 62% over the same period 🎯\n\nKey observations:\n• **Tech overweight** — NVDA + AAPL = 38% of portfolio. Consider trimming if you want lower beta.\n• **Crypto allocation** at 24% adds high volatility but strong upside.\n• **Sharpe ratio of 1.82** is excellent — you're generating alpha efficiently.\n\nSuggestion: Add a small bond/ETF cushion (5–10%) to reduce VaR below $2,000."
  },
  {
    keywords: ["bitcoin", "btc", "crypto", "ethereum", "eth"],
    response: "**BTC Analysis** 🟠\n\nCurrent: $64,200 | ML Target: $72,000 (+12.1%)\n\nBull case:\n• Spot ETF inflows averaging $500M/day this week\n• Post-halving supply squeeze historically drives 6–12 month bull cycles\n• Institutional adoption accelerating (BlackRock, Fidelity)\n\nRisk factors:\n• Regulatory clarity still uncertain in EU\n• Correlation to risk assets during macro shocks\n\n*This is not financial advice. Always size crypto positions to your risk tolerance.*"
  },
  {
    keywords: ["nvidia", "nvda", "ai", "gpu", "chip"],
    response: "**NVIDIA (NVDA)** — ML Confidence: **94% Bullish** ⚡\n\nCurrent: $874.50 | Target: $950 (+8.6%)\n\nKey catalysts:\n• H100/H200 GPU backlog extends 12+ months\n• Blackwell architecture in mass production Q3 2025\n• Data center revenue growing 427% YoY\n• NIM software platform creates recurring revenue moat\n\nTechnical: RSI at 67 (not yet overbought), MACD crossing bullish signal line.\n\n*Position sizing note: Tech concentration already high in your portfolio.*"
  },
  {
    keywords: ["tesla", "tsla"],
    response: "**Tesla (TSLA)** — ML Confidence: **72% Bearish** 📉\n\nCurrent: $172.80 | Target: $165 (−4.5%)\n\nHeadwinds:\n• Margin pressure from global price cuts\n• EV demand slowdown in US and EU markets\n• Competition from BYD intensifying in China\n\nBull case: FSD V12.4 passed California audit — robotaxi potential remains a long-term optionality play.\n\nYou're currently down 19% on this position. Consider dollar-cost averaging or reviewing stop-loss levels."
  },
  {
    keywords: ["sharpe", "risk", "var", "beta", "drawdown", "volatility"],
    response: "**Your Risk Metrics** 📊\n\n| Metric | Value | Rating |\n|--------|-------|--------|\n| Sharpe Ratio | 1.82 | ✅ Excellent |\n| Beta | 0.94 | ✅ Good |\n| VaR 95% | −$2,491/day | ⚠️ Monitor |\n| Max Drawdown | −14.2% | ⚠️ Acceptable |\n| Herfindahl | 0.21 | ✅ Diversified |\n\nYour Sharpe ratio of **1.82** is well above the 1.0 benchmark, meaning you're generating strong risk-adjusted returns. Keep it above 1.5 by rebalancing if any single position grows beyond 25%."
  },
  {
    keywords: ["rsi", "macd", "bollinger", "technical", "indicator", "chart", "candlestick"],
    response: "**Technical Analysis Primer** 📈\n\n**RSI (Relative Strength Index)**\n• > 70 = Overbought (consider selling)\n• < 30 = Oversold (consider buying)\n• Current NVDA RSI: 67 — approaching overbought\n\n**MACD** — Momentum indicator\n• Bullish when MACD line crosses above signal line\n• NVDA shows bullish crossover this week ✅\n\n**Bollinger Bands**\n• Price near upper band = potential reversal\n• Price near lower band = potential bounce\n\nCombining all three gives stronger confluence signals. Want me to run a scan on any specific ticker?"
  },
  {
    keywords: ["learn", "beginner", "start", "basics", "course", "module"],
    response: "**Recommended Learning Path for You** 📚\n\nBased on your profile (Level 4, Quantitative Analyst):\n\n1. ✅ **Market Fundamentals** — Completed\n2. ✅ **Financial Statements** — Completed  \n3. 🔄 **Technical Analysis 101** — 65% complete (resume this!)\n4. 🔒 **RSI, MACD & Bollinger Bands** — Unlocks after TA 101\n5. 🔒 **Options Greeks** — Phase 3\n\n**Next action:** Resume *Candlestick Charts & Patterns* to earn 150 XP and unlock the next module.\n\nYou're only 355 XP away from Level 5! 🚀"
  },
  {
    keywords: ["prediction", "arena", "compete", "leaderboard"],
    response: "**Prediction Arena Stats** 🎯\n\nYour current standing:\n• **Rank:** #5 globally (top 15%!)\n• **Accuracy:** 76% (22/29 correct)\n• **Streak:** 2 consecutive wins 🔥\n\nTop tip to improve accuracy:\n1. Only predict when ML confidence is > 80%\n2. Combine sentiment from News Intelligence before submitting\n3. Avoid TSLA — historically difficult to predict short-term\n\nSubmitting accurate predictions earns you **+50 XP** and moves you up the leaderboard. Want to make a prediction now?"
  },
  {
    keywords: ["hello", "hi", "hey", "help", "what can you"],
    response: "Hello! I'm **FinAI**, your NovaX financial advisor powered by Gemini 1.5 Flash 🤖\n\nI can help you with:\n• 📊 **Portfolio analysis** — P&L, risk metrics, allocation\n• 📈 **Stock insights** — NVDA, TSLA, AAPL, BTC, ETH\n• 🎯 **Prediction Arena** — tips to improve your accuracy\n• 📚 **Learning Edge** — recommend your next course\n• ⚠️ **Risk management** — Sharpe, VaR, diversification\n\nWhat would you like to explore? *Note: AI advisor is in demo mode — connect the backend to enable live Gemini streaming.*"
  },
  {
    keywords: ["apple", "aapl"],
    response: "**Apple Inc. (AAPL)** — ML Confidence: **81% Bullish** 🍎\n\nCurrent: $186.40 | Target: $195 (+4.6%)\n\nKey catalysts:\n• **$110B buyback** — largest in corporate history\n• iPhone 16 Pro cycle showing stronger-than-expected demand\n• Apple Intelligence (on-device AI) differentiating iOS\n• Services revenue growing at 14% YoY\n\nTechnical: Trading above 50-day and 200-day moving averages — strong trend intact.\n\nYou hold **45.5 shares** @ avg $182.40, currently +2.2% in the green ✅"
  },
];

function generateResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const kb of KNOWLEDGE_BASE) {
    if (kb.keywords.some(kw => lower.includes(kw))) {
      return kb.response;
    }
  }
  return `I understand you're asking about *"${input}"*.\n\nYou can ask me anything about:\n\n• **Your portfolio** — NVDA, AAPL, TSLA, BTC, ETH, SPY\n• **Risk metrics** — Sharpe, Beta, VaR, drawdown\n• **Technical analysis** — RSI, MACD, Bollinger Bands\n• **Prediction Arena** — tips and leaderboard\n• **Learning Edge** — course recommendations\n\nTry: *"Analyze my NVDA position"* or *"What is my portfolio risk?"*`;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Hello! I am **FinAI**, your NovaX AI Advisor powered by Gemini 1.5 Flash.\n\nI can analyze your portfolio, explain risk metrics, give stock insights, and guide your learning journey.\n\nWhat would you like to explore today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  // Build conversation history for multi-turn context
  const buildHistory = (msgs: Message[]) =>
    msgs.slice(1).filter(m => m.content.trim()).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

  // Typewriter effect: animates response char-by-char
  const typewrite = async (text: string) => {
    const delay = Math.max(8, Math.min(18, 1000 / text.length));
    for (let i = 1; i <= text.length; i++) {
      const partial = text.slice(0, i);
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = { role: "bot", content: partial };
        return arr;
      });
      await new Promise(r => setTimeout(r, delay));
    }
  };

  const handleSend = async (msgOverride?: string) => {
    const userMessage = (msgOverride || input).trim();
    if (!userMessage || isTyping) return;

    setInput("");
    const history = buildHistory(messages);
    setMessages(prev => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "bot", content: "" },
    ]);
    setIsTyping(true);

    let responseText = "";

    // ── 1. Gemini via Next.js /api/chat ───────────────────────────────────────
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        // ✅ Gemini responded successfully
        responseText = data.response;
      } else if (res.status === 429) {
        // Rate limited — show friendly message
        responseText = "⏳ **Rate limit reached** (free tier: 15 requests/min).\n\nPlease wait about a minute and try again. Your API key has full access to Gemini — the free tier just caps request frequency.\n\n*Tip: Gemini 2.0 Flash and 2.5 Flash are both available on your key.*";
      } else {
        console.error("Gemini /api/chat error:", data.error, data.message ?? data.detail ?? "");
      }
    } catch (err) {
      console.error("Fetch /api/chat failed:", err);
    }

    // ── 2. Local KB fallback (only if Gemini completely unreachable) ──────────
    if (!responseText) {
      responseText = generateResponse(userMessage);
    }

    // Animate the response in char-by-char
    await typewrite(responseText);
    setIsTyping(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const QUICK_PROMPTS = ["Analyze my portfolio risk", "NVDA stock outlook", "How do I improve my prediction accuracy?"];

  // Simple markdown-ish renderer for bold/newlines
  function renderText(text: string) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : part
      );
      return <p key={i} className={line === "" ? "h-2" : ""}>{parts}</p>;
    });
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 w-14 h-14 bg-brand text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] transition-all z-50 hover:scale-105 ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-8 right-8 w-[400px] max-h-[620px] h-[82vh] glass-panel border border-white/10 rounded-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right shadow-2xl overflow-hidden ${isOpen ? "scale-100 opacity-100" : "scale-75 opacity-0 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">NovaX Advisor <Sparkles className="w-3 h-3 text-brand" /></div>
              <div className="text-xs text-brand font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> Online
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl p-4 text-sm space-y-1 ${
                msg.role === "user"
                  ? "bg-brand text-black rounded-tr-sm font-medium"
                  : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm leading-relaxed"
              }`}>
                {msg.role === "bot" ? renderText(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 rounded-tl-sm flex gap-1">
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => handleSend(p)}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-brand/20 text-brand bg-brand/5 hover:bg-brand/10 transition-colors font-mono">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-md flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about market strategies..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder-gray-600"
            />
            <button
              onClick={() => handleSend()}
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-brand disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-brand/10 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[10px] text-gray-500 font-mono text-center mt-2">
            Powered by Gemini 1.5 Flash
          </div>
        </div>
      </div>
    </>
  );
}
