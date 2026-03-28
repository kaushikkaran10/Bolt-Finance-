import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const range = searchParams.get("range") || "3mo";
  const interval = searchParams.get("interval") || "1d";

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  // Map crypto symbols (like BTC) to Yahoo Finance format (BTC-USD)
  const isCrypto = ["BTC", "ETH", "SOL", "AVAX"].includes(symbol);
  const yfSymbol = isCrypto ? `${symbol}-USD` : symbol;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yfSymbol}?interval=${interval}&range=${range}`,
      { next: { revalidate: 10 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Format for lightweight-charts
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    const opens: number[] = quote.open || [];
    const highs: number[] = quote.high || [];
    const lows: number[] = quote.low || [];
    const closes: number[] = quote.close || [];
    
    const validData = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Must ignore nulls from YF
      if (opens[i] !== null && closes[i] !== null) {
        validData.push({
          time: new Date(timestamps[i] * 1000).toISOString().split('T')[0], // YYYY-MM-DD
          open: opens[i],
          high: highs[i],
          low: lows[i],
          close: closes[i],
        });
      }
    }

    return NextResponse.json(validData);
  } catch (error) {
    console.error(`Candle API error for ${symbol}:`, error);
    return NextResponse.json({ error: "Failed to fetch candlestick data" }, { status: 500 });
  }
}
