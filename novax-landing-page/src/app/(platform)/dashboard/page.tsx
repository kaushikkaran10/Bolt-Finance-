"use client";

import { MagneticButton } from "@/components/ui/magnetic-button";
import { ArrowUpRight, TrendingUp, Activity, Wallet, BarChart2, Zap } from "lucide-react";
import { useState, useEffect } from "react";

// The demo portfolio allocation
const PORTFOLIO = {
  AAPL: 45.5,
  NVDA: 12,
  BTC: 0.45,
  ETH: 3.2,
  TSLA: 20,
  SPY: 30,
};

// Fallback sparkline data while loading
const FALLBACK_CHART = [45, 52, 49, 61, 58, 67, 72, 69, 78, 83, 79, 91, 88, 95, 92, 101, 97, 108, 112, 118, 115, 124];
const TIMEFRAMES = ["1D", "1W", "1M", "YTD", "ALL"];

const AI_INSIGHTS = [
  { type: "Alert",       title: "AAPL approaching resistance at $192.50 — high probability reversal.",   time: "2m ago"  },
  { type: "Opportunity", title: "High-probability setup in DeFi sector based on social-volume surge.",   time: "1h ago"  },
  { type: "Learning",    title: "New module: Mastering Options Greeks just unlocked for your profile.",   time: "3h ago"  },
];

// Tiny SVG sparkline
function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 600; const h = 180;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h * 0.85 - h * 0.075;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${h} ` + pts + ` ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = data[data.length - 1];
        const x = w;
        const y = h - ((last - min) / (max - min)) * h * 0.85 - h * 0.075;
        return <circle cx={x} cy={y} r="4" fill="#00ff88" className="drop-shadow-[0_0_8px_#00ff88]" />;
      })()}
    </svg>
  );
}

export default function DashboardPage() {
  const [activeTimeframe, setActiveTimeframe] = useState(2);
  const [chartData, setChartData] = useState<number[]>(FALLBACK_CHART);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [dailyChange, setDailyChange] = useState<{ amount: number, pct: number }>({ amount: 0, pct: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real market data
  useEffect(() => {
    let mounted = true;

    async function fetchMarketData() {
      try {
        // 1. Fetch live prices for the portfolio
        const symbols = Object.keys(PORTFOLIO).join(",");
        const pricesRes = await fetch(`/api/market/prices?symbols=${symbols}`);
        
        if (pricesRes.ok && mounted) {
          const pricesData = await pricesRes.json();
          let totalValue = 0;
          let totalChangeValue = 0;

          // Add $5000 cash balance
          totalValue += 5000;

          for (const [symbol, qty] of Object.entries(PORTFOLIO)) {
            const data = pricesData[symbol];
            if (data) {
              const positionValue = data.price * qty;
              totalValue += positionValue;
              // calculate absolute change for this position based on pct change
              const previousValue = positionValue / (1 + data.change24h / 100);
              totalChangeValue += (positionValue - previousValue);
            }
          }

          setCurrentValue(totalValue);
          setDailyChange({
            amount: totalChangeValue,
            pct: (totalChangeValue / (totalValue - totalChangeValue)) * 100
          });
          setIsLoading(false);
        }

        // 2. Fetch real SPY historical data for the sparkline (as a proxy for portfolio trend)
        const range = activeTimeframe === 0 ? "1d" : activeTimeframe === 1 ? "5d" : activeTimeframe === 2 ? "1mo" : activeTimeframe === 3 ? "ytd" : "1y";
        const interval = activeTimeframe === 0 ? "5m" : activeTimeframe <= 2 ? "1h" : "1d";
        
        const candlesRes = await fetch(`/api/market/candles?symbol=SPY&interval=${interval}&range=${range}`);
        if (candlesRes.ok && mounted) {
          const candlesData = await candlesRes.json();
          if (candlesData && candlesData.length > 0) {
            setChartData(candlesData.map((c: { close: number }) => c.close));
          }
        }
      } catch (err) {
        console.error("Failed to fetch live data:", err);
      }
    }

    fetchMarketData();
    // Poll real data every 10 seconds
    const interval = setInterval(fetchMarketData, 10000);
    
    // Smooth visual ticker that micro-adjusts the price every second 
    // to give it that "live WebSocket" exchange feel
    const visualInterval = setInterval(() => {
      if (mounted && currentValue > 0) {
        setCurrentValue(prev => {
          const jitter = (Math.random() - 0.5) * (prev * 0.0001); // max 0.01% fluctuation
          return prev + jitter;
        });
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(visualInterval);
    };
  }, [activeTimeframe, currentValue]); // Added currentValue as a dependency 

  const formattedValue = isLoading ? "Loading..." : `$${currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedChangeAmount = isLoading ? "..." : `${dailyChange.amount >= 0 ? '+' : '-'}$${Math.abs(dailyChange.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedChangePct = isLoading ? "..." : `${dailyChange.pct >= 0 ? '+' : ''}${dailyChange.pct.toFixed(2)}%`;
  const isPositive = dailyChange.amount >= 0;

  const STATS = [
    { label: "Total Balance",      value: formattedValue, change: `${formattedChangeAmount} (${formattedChangePct})`, icon: Wallet,    positive: isPositive  },
    { label: "AI Forecast Score",  value: "87 / 100",    change: "Via VaR & Sharpe",    icon: TrendingUp, positive: true  },
    { label: "Active Positions",   value: "6",           change: "4 Stocks · 2 Crypto · Cash", icon: Activity,  positive: true  },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back, Investor</h1>
          <p className="text-gray-400 font-mono text-sm">Here&apos;s your live portfolio overview for today.</p>
        </div>
        <div className="flex gap-3">
          <MagneticButton className="h-10 px-4 text-sm group">
            <span className="flex items-center gap-2">
              Invest Now <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </MagneticButton>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          const displayValue = stat.value;
          return (
            <div key={i} className="glass-panel p-6 rounded-2xl border-white/5 hover:border-brand/20 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-brand/10 text-brand">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-sm text-gray-400 font-mono">{stat.label}</div>
              </div>
              <div className="text-3xl font-bold text-white mb-2 font-mono transition-all duration-300">{displayValue}</div>
              <div className="text-sm text-brand">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border-white/5 p-6 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand border border-brand/20 bg-brand/5 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
              {TIMEFRAMES.map((tf, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTimeframe(i)}
                  className={`px-3 py-1 text-xs rounded-md font-mono transition-colors ${i === activeTimeframe ? "bg-brand/20 text-brand" : "text-gray-500 hover:text-white"}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart values */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-white font-mono">{formattedValue}</span>
            <span className={`text-sm font-mono ${isPositive ? 'text-brand' : 'text-red-500'}`}>
              {formattedChangePct} {isPositive ? '↑' : '↓'}
            </span>
          </div>

          <div className="flex-1 rounded-xl border border-white/5 bg-[#030906] overflow-hidden relative">
            <div className="absolute inset-0 p-2">
              <Sparkline data={chartData} />
            </div>
            {/* Y-axis labels */}
            <div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between text-[10px] text-gray-600 font-mono pointer-events-none">
              {["$130k", "$120k", "$110k", "$100k", "$90k"].map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 text-[10px] font-mono text-gray-600">
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span><span>Now</span>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="glass-panel rounded-2xl border-white/5 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_10px_#00ff88] animate-pulse" />
              <h3 className="text-lg font-semibold text-white">AI Intelligence</h3>
            </div>
            <span className="text-xs text-brand font-mono border border-brand/20 px-2 py-1 rounded bg-brand/5 flex items-center gap-1">
              <Zap className="w-3 h-3" /> LIVE
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {AI_INSIGHTS.map((insight, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    insight.type === "Alert" ? "bg-amber-500/20 text-amber-500" :
                    insight.type === "Opportunity" ? "bg-brand/20 text-brand" :
                    "bg-[#00d2ff]/20 text-[#00d2ff]"
                  }`}>{insight.type}</span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">{insight.time}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{insight.title}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
            {[
              { label: "Sharpe",  value: "1.82" },
              { label: "Beta",    value: "0.94" },
              { label: "VaR 95%", value: "−2.1%" },
            ].map((m, i) => (
              <div key={i} className="text-center">
                <div className="text-xs text-gray-500 font-mono mb-1">{m.label}</div>
                <div className="text-sm font-bold text-white">{m.value}</div>
              </div>
            ))}
          </div>

          <button className="w-full py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors border border-white/5 rounded-xl hover:border-white/10 hover:bg-white/5">
            View All Insights →
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-panel rounded-2xl border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-brand" /> Recent Activity
        </h3>
        <div className="space-y-3">
          {[
            { action: "BUY",  asset: "NVDA",  qty: "10 shares",  price: "$87.50",   time: "Today, 09:34",   color: "text-brand"     },
            { action: "SELL", asset: "TSLA",  qty: "5 shares",   price: "$165.20",  time: "Today, 11:12",   color: "text-red-400"   },
            { action: "BUY",  asset: "BTC",   qty: "0.12 BTC",   price: "$64,200",  time: "Yesterday",      color: "text-brand"     },
            { action: "BUY",  asset: "ETH",   qty: "1.5 ETH",    price: "$3,100",   time: "Yesterday",      color: "text-brand"     },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${tx.action === "BUY" ? "border-brand/30 text-brand bg-brand/5" : "border-red-500/30 text-red-400 bg-red-500/5"}`}>{tx.action}</span>
                <div>
                  <div className="font-bold text-white">{tx.asset}</div>
                  <div className="text-xs text-gray-500 font-mono">{tx.qty}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-white font-mono">{tx.price}</div>
                <div className="text-[10px] text-gray-500 font-mono">{tx.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
