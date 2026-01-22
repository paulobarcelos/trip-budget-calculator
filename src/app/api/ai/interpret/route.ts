import { NextResponse } from "next/server";
import { parseAiResponse } from "@/utils/aiActions";
import { TripState } from "@/types";

const MODEL = "gemini-3-flash-preview";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_PROMPT_CHARS = 2400;
const MAX_CONTEXT_CHARS = 120000;

const allowedOrigins = (() => {
  const origins = new Set<string>();
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    origins.add(`https://${vercelUrl}`);
  }
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicUrl) {
    origins.add(publicUrl);
  }
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");
  return origins;
})();

const isAllowedOrigin = (origin: string | null, host: string | null) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (host && origin.includes(host)) return true;
  return false;
};

const responseSchema = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          expenseType: { type: "string" },
          name: { type: "string" },
          currency: { type: "string" },
          totalCost: { type: "number" },
          dailyCost: { type: "number" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          splitMode: { type: "string" },
          travelerId: { type: "string" },
          travelerName: { type: "string" },
          newName: { type: "string" },
          expenseId: { type: "string" },
          expenseName: { type: "string" },
          travelerIds: { type: "array", items: { type: "string" } },
          travelerNames: { type: "array", items: { type: "string" } },
          date: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  required: ["actions"],
};

const extractJsonText = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
    if (withoutFence.trim()) return withoutFence.trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
};

const buildSystemPrompt = () => `
You are the Trip Budget assistant. Convert the user request into structured JSON actions.

Rules:
- Respond with JSON ONLY that matches the response schema.
- Use ISO dates: YYYY-MM-DD.
- If an expense or traveler is missing, add it first.
- Prefer IDs if provided in the context; otherwise use exact names.
- Daily shared split modes:
  - "dailyOccupancy" = Daily Cost Split
  - "stayWeighted" = Person-Day Rate
- Never invent currencies; use 3-letter codes when possible.
`;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!isAllowedOrigin(origin, host)) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
  }

  let body: { prompt?: string; tripState?: TripState };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: "Prompt too long." }, { status: 400 });
  }

  const tripState = body.tripState;
  const context = tripState
    ? {
        travelers: tripState.travelers,
        dailySharedExpenses: tripState.dailySharedExpenses,
        dailyPersonalExpenses: tripState.dailyPersonalExpenses,
        oneTimeSharedExpenses: tripState.oneTimeSharedExpenses,
        oneTimePersonalExpenses: tripState.oneTimePersonalExpenses,
        usageCosts: tripState.usageCosts,
        displayCurrency: tripState.displayCurrency,
      }
    : null;

  const contextJson = JSON.stringify(context ?? {});
  if (contextJson.length > MAX_CONTEXT_CHARS) {
    return NextResponse.json({ error: "Trip context too large." }, { status: 400 });
  }

  const userPrompt = `User request:\n${prompt}\n\nTrip context JSON:\n${contextJson}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return NextResponse.json({ error: "Gemini request failed." }, { status: 502 });
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini error:", response.status, errorBody);
    return NextResponse.json({ error: "Gemini error.", details: errorBody }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return NextResponse.json({ error: "Invalid Gemini response." }, { status: 502 });
  }

  const text =
    (data as any)?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  if (!text) {
    return NextResponse.json({ error: "Gemini returned no content." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    const extracted = extractJsonText(text);
    parsed = JSON.parse(extracted);
  } catch (error) {
    console.error("Failed to parse Gemini JSON output:", error);
    return NextResponse.json({ error: "Gemini returned invalid JSON." }, { status: 502 });
  }

  const { response: parsedResponse, errors } = parseAiResponse(parsed);
  if (!parsedResponse) {
    return NextResponse.json({ error: "No valid actions returned.", details: errors }, { status: 422 });
  }

  return NextResponse.json({
    ...parsedResponse,
    parseWarnings: errors,
  });
}
