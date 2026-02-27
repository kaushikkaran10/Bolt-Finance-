import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY || "";

// Direct REST API — works with any SDK version, no naming issues
// Uses v1beta which supports all current Gemini models
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Model priority list — tries each until one works
const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const SYSTEM_PROMPT = `You are FinAI, the NovaX AI Financial Advisor — an expert quant analyst and portfolio strategist.

User's portfolio context:
- AAPL (45.5 shares @ $182.40 avg), NVDA (12 @ $420), BTC (0.45 @ $38k avg), ETH (3.2 @ $2,100), TSLA (20 @ $214.60), SPY (30 @ $460), USDC ($5,000)
- Total Value: ~$124,592 | Sharpe: 1.82 | Beta: 0.94 | VaR 95%: -$2,491/day
- Prediction accuracy: 76% (22/29 correct) | Level 4 Quant | 7-day learning streak

Style:
- Sharp, direct, data-driven. No fluff.
- Use **bold** for key numbers/terms and bullets for lists.
- Give balanced bull/bear analysis with price targets.
- Keep responses concise (2-4 sentences or a short list).
- Add a one-line risk disclaimer after any trade idea.`;

async function callGemini(
  model: string,
  contents: { role: string; parts: { text: string }[] }[]
): Promise<{ text?: string; status: number; error?: string }> {
  const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.75, topP: 0.9, maxOutputTokens: 800 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return { status: res.status, error: data?.error?.message || res.statusText };
  }

  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text, status: 200 };
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured in .env.local" }, { status: 500 });
  }

  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const contents = [
    ...history.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // Try each model in priority order
  let lastError = "";
  let rateLimited = false;

  for (const model of MODELS) {
    try {
      const result = await callGemini(model, contents);

      if (result.status === 200 && result.text) {
        return NextResponse.json({ response: result.text, model });
      }

      if (result.status === 429) {
        rateLimited = true;
        lastError = result.error ?? "Rate limited";
        console.warn(`Model ${model} rate limited, trying next...`);
        continue; // try next model
      }

      if (result.status === 404) {
        lastError = `Model ${model} not found`;
        continue; // try next model
      }

      lastError = result.error ?? `Unknown error ${result.status}`;
    } catch (err) {
      lastError = String(err);
      console.error(`Model ${model} threw:`, err);
    }
  }

  // All models failed
  if (rateLimited) {
    return NextResponse.json(
      { error: "rate_limited", message: "Gemini API rate limit reached (free tier: 15 req/min). Please wait a moment and try again." },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: "api_error", message: lastError },
    { status: 500 }
  );
}
