"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, PieChart, ShieldCheck, Plus, X, Wallet, RefreshCw } from "lucide-react";

// ── Dummy holdings (quantities and cost basis only) ────────────────────────
const INITIAL_HOLDINGS = [
  { sym: "AAPL", name: "Apple Inc.",         qty: 45.5,  price: 186.40,  cost: 152.30, sector: "Technology",    type: "Stock"  },
  { sym: "NVDA", name: "NVIDIA Corp.",       qty: 12,    price: 874.50,  cost: 420.00, sector: "Technology",    type: "Stock"  },
  { sym: "BTC",  name: "Bitcoin",            qty: 0.45,  price: 64200,   cost: 38000,  sector: "Crypto",        type: "Crypto" },
  { sym: "ETH",  name: "Ethereum",           qty: 3.2,   price: 3150,    cost: 2100,   sector: "Crypto",        type: "Crypto" },
  { sym: "TSLA", name: "Tesla Inc.",         qty: 20,    price: 172.80,  cost: 214.60, sector: "EV/Auto",       type: "Stock"  },
  { sym: "SPY",  name: "S&P 500 ETF",       qty: 30,    price: 521.30,  cost: 460.00, sector: "ETF",           type: "ETF"    },
  { sym: "USDC", name: "USD Coin",           qty: 5000,  price: 1.00,    cost: 1.00,   sector: "Stablecoin",    type: "Crypto" },
];

const RISK_METRICS = [
  { label: "Sharpe Ratio",   value: "1.82",   good: true,  desc: "Excellent risk-adjusted return" },
  { label: "Beta",           value: "0.94",   good: true,  desc: "Slightly less volatile than market" },
  { label: "VaR 95%",        value: "−$2,491", good: false, desc: "Max daily loss at 95% confidence" },
  { label: "Max Drawdown",   value: "−14.2%", good: false, desc: "Largest peak-to-trough decline" },
  { label: "Herfindahl",     value: "0.21",   good: true,  desc: "Well-diversified portfolio" },
  { label: "Annualised σ",   value: "18.4%",  good: null,  desc: "Portfolio volatility (annualised)" },
];

// Sector pie donut (pure SVG, no charting library)
function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 80; const cx = 110; const cy = 110;
  
  const segments = data.reduce((acc, { pct, color }) => {
    const start = acc.cumulative;
    const newCumulative = start + pct;
    const startAngle = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle   = (newCumulative / 100) * 2 * Math.PI - Math.PI / 2;
    const largeArc   = pct > 50 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    
    acc.paths.push({ d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color, pct });
    acc.cumulative = newCumulative;
    return acc;
  }, { paths: [] as {d: string; color: string; pct: number}[], cumulative: 0 }).paths;
  return (
    <svg viewBox="0 0 220 220" className="w-48 h-48 drop-shadow-2xl">
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill={s.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
      ))}
      <circle cx={cx} cy={cy} r={52} fill="#0a0f0a" />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">Portfolio</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#00ff88" fontSize="11">Allocation</text>
    </svg>
  );
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState(INITIAL_HOLDINGS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ sym: "", name: "", qty: "", price: "", cost: "", sector: "Technology" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real market prices on mount and when requested
  const fetchPrices = async () => {
    setIsRefreshing(true);
    try {
      const symbols = holdings.map(h => h.sym).join(",");
      const res = await fetch(`/api/market/prices?symbols=${symbols}`);
      if (res.ok) {
        const pricesData = await res.json();
        setHoldings(prev => prev.map(h => ({
          ...h,
          price: pricesData[h.sym]?.price || h.price // Use real price if available, otherwise fallback
        })));
      }
    } catch (err) {
      console.error("Failed to fetch fresh prices:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPrices(); }, []);

  const enriched = holdings.map(h => ({
    ...h,
    value:   h.qty * h.price,
    pnl:     h.qty * (h.price - h.cost),
    pnlPct:  ((h.price - h.cost) / h.cost) * 100,
  }));

  const totalValue    = enriched.reduce((s, h) => s + h.value, 0);
  const totalInvested = enriched.reduce((s, h) => s + h.qty * h.cost, 0);
  const totalPnl      = totalValue - totalInvested;
  const pnlPct        = (totalPnl / totalInvested) * 100;

  // Sector allocation
  const sectorMap: Record<string, number> = {};
  enriched.forEach(h => { sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.value; });
  const COLORS = ["#00ff88","#00d2ff","#a855f7","#f59e0b","#ef4444","#ec4899","#6366f1"];
  const sectorData = Object.entries(sectorMap).map(([label, val], i) => ({
    label, pct: Math.round((val / totalValue) * 100), color: COLORS[i % COLORS.length],
  }));

  const addHolding = () => {
    if (!form.sym || !form.qty || !form.price) return;
    setHoldings(prev => [...prev, {
      sym: form.sym.toUpperCase(), name: form.name || form.sym.toUpperCase(),
      qty: +form.qty, price: +form.price, cost: +form.cost || +form.price, sector: form.sector, type: "Stock",
    }]);
    setForm({ sym: "", name: "", qty: "", price: "", cost: "", sector: "Technology" });
    setShowAdd(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Portfolio Analyzer</h1>
          <p className="text-gray-400 font-mono text-sm">Real-time aggregate view with Bolt.AI risk models.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPrices}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white font-medium rounded-xl text-sm transition-all ${isRefreshing ? "opacity-50" : "hover:bg-white/10 hover:-translate-y-0.5"}`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> 
            <span className="hidden sm:inline">Refresh Prices</span>
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-black font-bold rounded-xl text-sm hover:bg-brand/90 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Holding
          </button>
        </div>
      </div>

      {/* Add Holding Form */}
      {showAdd && (
        <div className="glass-panel p-6 rounded-2xl border border-brand/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white">Add New Holding</h3>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-gray-400 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "sym",     label: "Ticker",    placeholder: "AAPL"  },
              { key: "name",    label: "Name",       placeholder: "Apple Inc." },
              { key: "qty",     label: "Quantity",   placeholder: "10"    },
              { key: "price",   label: "Curr. Price ($)", placeholder: "186.40" },
              { key: "cost",    label: "Avg Cost ($)",    placeholder: "152.00" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 font-mono block mb-1">{f.label}</label>
                <input
                  value={(form as Record<string,string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 font-mono block mb-1">Sector</label>
              <select
                value={form.sector}
                onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
              >
                {["Technology","Crypto","Stablecoin","ETF","Healthcare","Energy","EV/Auto","Finance"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={addHolding} className="mt-4 px-6 py-2 bg-brand text-black font-bold rounded-xl text-sm hover:bg-brand/90 transition-colors">
            Add to Portfolio
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Value",    value: `$${totalValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: "text-white" },
          { label: "Total Invested", value: `$${totalInvested.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: "text-gray-300" },
          { label: "Total P&L",      value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: totalPnl >= 0 ? "text-brand" : "text-red-400" },
          { label: "Return %",       value: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? "text-brand" : "text-red-400" },
        ].map((c, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl border-white/5">
            <div className="text-xs text-gray-400 font-mono mb-2">{c.label}</div>
            <div className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sector Allocation */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 w-full mb-6">
            <PieChart className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-white">Sector Allocation</h3>
          </div>
          <DonutChart data={sectorData} />
          <div className="mt-6 w-full space-y-2">
            {sectorData.map((s, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-gray-300">{s.label}</span>
                </div>
                <span className="font-mono font-bold text-white">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass-panel p-6 rounded-2xl border-white/5 lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand" /> Current Holdings
            </h3>
            <span className="text-xs text-gray-500 font-mono">{holdings.length} assets</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                {["Asset","Quantity","Avg Cost","Current","Value","P&L","Risk"].map(h => (
                  <th key={h} className="pb-3 text-[10px] uppercase font-mono tracking-widest text-gray-500 font-bold pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-white/5">
              {enriched.map((h, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-4 font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs text-brand group-hover:bg-brand/10 transition-colors font-bold">{h.sym.charAt(0)}</div>
                      <div>
                        <div className="text-white">{h.sym}</div>
                        <div className="text-[10px] text-gray-500 hidden sm:block">{h.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-sm text-gray-300 pr-4">{h.qty}</td>
                  <td className="py-4 font-mono text-sm text-gray-400 pr-4">${h.cost.toLocaleString()}</td>
                  <td className="py-4 font-mono text-sm text-gray-300 pr-4">${h.price.toLocaleString()}</td>
                  <td className="py-4 font-mono text-sm font-medium pr-4">${h.value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  <td className="py-4 pr-4">
                    <div className={`flex items-center gap-1 text-sm font-mono font-bold ${h.pnl >= 0 ? "text-brand" : "text-red-400"}`}>
                      {h.pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {h.pnlPct.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className={`w-4 h-4 ${h.pnl >= 0 ? "text-brand" : "text-amber-400"}`} />
                      <span className={`text-[10px] font-bold ${h.pnl >= 0 ? "text-brand" : "text-amber-400"}`}>
                        {h.pnl >= 0 ? "Safe" : "Watch"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Metrics Grid */}
      <div className="glass-panel p-6 rounded-2xl border-white/5">
        <h3 className="font-bold text-white mb-6">Risk Dashboard</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {RISK_METRICS.map((m, i) => (
            <div key={i} className="glass-panel p-4 rounded-xl border-white/5 text-center hover:border-brand/20 transition-colors">
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">{m.label}</div>
              <div className={`text-xl font-bold font-mono ${m.good === true ? "text-brand" : m.good === false ? "text-amber-400" : "text-white"}`}>{m.value}</div>
              <div className="text-[10px] text-gray-600 mt-1 leading-tight">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
