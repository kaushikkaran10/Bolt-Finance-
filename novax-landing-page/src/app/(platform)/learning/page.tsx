"use client";

import { useState } from "react";
import { BookOpen, Trophy, PlayCircle, CheckCircle2, Lock, ChevronRight, Star, Zap, Target, Brain, BarChart2, TrendingUp } from "lucide-react";

// ── Full roadmap data — always works offline ────────────────────────────────
const ROADMAP = [
  {
    phase: "Phase 1",
    title: "Market Foundations",
    color: "#00ff88",
    completed: true,
    modules: [
      { id: "basics-01",     title: "Stock Market Fundamentals",    duration: 15, status: "completed", xp: 100 },
      { id: "basics-02",     title: "Reading Financial Statements",  duration: 20, status: "completed", xp: 120 },
      { id: "basics-03",     title: "Order Types & Market Mechanics", duration: 12, status: "completed", xp: 80  },
    ],
  },
  {
    phase: "Phase 2",
    title: "Technical Analysis",
    color: "#00d2ff",
    completed: false,
    modules: [
      { id: "ta-01", title: "Candlestick Charts & Patterns",   duration: 25, status: "in-progress", xp: 150, progress: 65 },
      { id: "ta-02", title: "RSI, MACD & Bollinger Bands",    duration: 20, status: "locked",       xp: 150 },
      { id: "ta-03", title: "Support, Resistance & Breakouts", duration: 18, status: "locked",       xp: 120 },
    ],
  },
  {
    phase: "Phase 3",
    title: "Risk Management",
    color: "#a855f7",
    completed: false,
    modules: [
      { id: "risk-01", title: "Position Sizing & Kelly Criterion", duration: 20, status: "locked", xp: 200 },
      { id: "risk-02", title: "Portfolio Diversification",         duration: 18, status: "locked", xp: 175 },
      { id: "risk-03", title: "Stop Loss Strategies",              duration: 15, status: "locked", xp: 150 },
    ],
  },
  {
    phase: "Phase 4",
    title: "AI & Algorithmic Trading",
    color: "#f59e0b",
    completed: false,
    modules: [
      { id: "ai-01", title: "ML Models in Finance (LSTM)",    duration: 30, status: "locked", xp: 300 },
      { id: "ai-02", title: "NLP & Sentiment Analysis",       duration: 28, status: "locked", xp: 280 },
      { id: "ai-03", title: "Backtesting Strategies",         duration: 35, status: "locked", xp: 350 },
    ],
  },
  {
    phase: "Phase 5",
    title: "DeFi & Web3",
    color: "#ec4899",
    completed: false,
    modules: [
      { id: "web3-01", title: "Blockchain Fundamentals",        duration: 20, status: "locked", xp: 200 },
      { id: "web3-02", title: "DeFi Protocols (Aave, Uniswap)", duration: 25, status: "locked", xp: 250 },
      { id: "web3-03", title: "Yield Farming & Impermanent Loss", duration: 22, status: "locked", xp: 220 },
    ],
  },
];

const USER_STATS = { level: 4, xp: 845, nextLevelXp: 1200, totalModules: 15, completed: 4, streak: 7 };

const QUICK_FACTS = [
  { icon: Brain,    label: "AI Trading",    desc: "ML models earn 2.3× avg market return" },
  { icon: BarChart2,label: "Technical",     desc: "80% of institutional traders use TA"     },
  { icon: TrendingUp,label: "Risk Mgmt",   desc: "Top traders risk ≤2% per trade"          },
  { icon: Target,   label: "Fundamentals", desc: "Buffett reads 500 pages of filings/day"  },
];

export default function LearningPage() {
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [openModule, setOpenModule] = useState<string | null>(null);

  const totalXp = ROADMAP.flatMap(p => p.modules).filter(m => m.status === "completed").reduce((s, m) => s + m.xp, 0);
  const xpPct = Math.round((USER_STATS.xp / USER_STATS.nextLevelXp) * 100);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Learning Edge</h1>
        <p className="text-gray-400 font-mono text-sm max-w-2xl">
          Master quantitative finance and proprietary algorithmic strategies. Progress unlocks higher capital limits in the Prediction Arena.
        </p>
      </div>

      {/* XP Progress Banner */}
      <div className="glass-panel p-6 rounded-3xl border-white/5 flex flex-col md:flex-row items-center gap-8">
        {/* Level Ring */}
        <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#00d2ff" strokeWidth="8"
              strokeDasharray={`${2.64 * xpPct} 264`} strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="text-center z-10">
            <div className="text-2xl font-bold text-white">Lv.{USER_STATS.level}</div>
            <div className="text-[10px] text-[#00d2ff] font-mono">QUANT</div>
          </div>
        </div>

        {/* XP Stats */}
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-white">Quantitative Analyst</h3>
            <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
              🔥 {USER_STATS.streak}-day streak
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-mono mb-1">
            <span>XP: {USER_STATS.xp}</span>
            <span>Next level: {USER_STATS.nextLevelXp}</span>
          </div>
          <div className="w-full h-2.5 bg-black/60 rounded-full border border-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00d2ff] to-brand rounded-full shadow-[0_0_10px_rgba(0,210,255,0.5)] transition-all duration-1000" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="text-gray-400 text-sm mt-3">
            You have completed <span className="text-white font-bold">{USER_STATS.completed}</span> of <span className="text-white font-bold">{USER_STATS.totalModules}</span> modules. Keep learning to unlock AI backtesting tools.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          {[
            { icon: Trophy,   label: "Modules",   value: USER_STATS.totalModules.toString() },
            { icon: CheckCircle2, label: "Done",  value: USER_STATS.completed.toString() },
            { icon: Star,     label: "Total XP",  value: totalXp.toString() },
            { icon: Zap,      label: "Streak",    value: `${USER_STATS.streak}d` },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="glass-panel p-3 rounded-xl border border-white/5 text-center">
                <Icon className="w-4 h-4 text-brand mx-auto mb-1" />
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Facts Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_FACTS.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="glass-panel p-4 rounded-2xl border-white/5 flex items-center gap-3 hover:border-brand/20 transition-colors">
              <div className="p-2 bg-brand/10 text-brand rounded-lg flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{f.label}</div>
                <div className="text-[10px] text-gray-500">{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Learning Roadmap */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Learning Roadmap</h2>

        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand/50 via-[#00d2ff]/30 to-white/5" />

          <div className="space-y-6 pl-16">
            {ROADMAP.map((phase, pi) => (
              <div key={pi}>
                {/* Phase Header */}
                <div className="absolute -left-2" style={{ marginTop: "4px" }}>
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{ borderColor: phase.color, backgroundColor: `${phase.color}20`, color: phase.color }}>
                    {pi + 1}
                  </div>
                </div>

                <button
                  onClick={() => setActivePhase(activePhase === phase.phase ? null : phase.phase)}
                  className={`w-full text-left glass-panel p-5 rounded-2xl border transition-all ${phase.completed ? "border-brand/30" : "border-white/5 hover:border-white/10"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{phase.phase}</div>
                        <div className={`text-lg font-bold ${phase.completed ? "text-brand" : "text-white"}`}>{phase.title}</div>
                      </div>
                      {phase.completed && <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />}
                      {!phase.completed && phase.modules.some(m => m.status === "in-progress") && (
                        <span className="text-[10px] font-bold border rounded-full px-2 py-0.5"
                          style={{ borderColor: `${phase.color}40`, color: phase.color, backgroundColor: `${phase.color}10` }}>
                          In Progress
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono">{phase.modules.length} modules</span>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${activePhase === phase.phase ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </button>

                {/* Module List */}
                {activePhase === phase.phase && (
                  <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {phase.modules.map((mod, mi) => (
                      <div key={mi}
                        onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)}
                        className={`glass-panel p-5 rounded-xl border cursor-pointer transition-all ${
                          mod.status === "completed" ? "border-brand/20 hover:shadow-[0_0_20px_rgba(0,255,136,0.05)]" :
                          mod.status === "in-progress" ? "border-[#00d2ff]/20" :
                          "border-white/5 opacity-60 hover:opacity-90"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${
                              mod.status === "completed" ? "bg-brand/10 text-brand" :
                              mod.status === "in-progress" ? "bg-[#00d2ff]/10 text-[#00d2ff]" :
                              "bg-gray-800 text-gray-400"
                            }`}>
                              {mod.status === "locked" ? <Lock className="w-4 h-4" /> :
                               mod.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> :
                               <PlayCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className={`font-bold ${mod.status === "locked" ? "text-gray-400" : "text-white"}`}>{mod.title}</div>
                              <div className="text-[10px] text-gray-500 font-mono flex items-center gap-3 mt-0.5">
                                <span>⏱ {mod.duration} min</span>
                                <span className="text-brand">+{mod.xp} XP</span>
                              </div>
                            </div>
                          </div>
                          {mod.status !== "locked" && (
                            <button className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              mod.status === "completed" ? "bg-brand/10 text-brand border border-brand/20" :
                              "bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/20 hover:bg-[#00d2ff]/20"
                            }`}>
                              {mod.status === "completed" ? "Review" : "Resume →"}
                            </button>
                          )}
                        </div>
                        {"progress" in mod && mod.status === "in-progress" && (
                          <div className="mt-3 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-[#00d2ff] rounded-full shadow-[0_0_8px_rgba(0,210,255,0.5)]" style={{ width: `${(mod as {progress?: number}).progress || 0}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="glass-panel p-6 rounded-2xl border-white/5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" /> Daily Challenges
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Read 2 news articles", xp: 20,  done: true  },
            { title: "Make 1 prediction",     xp: 50,  done: false },
            { title: "Complete a module",      xp: 100, done: false },
          ].map((c, i) => (
            <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${c.done ? "border-brand/20 bg-brand/5" : "border-white/5 bg-white/[0.02]"}`}>
              <div className="flex items-center gap-3">
                {c.done ? <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />}
                <span className={`text-sm ${c.done ? "text-gray-400 line-through" : "text-white"}`}>{c.title}</span>
              </div>
              <span className="text-xs font-bold text-brand font-mono">+{c.xp} XP</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
