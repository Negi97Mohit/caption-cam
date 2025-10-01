import { AIDecision } from "@/types/caption";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = import.meta.env.VITE_APP_SITE_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;

// Response cache to prevent redundant API calls
const responseCache = new Map<string, { decision: AIDecision; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(transcript: string): string {
  // Normalize transcript for cache key
  return transcript.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedResponse(transcript: string): AIDecision | null {
  const key = getCacheKey(transcript);
  const cached = responseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("Using cached AI response");
    return cached.decision;
  }
  
  // Clean expired entries
  if (cached) {
    responseCache.delete(key);
  }
  
  return null;
}

function cacheResponse(transcript: string, decision: AIDecision): void {
  const key = getCacheKey(transcript);
  responseCache.set(key, { decision, timestamp: Date.now() });
  
  // Limit cache size
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

/**
 * Try to extract the first valid JSON object from a string.
 * This is not intent-logic – it's only to safely recover valid JSON
 * if the model wrapped it in text / fences.
 */
function safeParseJsonFromString(s: string | null): any | null {
  if (!s) return null;
  // fenced code block
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    try { return JSON.parse(fenced[1]); } catch (_) {}
  }
  // find first {...} block
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const sub = s.substring(first, last + 1);
    try { return JSON.parse(sub); } catch (_) {}
  }
  // try tolerant replacement (single quotes -> double quotes, unquoted keys)
  const relaxed = s
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":') // unquoted keys
    .replace(/'/g, '"');
  try { return JSON.parse(relaxed); } catch (_) {}
  return null;
}

const baseFallback: AIDecision = {
  decision: "SHOW",
  type: "live",
  duration: 4,
  formattedText: "",
};

const ENHANCED_SYSTEM_PROMPT = `
You are an AI assistant for a live video captioning overlay system.
You receive speech transcripts and must infer the speaker's INTENT, then output ONLY valid JSON.

OUTPUT SCHEMA (return EXACTLY this, nothing else):
{
  "decision": "SHOW" | "HIDE",
  "type": "live" | "highlight", 
  "duration": number | "permanent",
  "formattedText": "string"
}

INTENT DETECTION RULES:

1. TITLES/LABELS (permanent, prominent):
   Trigger phrases: "put a [X] title", "title:", "call it [X]", "let's talk about [X]", 
                   "this is about [X]", "chapter: [X]", "section [X]", "topic is [X]"
   Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"SHORT TITLE"}
   Example Input: "let's talk about quantum physics"
   Example Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"QUANTUM PHYSICS"}

2. QUESTIONS (permanent, styled as questions):
   Trigger: Explicit "here is a question", "the question is", "here's the question", or sentences ending with '?'
   Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"Full question"}
   Example Input: "here's a question why do birds fly south"
   Example Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"Why do birds fly south?"}

3. LISTS (permanent, bullet format):
   Trigger: "first", "second", "third", "points are", enumeration, semicolons, "let me list", "here are", "these are"
   Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"• Item1\\n• Item2"}
   Example Input: "three reasons first cost second quality third reliability"
   Example Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"• Cost\\n• Quality\\n• Reliability"}

4. QUOTES/EMPHASIS (permanent, stylized):
   Trigger: "remember this", "key point", "important", "quote", "as they say", "never forget"
   Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"emphasized text"}
   Example Input: "remember this never give up"
   Example Output: {"decision":"SHOW","type":"highlight","duration":"permanent","formattedText":"\\"Never give up\\""}

5. LIVE CONVERSATION (temporary, 3-5 seconds):
   Default for normal speech without special intent
   Output: {"decision":"SHOW","type":"live","duration":4,"formattedText":"concise caption"}
   Example Input: "so I went to the store and bought some milk"
   Example Output: {"decision":"SHOW","type":"live","duration":4,"formattedText":"Went to the store, bought milk"}

6. HIDE (filter out filler):
   Trigger: Pure filler like "um", "uh", "like", "you know", throat clearing, silence
   Output: {"decision":"HIDE","type":"live","duration":0,"formattedText":""}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown, no explanations, no extra text
- formattedText should be display-ready (proper capitalization, punctuation)
- For highlights, keep text concise but complete
- For live captions, compress to under 60 characters when possible
- Preserve question marks, exclamation points, quotation marks in formatting
- Use \\n for line breaks in lists
- Be aggressive in identifying intent patterns - prefer highlight over live when uncertain
`;

/**
 * AI-first caption formatter with caching.
 * The AI decides the intent (title / question / list / live) and returns only the JSON object.
 */
export async function formatCaptionWithAI(transcript: string): Promise<AIDecision> {
  if (!transcript || !transcript.trim()) {
    return { ...baseFallback, decision: "HIDE", formattedText: "" };
  }

  // Check cache first
  const cached = getCachedResponse(transcript);
  if (cached) {
    return cached;
  }

  // helper to call the API
  async function callModel(messages: Array<{role: string; content: string}>) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": APP_NAME,
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.0,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI API error: ${txt}`);
    }
    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? JSON.stringify(data)) as string;
    return { raw, data };
  }

  try {
    // FIRST attempt: ask the AI to produce JSON
    const first = await callModel([
      { role: "system", content: ENHANCED_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ]);

    const parsedFirst = safeParseJsonFromString(first.raw);
    if (parsedFirst && parsedFirst.decision) {
      const result = parsedFirst as AIDecision;
      cacheResponse(transcript, result);
      return result;
    }

    // SECOND attempt (repair): present the assistant's raw answer and tell the model to OUTPUT ONLY JSON now.
    const repairSystem = `
You are a strict JSON-output assistant. Previously you produced some text that may contain extra explanation or formatting.
Below is the assistant's previous raw reply and the original user transcript.
Return EXACTLY one valid JSON object (no surrounding text) that follows the schema:
{"decision":"SHOW"|"HIDE","type":"live"|"highlight","duration":number|"permanent","formattedText":"string"}

Assistant previous reply (do not repeat it): 
${first.raw.replace(/```/g, "")}

Original transcript:
${transcript}

Now – produce only the corrected JSON object. Do not add explanation.
`;
    const repair = await callModel([
      { role: "system", content: repairSystem },
      { role: "user", content: transcript },
    ]);

    const parsedRepair = safeParseJsonFromString(repair.raw);
    if (parsedRepair && parsedRepair.decision) {
      const result = parsedRepair as AIDecision;
      cacheResponse(transcript, result);
      return result;
    }

    // If the AI still didn't give parseable JSON, fallback to a safe display decision:
    const fallbackResult = {
      ...baseFallback,
      decision: "SHOW" as const,
      type: "live" as const,
      duration: 4,
      formattedText: transcript.trim().slice(0, 250),
    };
    cacheResponse(transcript, fallbackResult);
    return fallbackResult;
  } catch (err) {
    console.error("formatCaptionWithAI error:", err);
    const errorResult = { ...baseFallback, formattedText: transcript.trim().slice(0, 250) };
    return errorResult;
  }
}