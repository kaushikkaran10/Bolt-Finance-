"use client";

import { Send, Hash, Users, TrendingUp, Globe2, SmilePlus, Reply, WifiOff, Wifi } from "lucide-react";
import { useState, useEffect, useRef, KeyboardEvent } from "react";

// ── Types ───────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  username: string;
  av: string;  // 2-char initials
  content: string;
  timestamp: Date;
  isOwn?: boolean;
  reactions?: { emoji: string; count: number }[];
  channel: string;
}

// ── Channels ────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: "general",    label: "general",        icon: Hash },
  { id: "trading",    label: "trading-signals", icon: TrendingUp },
  { id: "defi",       label: "defi-yields",     icon: Globe2 },
  { id: "off-topic",  label: "off-topic",       icon: Hash },
];

// ── Online members ───────────────────────────────────────────────────────────
const ONLINE_MEMBERS = [
  { name: "quant_wizard",   av: "QW", status: "online" },
  { name: "satoshi_99",     av: "S9", status: "online" },
  { name: "algo_trader",    av: "AT", status: "idle"   },
  { name: "neural_net",     av: "NN", status: "online" },
  { name: "defi_dave",      av: "DD", status: "online" },
  { name: "market_maker_x", av: "MM", status: "idle"   },
];

// ── Seed messages per channel ────────────────────────────────────────────────
function seedMessages(channel: string): ChatMsg[] {
  const seeds: Record<string, Omit<ChatMsg, "id" | "channel" | "isOwn">[]> = {
    general: [
      { username: "quant_wizard",   av: "QW", content: "gm everyone 🌅 ready for another volatile day?",                                        timestamp: new Date(Date.now() - 1000*60*12), reactions: [{ emoji: "☀️", count: 4 }] },
      { username: "satoshi_99",     av: "S9", content: "Fed speakers at 2pm EST — going to be choppy into the close.",                            timestamp: new Date(Date.now() - 1000*60*10) },
      { username: "neural_net",     av: "NN", content: "BTC holding above $64k support very cleanly, very bullish structure on the 4H.",          timestamp: new Date(Date.now() - 1000*60*7),  reactions: [{ emoji: "🔥", count: 6 }, { emoji: "✅", count: 3 }] },
      { username: "algo_trader",    av: "AT", content: "Anyone else loading up on NVDA calls for the next earnings?",                             timestamp: new Date(Date.now() - 1000*60*5) },
      { username: "defi_dave",      av: "DD", content: "NVDA is insane. 427% datacentre revenue growth YoY. This thing has no ceiling right now.", timestamp: new Date(Date.now() - 1000*60*3),  reactions: [{ emoji: "🚀", count: 9 }] },
      { username: "market_maker_x", av: "MM", content: "Don't sleep on MSTR either. Every BTC dip is a MSTR yolo opportunity lol",               timestamp: new Date(Date.now() - 1000*60*1) },
    ],
    trading: [
      { username: "quant_wizard",   av: "QW", content: "📊 AAPL RSI hit 68 — approaching overbought zone. Watch for rejection at $192.",          timestamp: new Date(Date.now() - 1000*60*20) },
      { username: "algo_trader",    av: "AT", content: "SPY 520 calls feel free. CPI print inline, no reason to sell.",                            timestamp: new Date(Date.now() - 1000*60*15), reactions: [{ emoji: "👀", count: 4 }] },
      { username: "neural_net",     av: "NN", content: "TSLA breakdown confirmed. Target $160 if it loses $170 support on close.",                  timestamp: new Date(Date.now() - 1000*60*8) },
    ],
    defi: [
      { username: "defi_dave",      av: "DD", content: "Aave V3 on Arbitrum is yielding 8.4% on USDC right now. Better than most TradFi.",         timestamp: new Date(Date.now() - 1000*60*30) },
      { username: "satoshi_99",     av: "S9", content: "Uniswap V4 hooks are going to change everything for concentrated liquidity.",              timestamp: new Date(Date.now() - 1000*60*18), reactions: [{ emoji: "🤝", count: 3 }] },
    ],
    "off-topic": [
      { username: "market_maker_x", av: "MM", content: "Anyone watching the Knicks game tonight? 😂",                                             timestamp: new Date(Date.now() - 1000*60*40) },
      { username: "quant_wizard",   av: "QW", content: "nah I'm backtesting a mean-reversion strat instead, this is my life now",                  timestamp: new Date(Date.now() - 1000*60*35), reactions: [{ emoji: "💀", count: 7 }] },
    ],
  };
  return (seeds[channel] || []).map((m, i) => ({ ...m, id: `seed-${channel}-${i}`, channel, isOwn: false }));
}

const EMOJIS = ["🔥", "🚀", "✅", "👀", "💀", "🤝", "☀️", "📊"];

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CommunityPage() {
  const [activeChannel, setActiveChannel] = useState("general");
  const [allMessages, setAllMessages] = useState<ChatMsg[]>(() => CHANNELS.flatMap(c => seedMessages(c.id)));
  const [input, setInput] = useState("");
  const [myUsername] = useState(() => `User_${Math.floor(Math.random() * 9000) + 1000}`);
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [hoverMsg, setHoverMsg] = useState<string | null>(null);
  const [typingBots, setTypingBots] = useState<string[]>([]);
  const lastProcessedMsgRef = useRef<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load channel seed messages
  const channelMessages = allMessages.filter(m => m.channel === activeChannel);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages]);

  // Attempt WebSocket — gracefully fail to demo mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/community";
      const token = localStorage.getItem("novax_token") || "";
      const socket = new WebSocket(`${wsUrl}?room=${activeChannel}&username=${myUsername}${token ? `&token=${token}` : ""}`);
      const timeout = setTimeout(() => { socket.close(); }, 3000);

      socket.onopen = () => {
        clearTimeout(timeout);
        setIsConnected(true);
        socket.send(JSON.stringify({ type: "get_history" }));
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "history" && data.messages) {
            const mapped: ChatMsg[] = data.messages.map((m: { user_id?: string; username?: string; content?: string; message?: string; timestamp: string }, i: number) => ({
              id: `ws-${i}`, username: m.username || "Unknown", av: (m.username || "??").substring(0, 2).toUpperCase(),
              content: m.content || m.message || "", timestamp: new Date(m.timestamp), channel: activeChannel, isOwn: m.username === myUsername,
            }));
            setAllMessages(prev => [
              ...prev.filter(m => m.channel !== activeChannel),
              ...mapped,
            ]);
          } else if (data.type === "message") {
            const msg: ChatMsg = {
              id: `ws-live-${Date.now()}`, username: data.username || "Unknown",
              av: (data.username || "??").substring(0, 2).toUpperCase(),
              content: data.content || data.message || "", timestamp: new Date(data.timestamp || Date.now()),
              channel: activeChannel, isOwn: data.username === myUsername,
            };
            setAllMessages(prev => [...prev, msg]);
          }
        } catch { /* ignore */ }
      };
      socket.onclose = () => setIsConnected(false);
      ws.current = socket;
      return () => { clearTimeout(timeout); socket.close(); };
    } catch { /* demo mode */ }
  }, [activeChannel, myUsername]);

  // Chatbot Reply Logic (Hardcoded responses)
  useEffect(() => {
    const channelMessages = allMessages.filter(m => m.channel === activeChannel);
    if (!channelMessages.length) return;
    const lastMsg = channelMessages[channelMessages.length - 1];
    
    // Only trigger if it's a new user message
    if (lastMsg.isOwn && lastMsg.id !== lastProcessedMsgRef.current) {
      lastProcessedMsgRef.current = lastMsg.id;
      
      const bots = ONLINE_MEMBERS.filter(m => m.status === "online");
      const bot = bots[Math.floor(Math.random() * bots.length)];
      
      const BOT_REPLIES = [
        "Haha exactly what I thought.",
        "Wouldn't bet on it right now, market is too choppy tbh.",
        "Did you see the latest CPI print though?",
        "Same, honestly.",
        "I'm just holding spot BTC, no leverage for me today.",
        "NVDA calls are printing today ngl 💸",
        "Interesting take... but volume is dropping off.",
        "I got stopped out holding that yesterday 💀",
        "Agreed. 100%.",
        "Watch the 4H close before committing size here.",
        "Based.",
        "Anyone got the alpha on the new Arbitrum yields?",
        "Just DCA and vibe.",
        "Could be a liquidity grab before the real move down.",
        "This is why you don't fight the trend.",
        "For sure, you're not wrong.",
        "Wait for Powell to speak first lol",
      ];
      const randomReply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];

      // Wait 1-3 seconds randomly before replying
      const delay = Math.floor(Math.random() * 2000) + 1000;
      setTypingBots(prev => [...prev, bot.name]);

      setTimeout(() => {
        setAllMessages(prev => [...prev, {
          id: `bot-${Date.now()}`, username: bot.name, av: bot.av,
          content: randomReply, timestamp: new Date(), channel: activeChannel, isOwn: false
        }]);
        setTypingBots(prev => prev.filter(n => n !== bot.name));
      }, delay);
    }
  }, [allMessages, activeChannel]);

  // Passive Bot dropping random observations
  useEffect(() => {
    const passiveInterval = setInterval(() => {
       const bots = ONLINE_MEMBERS.filter(m => m.status === "online");
       const bot = bots[Math.floor(Math.random() * bots.length)];
       
       const BOT_OBSERVATIONS = [
        "BTC looking super heavy here at resistance.",
        "Is it just me, or does the tape feel completely rigged today?",
        "Just bought the dip on SOL. Let's send it. 🚀",
        "If SPY loses 510 it's going into freefall.",
        "ETH gas fees are finally reasonable for once.",
        "Just closed my shorts. Not fighting this trend anymore.",
        "Waiting for Powell to speak before placing any trades.",
        "Yields are up again, equities probably going to suffer.",
        "Who is actually buying these mid-curve NFTs right now? 😂",
        "Market feels completely exhausted.",
        "Massive block trade on MSFT just printed.",
        "Can't believe TSLA is this cheap vs historical averages.",
       ];
       const randomObs = BOT_OBSERVATIONS[Math.floor(Math.random() * BOT_OBSERVATIONS.length)];

       setTypingBots(prev => [...prev, bot.name]);
       setTimeout(() => {
         setAllMessages(prev => [...prev, {
           id: `bot-passive-${Date.now()}`, username: bot.name, av: bot.av,
           content: randomObs, timestamp: new Date(), channel: activeChannel, isOwn: false
         }]);
         setTypingBots(prev => prev.filter(n => n !== bot.name));
       }, 1500); // Type for 1.5 seconds pseudo-realism
    }, 25000); // 25 seconds

    return () => clearInterval(passiveInterval);
  }, [activeChannel]);

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const msg: ChatMsg = {
      id: `local-${Date.now()}`, username: myUsername,
      av: myUsername.substring(0, 2).toUpperCase(),
      content: input.trim(), timestamp: new Date(), channel: activeChannel, isOwn: true,
    };

    // Try WebSocket first
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "message", content: input.trim() }));
    }
    // Always add locally so UI is instant
    setAllMessages(prev => [...prev, msg]);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const addReaction = (msgId: string, emoji: string) => {
    setAllMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions?.find(r => r.emoji === emoji);
      if (existing) {
        return { ...m, reactions: m.reactions?.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r) };
      }
      return { ...m, reactions: [...(m.reactions || []), { emoji, count: 1 }] };
    }));
    setShowEmojiPicker(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-6rem)] flex rounded-2xl overflow-hidden border border-white/5 glass-panel animate-in fade-in duration-500">

      {/* ── Channel List (left sidebar) ────────────────────────────────────── */}
      <div className="w-60 flex-shrink-0 border-r border-white/5 bg-black/40 flex flex-col">
        {/* Server name */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <span className="font-bold text-white text-sm">NovaX Community</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-brand animate-pulse" : "bg-gray-600"}`} title={isConnected ? "Live" : "Demo mode"} />
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-2">Channels</div>
          {CHANNELS.map(ch => {
            const Icon = ch.icon;
            const unread = allMessages.filter(m => m.channel === ch.id && !m.isOwn).slice(-1);
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeChannel === ch.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{ch.label}</span>
                {unread.length > 0 && activeChannel !== ch.id && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* My identity at bottom */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-xs text-brand font-bold flex-shrink-0">
            {myUsername.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{myUsername}</div>
            <div className="text-[10px] text-brand font-mono">● Online</div>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-white">{CHANNELS.find(c => c.id === activeChannel)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${isConnected ? "border-brand/20 bg-brand/5 text-brand" : "border-white/10 text-gray-500"}`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "Live" : "Demo"}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-4 h-4" />
              <span>{ONLINE_MEMBERS.filter(m => m.status === "online").length} online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {channelMessages.map((msg, i) => {
            const isOwn = msg.isOwn;
            const showHeader = i === 0 || channelMessages[i - 1].username !== msg.username;

            return (
              <div
                key={msg.id}
                className={`group flex gap-3 px-3 py-1 rounded-xl hover:bg-white/[0.03] transition-colors relative ${showHeader ? "mt-4" : ""} ${isOwn ? "flex-row-reverse" : ""}`}
                onMouseEnter={() => setHoverMsg(msg.id)}
                onMouseLeave={() => { setHoverMsg(null); setShowEmojiPicker(null); }}
              >
                {/* Avatar */}
                {showHeader && (
                  <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border self-start mt-1 ${isOwn ? "bg-brand/20 border-brand/30 text-brand" : "bg-white/5 border-white/10 text-gray-300"}`}>
                    {msg.av}
                  </div>
                )}
                {!showHeader && <div className="w-9 flex-shrink-0" />}

                {/* Bubble */}
                <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                  {showHeader && (
                    <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className={`text-sm font-bold ${isOwn ? "text-brand" : "text-white"}`}>{isOwn ? "You" : msg.username}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}

                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? "bg-brand text-black font-medium rounded-tr-sm" : "bg-white/[0.07] border border-white/5 text-gray-200 rounded-tl-sm"}`}>
                    {msg.content}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`flex gap-1 mt-1.5 flex-wrap ${isOwn ? "justify-end" : ""}`}>
                      {msg.reactions.map((r, ri) => (
                        <button
                          key={ri}
                          onClick={() => addReaction(msg.id, r.emoji)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-gray-300 font-mono">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                {hoverMsg === msg.id && (
                  <div className={`absolute top-0 flex items-center gap-1 bg-black/80 border border-white/10 rounded-xl px-2 py-1 shadow-xl z-10 ${isOwn ? "left-4" : "right-4"}`}>
                    <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {showEmojiPicker === msg.id && (
                      <div className="absolute top-full mt-1 left-0 flex gap-1 bg-black/90 border border-white/10 rounded-xl p-2 shadow-2xl z-20">
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => addReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex-shrink-0 relative">
          {typingBots.length > 0 && (
            <div className="absolute -top-7 left-6 text-[10px] text-brand font-mono animate-pulse flex items-center gap-2 bg-black/40 px-3 py-1 rounded-t-lg border border-b-0 border-white/5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              {typingBots.join(", ")} {typingBots.length === 1 ? "is" : "are"} typing...
            </div>
          )}
          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message #${CHANNELS.find(c => c.id === activeChannel)?.label}...`}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-brand/50 focus:bg-white/[0.08] transition-all placeholder-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 flex-shrink-0 bg-brand text-black rounded-xl flex items-center justify-center hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {!isConnected && (
            <p className="text-[10px] text-gray-600 font-mono mt-2 text-center">
              Demo mode — messages are local only. Start the backend to enable live chat.
            </p>
          )}
        </div>
      </div>

      {/* ── Online Members (right sidebar) ────────────────────────────────── */}
      <div className="hidden xl:flex w-56 flex-shrink-0 border-l border-white/5 bg-black/30 flex-col py-4 px-3">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2 mb-3">
          Members — {ONLINE_MEMBERS.length}
        </div>

        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-2 mb-2">Online</div>
        <div className="space-y-1 mb-4">
          {ONLINE_MEMBERS.filter(m => m.status === "online").map((m, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-300 font-bold group-hover:border-brand/30 transition-colors">{m.av}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-black" />
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">{m.name}</span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-2 mb-2">Idle</div>
        <div className="space-y-1">
          {ONLINE_MEMBERS.filter(m => m.status === "idle").map((m, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer group opacity-60">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-300 font-bold">{m.av}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-black" />
              </div>
              <span className="text-sm text-gray-300 truncate">{m.name}</span>
            </div>
          ))}
        </div>

        {/* Trending topics */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-2 mb-2">Trending</div>
          {["#NVDA", "#BTC", "#FOMC", "#OptionsFlow"].map((tag, i) => (
            <div key={i} className="flex justify-between items-center px-2 py-1.5 text-xs rounded-lg hover:bg-white/5 cursor-pointer">
              <span className="text-brand font-mono">{tag}</span>
              <span className="text-gray-600">{(4-i)*13}k</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
