"use client";

import { useState, useEffect } from "react";
import { Target, Trophy, TrendingDown, BarChart2, RefreshCw, CheckCircle2, XCircle, Clock, ChevronUp, ChevronDown, Brain, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// ── Dummy data - all works offline ─────────────────────────────────────────
const AI_FORECASTS = [
  { ticker: "NVDA", conf: 94, target: "$950", direction: "up",   current: "$874.50",  change: "+8.6%"  },
  { ticker: "TSLA", conf: 72, target: "$165", direction: "down", current: "$172.80",  change: "−4.5%"  },
  { ticker: "BTC",  conf: 88, target: "$72k", direction: "up",   current: "$64,200",  change: "+12.1%" },
  { ticker: "AAPL", conf: 81, target: "$195", direction: "up",   current: "$186.40",  change: "+4.6%"  },
];

const MOCK_LEADERBOARD = [
  { username: "quant_wizard",  accuracy: 92, total: 84, correct: 77, streak: 12 },
  { username: "satoshi_99",    accuracy: 88, total: 63, correct: 55, streak: 7  },
  { username: "algo_trader",   accuracy: 84, total: 112, correct: 94, streak: 4 },
  { username: "neural_net",    accuracy: 81, total: 96,  correct: 78, streak: 3  },
  { username: "you",           accuracy: 76, total: 29,  correct: 22, streak: 2  },
];

const CANDLE_DATA = [
  [50,55,48,53],[53,60,51,58],[58,62,54,56],[56,63,55,62],[62,65,58,60],
  [60,68,59,66],[66,71,63,69],[69,72,66,71],[71,75,68,73],[73,78,69,75],
  [75,80,72,77],[77,82,74,80],[80,83,77,79],[79,85,77,83],[83,88,80,86],
  [86,90,83,84],[84,92,82,90],[90,93,87,91],[91,95,88,93],[93,96,89,94],
];

type CandleType = [number, number, number, number];

// Mini candle-stick chart
function CandleChart({ data }: { data: CandleType[] }) {
  const w = 480; const h = 160;
  const allVals = data.flatMap(([o,h2,l,c]) => [o,h2,l,c]);
  const minV = Math.min(...allVals) - 2;
  const maxV = Math.max(...allVals) + 2;
  const range = maxV - minV;
  const toY = (v: number) => h - ((v - minV) / range) * h;
  const barW = (w / data.length) * 0.6;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      {data.map(([o, hi, lo, c], i) => {
        const x = (i / data.length) * w + (w / data.length) * 0.2;
        const color = c >= o ? "#00ff88" : "#ef4444";
        return (
          <g key={i}>
            <line x1={x + barW/2} y1={toY(hi)} x2={x + barW/2} y2={toY(lo)} stroke={color} strokeWidth="1" />
            <rect x={x} y={toY(Math.max(o,c))} width={barW} height={Math.max(1, Math.abs(toY(o) - toY(c)))} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

const STOCKS = ["AAPL","NVDA","TSLA","MSFT","GOOGL","AMZN","META","BTC","ETH","SPY"];

export default function PredictionsPage() {
  const { novaxToken } = useAuth();
  const [selectedStock, setSelectedStock] = useState("NVDA");
  const [predDirection, setPredDirection] = useState<"Bullish" | "Bearish" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [candles, setCandles] = useState<CandleType[]>(CANDLE_DATA as CandleType[]);
  const [ticker, setTicker] = useState("NVDA");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time AI Forecast State
  const [aiForecast, setAiForecast] = useState<{ direction: string, target: string, conf: number } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [myPredictions, setMyPredictions] = useState([
    { ticker: "AAPL", direction: "Bullish", result: "correct",  accuracy: 92, date: "Feb 25" },
    { ticker: "BTC",  direction: "Bullish", result: "correct",  accuracy: 88, date: "Feb 24" },
    { ticker: "TSLA", direction: "Bearish", result: "incorrect",accuracy: 72, date: "Feb 22" },
  ]);

    // Generate ML Forecast via Gemini for the current ticker
    const fetchAiForecast = async (targetTicker: string, price: number) => {
      setIsAiLoading(true);
      try {
        const prompt = `You are a quantitative ML trading model. The user is looking at the stock/crypto ticker: ${targetTicker}. The current price is $${price.toFixed(2)}.
        Provide a 24h forecast. 
        You MUST reply ONLY with a strict JSON object taking this exact format, with no markdown formatting or other text:
        {"direction": "Bullish" or "Bearish", "target": "price string", "conf": number between 50 and 99}
        Example: {"direction": "Bullish", "target": "$195.50", "conf": 87}`;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });
        const data = await res.json();
        
        if (res.ok && data.response) {
          try {
            // Strip any potential markdown formatting from Gemini
            const cleanJson = data.response.replace(/```json/g, "").replace(/```/g, "").trim();
            setAiForecast(JSON.parse(cleanJson));
          } catch {
            console.error("Failed to parse AI forecast:", data.response);
          }
        }
      } catch (err) {
        console.error("AI Forecast failed:", err);
      } finally {
        setIsAiLoading(false);
      }
    };

  // Fetch real market data when ticker changes
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function fetchTickerData() {
      try {
        // 1. Fetch live price
        const priceRes = await fetch(`/api/market/prices?symbols=${ticker}`);
        if (priceRes.ok && mounted) {
          const priceData = await priceRes.json();
          if (priceData[ticker]) {
            setCurrentPrice(priceData[ticker].price);
            setPriceChange(priceData[ticker].change24h);
            
            // On initial load of a new ticker, fetch the AI forecast too
            fetchAiForecast(ticker, priceData[ticker].price);
          }
        }

        // 2. Fetch historical candle data
        const candlesRes = await fetch(`/api/market/candles?symbol=${ticker}&interval=1d&range=1mo`);
        if (candlesRes.ok && mounted) {
          const candlesData = await candlesRes.json();
          if (candlesData && candlesData.length > 0) {
            // Keep the last 20 candles for the mini chart
            const last20 = candlesData.slice(-20).map((c: { open: number; high: number; low: number; close: number; }) => [c.open, c.high, c.low, c.close]);
            setCandles(last20);
          }
        }
      } catch (err) {
        console.error("Failed to fetch ticker data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchTickerData();
    const interval = setInterval(fetchTickerData, 10000); 
    
    // Visual live ticker every second
    const tickInterval = setInterval(() => {
      if (mounted && currentPrice > 0) {
        setCurrentPrice(prev => {
          const jitter = (Math.random() - 0.5) * (prev * 0.0002);
          return prev + jitter;
        });
        // slightly bounce the last candle close
        setCandles(prev => {
          if (!prev.length) return prev;
          const newCandles = [...prev];
          const last = newCandles[newCandles.length - 1];
          const newClose = last[3] + (Math.random() - 0.5) * (last[3] * 0.0005);
          newCandles[newCandles.length - 1] = [last[0], Math.max(last[1], newClose), Math.min(last[2], newClose), newClose];
          return newCandles;
        });
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [ticker, currentPrice]);


  const handleSubmit = async () => {
    if (!predDirection || !novaxToken) return;
    setSubmitted(true);
    
    try {
      const res = await fetch("http://localhost:8000/api/predict/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${novaxToken}`,
        },
        body: JSON.stringify({
          ticker: selectedStock,
          direction: predDirection,
        }),
      });

      if (!res.ok) throw new Error("Prediction submission failed");

      const data = await res.json();
      
      // Determine immediate outcome against the backend's instantaneous ML prediction
      const result = data.ml_direction === predDirection ? "correct" : "incorrect";
      
      setMyPredictions(prev => [{
        ticker: selectedStock, 
        direction: predDirection,
        result, 
        accuracy: Math.round(data.ml_confidence * 100) || 85, 
        date: "Today"
      }, ...prev]);
    } catch (err: any) {
      console.error(err);
      alert("Your session token has expired after 15 minutes! Please sign out from the top right menu and sign back in to continue submitting predictions.");
    } finally {
      setSubmitted(false);
      setPredDirection(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand/10 text-brand rounded-lg"><Brain className="w-5 h-5"/></div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Stock Prediction Arena</h1>
        </div>
        <p className="text-gray-400 font-mono text-sm max-w-2xl">
          Test your market thesis against our ML inference engine. Beat the AI baseline to earn reputation.
        </p>
      </div>

      {/* Trading Playground - main feature */}
      <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 blur-[100px] rounded-full" />
        <div className="flex items-center gap-3 mb-6">
          <BarChart2 className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold text-white">Trading Playground</h2>
          <span className="text-[10px] font-bold text-brand border border-brand/30 bg-brand/5 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" /> LIVE SIM
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Area */}
          <div className="lg:col-span-2">
            {/* Ticker Selector */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {STOCKS.map(s => (
                <button
                  key={s}
                  onClick={() => { setTicker(s); setSelectedStock(s); setPriceChange((Math.random()-0.5)*5); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${ticker === s ? "bg-brand text-black" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Price Display */}
            <div className="flex items-baseline gap-3 mb-3">
              <span className={`text-4xl font-bold text-white font-mono transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>
                ${currentPrice.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </span>
              <span className={`text-lg font-mono font-bold flex items-center gap-1 transition-opacity ${isLoading ? "opacity-50" : "opacity-100"} ${priceChange >= 0 ? "text-brand" : "text-red-400"}`}>
                {priceChange >= 0 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500 font-mono">{ticker}</span>
            </div>

            {/* Candle Chart */}
            <div className="h-48 bg-black/40 rounded-2xl border border-white/5 overflow-hidden p-2">
              <CandleChart data={candles} />
            </div>

            <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1 px-1">
              {["20d ago","15d","10d","5d","Now"].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>

          {/* Prediction Panel */}
          <div className="flex flex-col gap-4">
            <div className="glass-panel p-5 rounded-2xl border-white/5">
              <h3 className="text-sm font-bold text-white mb-1">Make Your Prediction</h3>
              <p className="text-xs text-gray-500 font-mono mb-4">Where will <span className="text-brand">{selectedStock}</span> move in the next 24h?</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setPredDirection("Bullish")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${predDirection === "Bullish" ? "border-brand bg-brand/10 shadow-[0_0_20px_rgba(0,255,136,0.15)]" : "border-white/10 hover:border-brand/30 hover:bg-brand/5"}`}
                >
                  <TrendingUp className={`w-6 h-6 ${predDirection === "Bullish" ? "text-brand" : "text-gray-400"}`} />
                  <span className={`text-sm font-bold ${predDirection === "Bullish" ? "text-brand" : "text-gray-400"}`}>Bullish ↑</span>
                </button>
                <button
                  onClick={() => setPredDirection("Bearish")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${predDirection === "Bearish" ? "border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "border-white/10 hover:border-red-500/30 hover:bg-red-500/5"}`}
                >
                  <TrendingDown className={`w-6 h-6 ${predDirection === "Bearish" ? "text-red-400" : "text-gray-400"}`} />
                  <span className={`text-sm font-bold ${predDirection === "Bearish" ? "text-red-400" : "text-gray-400"}`}>Bearish ↓</span>
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!predDirection || submitted}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {submitted ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Analysing...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Submit to Arena</>
                )}
              </button>
            </div>

            {/* ML Engine Opinion */}
            <div className={`glass-panel p-4 rounded-2xl border transition-all duration-500 overflow-hidden relative ${aiForecast?.direction === 'Bullish' ? 'border-brand/20 bg-brand/[0.03]' : aiForecast?.direction === 'Bearish' ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/5 bg-white/[0.02]'}`}>
              {isAiLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                  <RefreshCw className="w-5 h-5 text-brand animate-spin mb-2" />
                  <span className="text-[10px] text-brand font-mono font-bold tracking-widest uppercase animate-pulse">Running ML Models...</span>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className={`w-4 h-4 ${aiForecast?.direction === 'Bullish' ? 'text-brand' : aiForecast?.direction === 'Bearish' ? 'text-red-400' : 'text-gray-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${aiForecast?.direction === 'Bullish' ? 'text-brand' : aiForecast?.direction === 'Bearish' ? 'text-red-400' : 'text-gray-500'}`}>
                    ML Engine Forecast
                  </span>
                </div>
              </div>

              {!aiForecast && !isAiLoading ? (
                <div className="py-4 text-center text-xs text-gray-500 font-mono">Forecast unavailable</div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className={`text-lg font-bold ${aiForecast?.direction === 'Bullish' ? 'text-white' : aiForecast?.direction === 'Bearish' ? 'text-white' : 'text-gray-400'}`}>
                        {aiForecast?.direction || '---'} {aiForecast?.direction === 'Bullish' ? '↑' : aiForecast?.direction === 'Bearish' ? '↓' : ''}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">Target: {aiForecast?.target || '---'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold font-mono ${aiForecast?.direction === 'Bullish' ? 'text-brand' : aiForecast?.direction === 'Bearish' ? 'text-red-400' : 'text-gray-500'}`}>
                        {aiForecast?.conf || '--'}%
                      </div>
                      <div className="text-[10px] text-gray-500">Confidence</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-black/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${aiForecast?.direction === 'Bullish' ? 'bg-brand shadow-[0_0_10px_#00ff88]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} 
                      style={{ width: `${aiForecast?.conf || 0}%` }} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Forecasts */}
        <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 blur-[60px] rounded-full" />
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand" /> AI Active Forecasts
          </h3>
          <div className="space-y-3">
            {AI_FORECASTS.map((pred, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/30 hover:bg-black/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-bold text-sm text-white">{pred.ticker}</div>
                  <div>
                    <div className="text-xs text-gray-400 font-mono">Target</div>
                    <div className="font-bold text-white">{pred.target}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold flex items-center gap-1 ${pred.direction === "up" ? "text-brand" : "text-red-400"}`}>
                    {pred.conf}% <Zap className="w-3 h-3" />
                  </div>
                  <div className={`text-xs font-mono ${pred.direction === "up" ? "text-brand" : "text-red-400"}`}>{pred.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Predictions */}
        <div className="glass-panel p-6 rounded-3xl border-white/5">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00d2ff]" /> My Predictions
          </h3>
          <div className="space-y-3">
            {myPredictions.map((p: { ticker: string; direction: string; result: string; accuracy: number; date: string; }, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  {p.result === "correct" ? (
                    <CheckCircle2 className="w-5 h-5 text-brand flex-shrink-0" />
                  ) : p.result === "incorrect" ? (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-white text-sm">{p.ticker}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{p.direction} · {p.date}</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded border font-mono ${
                  p.result === "correct" ? "border-brand/30 text-brand bg-brand/5" :
                  p.result === "incorrect" ? "border-red-500/30 text-red-400 bg-red-500/5" :
                  "border-gray-600 text-gray-400 bg-gray-800"
                }`}>{p.result === "correct" ? "✓ Win" : p.result === "incorrect" ? "✗ Loss" : "⏳ Pending"}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center">
            <span className="text-sm text-gray-400">Overall Accuracy</span>
            <span className="text-brand font-bold font-mono text-lg">
              {Math.round((myPredictions.filter(p => p.result === "correct").length / myPredictions.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Global Leaderboard */}
        <div className="glass-panel p-6 rounded-3xl border-white/5">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Global Leaderboard
          </h3>
          <div className="space-y-2">
            {MOCK_LEADERBOARD.map((user, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${user.username === "you" ? "border-brand/30 bg-brand/5" : "border-white/5 bg-white/[0.02] hover:bg-white/5"}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-bold w-6 text-center ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-500"}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <div className={`font-medium text-sm ${user.username === "you" ? "text-brand" : "text-white"}`}>
                      {user.username} {user.username === "you" ? "👈" : ""}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">{user.correct}/{user.total} correct · 🔥{user.streak}</div>
                  </div>
                </div>
                <span className="text-brand font-mono font-bold">{user.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
