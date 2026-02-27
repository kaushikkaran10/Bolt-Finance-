"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Newspaper, BarChart3, Radio, AlertCircle, Search, Filter } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast, Toaster } from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────
interface Article {
  id: string; // fallback to URL
  title: string;
  summary: string; // description
  sentiment: string;
  sentiment_score: number;
  impact: string;
  source: string;
  url: string;
  published_at: string;
  fetched_at: string;
}

interface SummaryStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  fetched_at: string;
}

// ── Offline Dummy Data for Simulation ──────────────────────────────────────
const ALL_DUMMY_ARTICLES = [
  { id: "1", title: "Federal Reserve Signals Further Rate Cuts Ahead, Boosting Risk Assets", summary: "Fed Chair Powell indicated the central bank is prepared to cut rates two more times in 2025 if inflation continues its downward trajectory, sending equities and crypto markets sharply higher.", sentiment: "positive", impact: "High", source: "Financial Times", published_at: new Date(Date.now() - 1000*60*5).toISOString(), url: "#" },
  { id: "2", title: "NVIDIA Reports Record Q1 Revenue of $26B, AI Chip Demand Surges", summary: "NVIDIA beat Wall Street estimates by 18%, driven by insatiable demand for H100 and Blackwell chips from hyperscalers. Data center revenue grew 427% year-over-year.", sentiment: "positive", impact: "High", source: "Bloomberg", published_at: new Date(Date.now() - 1000*60*45).toISOString(), url: "#" },
  { id: "3", title: "Tech Giants Report Slower Cloud Growth Amid Enterprise Budget Tightening", summary: "AWS, Azure, and Google Cloud all reported deceleration in cloud growth rates, missing consensus estimates. CFOs cite macro uncertainty as a key driver of spending caution.", sentiment: "negative", impact: "Medium", source: "Reuters", published_at: new Date(Date.now() - 1000*60*120).toISOString(), url: "#" },
  { id: "4", title: "Bitcoin Surpasses $65,000 as ETF Inflows Accelerate", summary: "Spot Bitcoin ETFs saw combined inflows of $843M in a single day, the highest since launch week, suggesting institutional appetite for crypto exposure remains voracious.", sentiment: "positive", impact: "High", source: "CoinDesk", published_at: new Date(Date.now() - 1000*60*180).toISOString(), url: "#" },
  { id: "5", title: "Oil Prices Stabilize After Three Weeks of Volatility", summary: "Brent crude settled at $83.40 per barrel after OPEC+ confirmed production cuts would remain in place through Q3 2025. Markets expect range-bound trading heading into summer.", sentiment: "neutral", impact: "Low", source: "Reuters", published_at: new Date(Date.now() - 1000*60*240).toISOString(), url: "#" },
  { id: "6", title: "Tesla's FSD V12.4 Passes Regulatory Audit in California", summary: "California DMV has approved Tesla's Full Self-Driving for expanded testing after 1M+ mile audit showed a 3× improvement in disengagement rates over prior versions.", sentiment: "positive", impact: "Medium", source: "Electrek", published_at: new Date(Date.now() - 1000*60*300).toISOString(), url: "#" },
  { id: "7", title: "China PMI Drops Below 50, Deflationary Pressures Mount", summary: "China's manufacturing PMI fell to 49.1 in April, signaling a contraction in factory activity. Analysts warn of renewed deflationary spiral that could pressure global equities.", sentiment: "negative", impact: "High", source: "WSJ", published_at: new Date(Date.now() - 1000*60*360).toISOString(), url: "#" },
  { id: "8", title: "Apple Plans $110B Buyback, Largest in Corporate History", summary: "Apple Inc. announced a record share repurchase program with a Buffett-endorsed stamp of approval, signaling immense confidence in future FCF generation.", sentiment: "positive", impact: "Medium", source: "CNBC", published_at: new Date(Date.now() - 1000*60*420).toISOString(), url: "#" }
] as Article[];

// These articles will be pushed one by one every 25 seconds
const INCOMING_ARTICLES = [
  { id: "9", title: "URGENT: SEC Approves First Solana Spot ETF Application", summary: "In a surprise move, the SEC has greenlit the first spot ETF for Solana, sending SOL prices surging 15% in minutes.", sentiment: "positive", impact: "High", source: "CryptoBriefing", published_at: new Date().toISOString(), url: "#" },
  { id: "10", title: "Global Supply Chain Disruption as Major Port Strike Begins", summary: "Thousands of dockworkers have walked out across multiple East Coast ports, threatening severe logistical bottlenecks going into Q3.", sentiment: "negative", impact: "High", source: "Wall Street Journal", published_at: new Date().toISOString(), url: "#" },
  { id: "11", title: "OpenAI Announces GPT-5, Claiming AGI Milestones Reached", summary: "Sam Altman revealed the next iteration of their flagship model, stating it exhibits reasoning capabilities fundamentally beyond human experts in specific scientific domains.", sentiment: "neutral", impact: "High", source: "The Verge", published_at: new Date().toISOString(), url: "#" }
] as Article[];

const SENTIMENT_SUMMARY: SummaryStats = { total: 148, positive: 89, negative: 31, neutral: 28, fetched_at: new Date().toISOString() };

const FILTERS = ["All", "Positive", "Negative", "Neutral", "High Impact"];

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(isoDate).toLocaleDateString();
}

// Custom Toast component to sync audio playback EXACTLY with DOM render
const NewsToast = ({ 
  t, 
  article, 
  playSound, 
  setArticles 
}: { 
  t: any, 
  article: Article, 
  playSound: () => void,
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>
}) => {
  useEffect(() => {
    if (t.visible) {
      playSound();
      // Push the new article to the front of the list exactly as the toast renders
      setArticles(prev => [article, ...prev]);
    }
  }, [t.visible, playSound, article, setArticles]);

  return (
    <div className={`glass-panel p-4 rounded-xl border border-brand/30 shadow-[0_0_20px_rgba(0,255,136,0.3)] min-w-[300px] flex items-start gap-4 ${t.visible ? 'animate-in slide-in-from-top-4 fade-in duration-300' : 'animate-out slide-out-to-right-4 fade-out duration-300'}`}>
       <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0 border border-brand/20">
         <AlertCircle className="w-5 h-5 text-brand" />
       </div>
       <div>
          <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{article.title}</h4>
          <p className="text-gray-400 text-xs font-mono">{article.source} • {article.impact} Impact</p>
       </div>
    </div>
  );
};

export default function NewsIntelligencePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>(ALL_DUMMY_ARTICLES);
  const [stats, setStats] = useState<SummaryStats | null>(SENTIMENT_SUMMARY);
  const [loading, setLoading] = useState(false); // No loading required for offline mode
  const [error, setError] = useState<string | null>(null);
  
  // Ref for the unused incoming articles queue
  const queueRef = useRef(INCOMING_ARTICLES);

  // Play a clean UI "pop/ding" sound
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Pleasant "ding" setting
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6 note
      
      // Volume envelope (quick attack, natural decay)
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context playback failed", e);
    }
  };

  useEffect(() => {
    // Simulate real-time news arriving every 25 seconds
    const intervalId = setInterval(() => {
      if (queueRef.current.length > 0) {
        const nextArticle = queueRef.current.shift()!;
        
        // Trigger the Toast Notification!
        toast.custom((t) => <NewsToast t={t} article={nextArticle} playSound={playNotificationSound} setArticles={setArticles} />, { duration: 5000, position: 'top-right' });
      }
    }, 25000); // Trigger every 25 seconds

    return () => clearInterval(intervalId);
  }, []);

  const filtered = articles.filter(a => {
    const matchFilter =
      activeFilter === "All" ? true :
      activeFilter === "High Impact" ? a.impact === "High" :
      a.sentiment === activeFilter.toLowerCase();
    const matchSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <p className="text-gray-400 font-mono text-sm animate-pulse">Initializing News Intelligence Terminal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="glass-panel p-8 rounded-2xl border-red-500/30 flex flex-col items-center text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
          <p className="text-gray-400 font-mono text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Calculate Market Mood safely based on DB stats
  let marketMood = "Neutral";
  let avgScore = 0;
  let highImpact = articles.filter(a => a.impact === "High").length;
  if (stats) {
    if (stats.positive > stats.negative * 1.5) marketMood = "Bullish";
    else if (stats.negative > stats.positive * 1.5) marketMood = "Bearish";
    else if (stats.positive > stats.negative) marketMood = "Slightly Bullish";
    else if (stats.negative > stats.positive) marketMood = "Slightly Bearish";
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <Toaster />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">News Intelligence</h1>
        <p className="text-gray-400 font-mono text-sm max-w-3xl">
          Real-time financial NLP event detection. FinBERT scores sentiment and impact across thousands of sources.
        </p>
      </div>

      {/* Sentiment Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Market Mood */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden group hover:border-brand/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand/10 transition-colors" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className="text-sm text-gray-400 font-mono uppercase tracking-wider mb-1">Global Market Mood</h3>
              <div className="text-3xl font-bold text-white">{marketMood}</div>
            </div>
            {marketMood.includes("Bull") ? (
              <TrendingUp className="w-10 h-10 text-brand drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]" />
            ) : marketMood.includes("Bear") ? (
              <TrendingDown className="w-10 h-10 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
            ) : (
              <Minus className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div className="relative z-10">
            <div className="text-xs text-brand bg-brand/10 inline-flex px-2 py-1 rounded border border-brand/20 animate-pulse">
              Simulated Offline Demo (25s Pulse)
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-sm text-gray-400 font-mono uppercase tracking-wider">Volume Analyzed</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats?.total || 0} <span className="text-lg text-gray-500 font-normal">articles</span></div>
          <div className="text-xs text-gray-500 font-mono">{highImpact} classified as High Impact</div>
        </div>

        {/* Sentiment Bias */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm text-gray-400 font-mono uppercase tracking-wider">Sentiment Bias</h3>
          </div>
          <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden flex border border-white/5 mb-2">
            <div style={{ width: `${stats?.total ? (stats.positive / stats.total) * 100 : 33}%` }} className="h-full bg-brand shadow-[0_0_10px_rgba(0,255,136,0.5)] transition-all duration-1000" />
            <div style={{ width: `${stats?.total ? (stats.neutral / stats.total) * 100 : 33}%` }} className="h-full bg-gray-500 transition-all duration-1000" />
            <div style={{ width: `${stats?.total ? (stats.negative / stats.total) * 100 : 33}%` }} className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-1000" />
          </div>
          <div className="flex justify-between text-[10px] font-mono uppercase text-gray-500">
            <span className="text-brand">Bull ({stats?.positive || 0})</span>
            <span>Neutral ({stats?.neutral || 0})</span>
            <span className="text-red-500">Bear ({stats?.negative || 0})</span>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search news, sources..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 placeholder-gray-600"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === f ? "bg-brand/20 text-brand border border-brand/30" : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-brand" /> Live Terminal Feed
          <span className="text-sm text-gray-500 font-normal font-mono ml-2">({filtered.length} articles)</span>
        </h3>

        {filtered.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border-white/5 text-center">
            <Minus className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-mono">No articles found matching filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((article) => (
              <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="glass-panel p-5 rounded-xl border border-white/5 hover:border-brand/30 transition-all flex flex-col md:flex-row gap-5 group items-start md:items-center cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                      article.sentiment === "positive" ? "bg-brand/10 text-brand border-brand/20" :
                      article.sentiment === "negative" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    }`}>
                      {article.sentiment === "positive" ? <TrendingUp className="w-3 h-3 inline mr-1" /> : article.sentiment === "negative" ? <TrendingDown className="w-3 h-3 inline mr-1" /> : <Minus className="w-3 h-3 inline mr-1" />}
                      {article.sentiment}
                    </span>
                    {article.impact === "High" && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded">
                        <AlertCircle className="w-3 h-3" /> High Impact
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 font-mono">{timeAgo(article.published_at)}</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2 group-hover:text-brand transition-colors line-clamp-2">{article.title}</h4>
                  <p className="text-sm text-gray-400 line-clamp-2">{article.summary || "No summary available."}</p>
                </div>
                <div className="md:border-l border-white/10 md:pl-5 flex flex-col gap-1 flex-shrink-0 min-w-20">
                  <span className="text-xs text-gray-500 font-mono uppercase">Source</span>
                  <span className="text-sm text-white font-medium">{article.source}</span>
                </div>
              </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* FinBERT info strip */}
      <div className="glass-panel p-4 rounded-2xl border-white/5 flex items-center gap-4 text-sm text-gray-400">
        <Filter className="w-5 h-5 text-brand flex-shrink-0" />
        <span>Powered by <span className="text-white font-bold">ProsusAI/FinBERT</span> — classifies financial text into positive, negative, or neutral sentiment with confidence scoring.</span>
      </div>
    </div>
  );
}
