import { AIDecision } from "@/types/caption";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = import.meta.env.VITE_APP_SITE_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;

const responseCache = new Map<string, { decision: AIDecision; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(transcript: string): string {
  return transcript.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedResponse(transcript: string): AIDecision | null {
  const key = getCacheKey(transcript);
  const cached = responseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.decision;
  }
  
  if (cached) {
    responseCache.delete(key);
  }
  
  return null;
}

function cacheResponse(transcript: string, decision: AIDecision): void {
  const key = getCacheKey(transcript);
  responseCache.set(key, { decision, timestamp: Date.now() });
  
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

const SYSTEM_PROMPT = `You analyze speech transcripts for live video captions with modern TikTok/Instagram Reels style formatting.

INTENT DETECTION & POSITIONING:

1. TITLE (top center, large, bold):
   - Triggers: "let's talk about", "this is about", "today we're discussing", "the topic is"
   - Position: top-center (x: 50, y: 15)
   - Format: UPPERCASE, short
   - Example: "let's talk about quantum physics" → "QUANTUM PHYSICS"

2. QUESTION (top-right or top-left, tilted):
   - Triggers: contains "?" or "the question is", "here's a question"
   - Position: top-right (x: 75, y: 20) or top-left (x: 25, y: 20)
   - Format: Keep full question with ?
   - Example: "why do birds migrate" → "Why do birds migrate?"

3. LIST (left or right side, vertical):
   - Triggers: "first", "second", "third", "these are", enumeration
   - Position: left-side (x: 15, y: 50) or right-side (x: 85, y: 50)
   - Format: Bullet points or numbered
   - Example: "three reasons first cost second quality" → "1. Cost\n2. Quality"

4. QUOTE/EMPHASIS (center, large):
   - Triggers: "remember this", "key point", "important", "quote"
   - Position: center (x: 50, y: 40)
   - Format: Quoted or emphasized
   - Example: "remember this never give up" → "NEVER GIVE UP"

5. STAT/NUMBER (corner, highlighted):
   - Triggers: percentages, large numbers, data
   - Position: top-right (x: 80, y: 15) or bottom-right (x: 80, y: 85)
   - Format: Large number + label
   - Example: "sales increased by 47 percent" → "47%\nSALES ↑"

6. LIVE (bottom center, temporary):
   - Default conversation
   - Position: bottom-center (x: 50, y: 85)
   - Format: Compressed, clear
   - Duration: 4 seconds

7. HIDE: Pure filler ("um", "uh")

POSITIONING RULES:
- Titles: Always top-center
- Questions: Alternate top-left/top-right for variety
- Lists: Left or right side (vertical layout)
- Quotes: Center screen (40-50% y)
- Stats: Corners
- Live captions: Bottom center

OUTPUT JSON:
{
  "decision": "SHOW" | "HIDE",
  "type": "live" | "highlight",
  "duration": number | "permanent",
  "formattedText": "display-ready text",
  "captionIntent": "title" | "question" | "list" | "quote" | "stat" | "live",
  "position": {"x": number, "y": number}
}`;

const baseFallback: AIDecision = {
  decision: "SHOW",
  type: "live",
  duration: 4,
  formattedText: "",
  captionIntent: "live",
  position: { x: 50, y: 85 },
};

export async function formatCaptionWithAI(transcript: string): Promise<AIDecision> {
  if (!transcript || !transcript.trim()) {
    return { ...baseFallback, decision: "HIDE", formattedText: "" };
  }

  const cached = getCachedResponse(transcript);
  if (cached) {
    return cached;
  }

  try {
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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript }
        ],
        temperature: 0.2,
        max_tokens: 250,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`AI API error: ${res.status}`);
    }

    const data = await res.json();
    let rawContent = data?.choices?.[0]?.message?.content || "{}";
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsed = JSON.parse(rawContent);
    
    if (!parsed.decision || !parsed.formattedText) {
      const fallbackResult = {
        ...baseFallback,
        formattedText: transcript.trim().slice(0, 100),
      };
      cacheResponse(transcript, fallbackResult);
      return fallbackResult;
    }

    const result: AIDecision = {
      decision: parsed.decision as "SHOW" | "HIDE",
      type: parsed.type as "live" | "highlight",
      duration: parsed.duration,
      formattedText: parsed.formattedText,
      captionIntent: parsed.captionIntent || "live",
      position: parsed.position || baseFallback.position,
    };

    cacheResponse(transcript, result);
    return result;

  } catch (err) {
    console.error("formatCaptionWithAI error:", err);
    const errorResult = { 
      ...baseFallback, 
      formattedText: transcript.trim().slice(0, 100) 
    };
    return errorResult;
  }
}