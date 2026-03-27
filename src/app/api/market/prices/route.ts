import { NextRequest, NextResponse } from "next/server";

const COINGECKO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  AVAX: "avalanche-2",
  USDC: "usd-coin",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols");
  
  if (!symbolsParam) {
    return NextResponse.json({ error: "Missing symbols parameter" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase());
  const stocks = symbols.filter(s => !COINGECKO_MAP[s]);
  const cryptos = symbols.filter(s => COINGECKO_MAP[s]);

  const results: Record<string, { price: number; change24h: number }> = {};

  try {
    // 1. Fetch Crypto from CoinGecko
    if (cryptos.length > 0) {
      const ids = cryptos.map(c => COINGECKO_MAP[c]).join(",");
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 10 } }
      );
      if (cgRes.ok) {
        const data = await cgRes.json();
        for (const crypto of cryptos) {
          const id = COINGECKO_MAP[crypto];
          if (data[id]) {
            results[crypto] = {
              price: data[id].usd,
              change24h: data[id].usd_24h_change || 0,
            };
          }
        }
      }
    }

    // 2. Fetch Stocks from Yahoo Finance
    if (stocks.length > 0) {
      const yfPromises = stocks.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
            { next: { revalidate: 5 } }
          );
          if (!res.ok) return;
          const data = await res.json();
          const result = data.chart?.result?.[0];
          if (!result) return;
          
          const meta = result.meta;
          const currentPrice = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose;
          const changePct = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
          
          results[symbol] = {
            price: currentPrice,
            change24h: changePct,
          };
        } catch (err) {
          console.error(`Failed to fetch ${symbol} from YF:`, err);
        }
      });
      await Promise.all(yfPromises);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Market API error:", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
