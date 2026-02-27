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

const FILTERS = ["All", "Positive", "Negative", "Neutral", "High Impact"];

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(isoDate).toLocaleDateString();
}

export default function NewsIntelligencePage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track the most recent timestamp to trigger notifications for NEW articles
  const latestSeenTimestamp = useRef<number>(0);

  const fetchNews = async (isBackgroundPoll = false) => {
    try {
      // 1. Fetch articles array with aggressive timeout
      const res = await apiClient.get("/news/");
      
      if (!Array.isArray(res.data)) {
        throw new Error("Backend did not return an array of articles.");
      }

      const newArticles: Article[] = res.data.map((a: any) => ({
        id: a.url || Math.random().toString(),
        title: a.title || "Untitled Article",
        summary: a.description,
        sentiment: a.sentiment || "neutral",
        sentiment_score: a.sentiment_score || 0,
        impact: a.impact || "Low",
        source: a.source || "Unknown API",
        url: a.url || "#",
        published_at: a.published_at || new Date().toISOString(),
        fetched_at: a.fetched_at || new Date().toISOString(),
      }));

      // 2. Fetch sentiment summary stats separately (non-blocking if it fails)
      let newStats: SummaryStats | null = null;
      try {
        const statsRes = await apiClient.get("/news/sentiment");
        newStats = {
          total: statsRes.data.total_articles || 0,
          positive: statsRes.data.positive_count || 0,
          negative: statsRes.data.negative_count || 0,
          neutral: statsRes.data.neutral_count || 0,
          fetched_at: new Date().toISOString(),
        };
      } catch (statErr) {
        console.warn("Could not fetch sentiment summary:", statErr);
      }

      // Find if we have any NEW articles missing from our current state
      if (articles.length > 0 && isBackgroundPoll) {
        const currentUrls = new Set(articles.map(a => a.url));
        const newlyDiscovered = newArticles.filter(a => !currentUrls.has(a.url));
        
        if (newlyDiscovered.length > 0) {
          // Trigger a POP-UP notification for the most impactful new article!
          const impactful = newlyDiscovered.find(a => a.impact === "High") || newlyDiscovered[0];
          
          toast.custom((t) => (
            <div className={`glass-panel p-4 rounded-xl border border-brand/30 shadow-[0_0_20px_rgba(0,255,136,0.3)] min-w-[300px] flex items-start gap-4 ${t.visible ? 'animate-in slide-in-from-top-4 fade-in duration-300' : 'animate-out slide-out-to-right-4 fade-out duration-300'}`}>
               <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0 border border-brand/20">
                 <AlertCircle className="w-5 h-5 text-brand" />
               </div>
               <div>
                  <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{impactful.title}</h4>
                  <p className="text-gray-400 text-xs font-mono">{impactful.source} • {impactful.impact} Impact</p>
               </div>
            </div>
          ), { duration: 5000, position: 'top-right' });
        }
      }

      setArticles(newArticles);
      if (newStats) setStats(newStats);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch news:", err);
      if (!isBackgroundPoll) {
        setError(err.message || "Failed to connect to the News Intelligence backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNews();

    // Set up 15-second real-time polling loop
    const intervalId = setInterval(() => {
      fetchNews(true);
    }, 15000);

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
              Live Connection: Active (Polled 15s)
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
