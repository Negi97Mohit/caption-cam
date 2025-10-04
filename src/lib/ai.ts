// src/lib/ai.ts

import { AIDecision, EditAction, GraphObject } from "@/types/caption";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = import.meta.env.VITE_APP_SITE_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;

const AUTOCORRECT_PROMPT = `You are an autocorrection service. Correct any spelling, grammar, or transcription errors in the user's text. Only return the corrected text, nothing else. Do not add any commentary or labels.`;

export async function autocorrectTranscript(transcript: string): Promise<string> {
  if (!transcript.trim()) {
    return "";
  }
  try {
    const response = await fetch(API_URL, {
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
          { role: "system", content: AUTOCORRECT_PROMPT },
          { role: "user", content: transcript },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("Autocorrect API error:", await response.text());
      return transcript;
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Failed to autocorrect transcript:", error);
    return transcript;
  }
}

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

const GRAPH_SYSTEM_PROMPT = `You are a data visualization AI assistant. You help users build graphs incrementally through voice commands.

CRITICAL RULE - CREATE vs UPDATE:
- If CONTEXT shows "EXISTING GRAPH" with a graph type, you MUST use "command": "UPDATE"
- ONLY use "command": "CREATE" if CONTEXT says "No existing graph"
- When UPDATING: Return the COMPLETE data array (old data + new data)
- NEVER replace existing data - always append to it

OTHER RULES:
1. Parse data values carefully - handle percentages, numbers with units, etc.
2. Set status to "COMPLETE" when graph has title and 2+ data points
3. Set status to "INCOMPLETE" if it needs more data
4. When updating config (title, labels), preserve existing values if not mentioned

RESPONSE FORMAT (JSON only):
{
  "command": "CREATE" | "UPDATE",
  "status": "COMPLETE" | "INCOMPLETE",
  "graphType": "bar" | "line" | "pie",
  "data": [{"label": "string", "value": number}],
  "config": {
    "title": "string",
    "xAxisLabel": "string", 
    "yAxisLabel": "string"
  }
}

EXAMPLES:

User: "create a bar graph with streaming services on x-axis and market share on y-axis"
Context: No existing graph
Response: {
  "command": "CREATE",
  "status": "INCOMPLETE",
  "graphType": "bar",
  "data": [],
  "config": {
    "title": "Streaming Services Market Share",
    "xAxisLabel": "Streaming Services",
    "yAxisLabel": "Market Share (%)"
  }
}

User: "add Netflix with 45 percent"
Context: EXISTING GRAPH with data: []
Response: {
  "command": "UPDATE",
  "status": "INCOMPLETE",
  "data": [{"label": "Netflix", "value": 45}],
  "config": {}
}

User: "add Disney Plus with 25%"
Context: EXISTING GRAPH with data: [{"label": "Netflix", "value": 45}]
Response: {
  "command": "UPDATE",
  "status": "COMPLETE",
  "data": [{"label": "Netflix", "value": 45}, {"label": "Disney Plus", "value": 25}],
  "config": {}
}

User: "change the title to Zoom Usage"
Context: EXISTING GRAPH with title: "Streaming Services"
Response: {
  "command": "UPDATE",
  "status": "INCOMPLETE",
  "data": [],
  "config": {"title": "Zoom Usage"}
}

User: "let's add Microsoft Teams with 44 percent"
Context: EXISTING GRAPH title: "Zoom Usage", data: [{"label": "Zoom", "value": 56}]
Response: {
  "command": "UPDATE",
  "status": "COMPLETE",
  "data": [{"label": "Zoom", "value": 56}, {"label": "Microsoft Teams", "value": 44}],
  "config": {}
}`;

export async function processGraphCommand(
  command: string,
  existingGraph?: GraphObject
): Promise<Partial<GraphObject> | null> {
  const context = existingGraph
    ? `EXISTING GRAPH (You MUST use UPDATE command):
Graph Type: ${existingGraph.graphType}
Title: "${existingGraph.config.title || 'Untitled'}"
X-Axis Label: "${existingGraph.config.xAxisLabel || 'Not set'}"
Y-Axis Label: "${existingGraph.config.yAxisLabel || 'Not set'}"
Current Data (${existingGraph.data.length} points): ${JSON.stringify(existingGraph.data, null, 2)}`
    : "No existing graph - this is a NEW graph creation (use CREATE command).";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": APP_NAME,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: GRAPH_SYSTEM_PROMPT },
          { role: "user", content: `${context}\n\nUSER COMMAND: "${command}"` },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Graph command API failed:", errorText);
      throw new Error("Graph command API failed");
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const parsed = JSON.parse(rawContent);
    
    console.log("Graph AI Response:", parsed);
    
    // Validation: If we have an existing graph, force UPDATE command
    if (existingGraph && parsed.command === 'CREATE') {
      console.warn("AI returned CREATE when UPDATE expected. Forcing UPDATE.");
      parsed.command = 'UPDATE';
    }
    
    // For updates, preserve the graph type from existing graph
    if (parsed.command === 'UPDATE' && existingGraph) {
      parsed.graphType = existingGraph.graphType;
      
      // Merge config - preserve existing values if new ones aren't provided
      parsed.config = {
        title: parsed.config?.title || existingGraph.config.title,
        xAxisLabel: parsed.config?.xAxisLabel || existingGraph.config.xAxisLabel,
        yAxisLabel: parsed.config?.yAxisLabel || existingGraph.config.yAxisLabel,
      };
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to process graph command:", error);
    return null;
  }
}

// src/lib/ai.ts

const EDIT_SYSTEM_PROMPT = `You are an AI assistant for editing on-screen overlays via voice. You receive a command and context about overlays with unique "name" properties.

MATCHING RULES (CRITICAL):
- User says "title 1", "title one", "the title" → Match overlay with name "Title 1"
- User says "list 2", "list two", "the list" → Match overlay with name "List 2"  
- User says "graph", "the graph", "graph one" → Match overlay with name "Graph 1"
- Be VERY flexible with number words (one, two, first, second) and articles (the, a)
- When only ONE overlay of a type exists, "the [type]" always matches it

COMMAND TYPES:

1. EDIT - Replace entire text
   Examples: "change title to X", "edit quote to Y", "update the title"

2. APPEND - Add to end (lists mainly)
   Examples: "add another point", "add item to list", "append X to list 1"

3. DELETE_LINE - Remove specific line (lists mainly)
   Examples: "remove second item", "delete line 3", "remove first point from list"

4. EDIT_LINE - Change specific line (lists mainly)
   Examples: "change first item to X", "edit line 2 to Y", "update third point"

5. GRAPH_ADD - Add data to graph
   Examples: "add Netflix with 45%", "add data point X with value Y"

6. GRAPH_CONFIG - Change graph properties
   Examples: "change title to X", "update graph title"

OUTPUT JSON:
{
  "command": "EDIT" | "APPEND" | "DELETE_LINE" | "EDIT_LINE" | "GRAPH_ADD" | "GRAPH_CONFIG",
  "targetId": "overlay-id-from-context",
  "newText"?: "text for EDIT/APPEND/EDIT_LINE",
  "lineNumber"?: number for DELETE_LINE/EDIT_LINE (1-based),
  "graphData"?: {"label": "X", "value": number} for GRAPH_ADD,
  "graphConfig"?: {"title"?: "X", "xAxisLabel"?: "Y"} for GRAPH_CONFIG
}

EXAMPLES:

Context: [{"id":"1", "name":"Title 1", "type":"caption", "text":"OLD TITLE"}]
Command: "change the title to Machine Learning"
Output: {"command":"EDIT", "targetId":"1", "newText":"MACHINE LEARNING"}

Context: [{"id":"2", "name":"List 1", "type":"caption", "text":"1. First\\n2. Second"}]
Command: "add a third point about AI"
Output: {"command":"APPEND", "targetId":"2", "newText":"\\n3. About AI"}

Context: [{"id":"2", "name":"List 1", "type":"caption", "text":"1. First\\n2. Second\\n3. Third"}]
Command: "remove the second item"
Output: {"command":"DELETE_LINE", "targetId":"2", "lineNumber":2}

Context: [{"id":"2", "name":"List 1", "type":"caption", "text":"1. First\\n2. Old text"}]
Command: "change first item to Introduction"
Output: {"command":"EDIT_LINE", "targetId":"2", "lineNumber":1, "newText":"Introduction"}

Context: [{"id":"3", "name":"Graph 1", "type":"graph", "data":[{"label":"Netflix","value":45}]}]
Command: "add Disney Plus with 25 percent"
Output: {"command":"GRAPH_ADD", "targetId":"3", "graphData":{"label":"Disney Plus", "value":25}}

Context: [{"id":"3", "name":"Graph 1", "type":"graph"}]
Command: "change the title to Streaming Services"
Output: {"command":"GRAPH_CONFIG", "targetId":"3", "graphConfig":{"title":"Streaming Services"}}`;

export async function processEditCommand(
  command: string,
  overlays: Array<AIDecision | GraphObject>
): Promise<any | null> {
  // Build simplified context for AI
  const context = overlays.map(overlay => {
    if ('graphType' in overlay) {
      // It's a graph
      return {
        id: overlay.id,
        name: overlay.name,
        type: 'graph',
        graphType: overlay.graphType,
        data: overlay.data,
        config: overlay.config
      };
    } else {
      // It's a caption
      return {
        id: overlay.id,
        name: overlay.name,
        type: 'caption',
        intent: overlay.captionIntent,
        text: overlay.formattedText
      };
    }
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": APP_NAME,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: EDIT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `OVERLAYS ON SCREEN:\n${JSON.stringify(context, null, 2)}\n\nUSER COMMAND: "${command}"`
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Edit API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    
    console.log("Edit AI Response:", parsed);
    return parsed;
  } catch (error) {
    console.error("Failed to process edit command:", error);
    return null;
  }
}