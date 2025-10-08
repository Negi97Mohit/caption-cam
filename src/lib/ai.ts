// src/lib/ai.ts
import { AICommand } from "@/types/caption";
import interpolate from 'color-interpolate';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Generative Video Editor";

// --- THE NEW AI COMMAND AGENT MASTER PROMPT ---
const MASTER_PROMPT_AGENT = `
You are the master AI control agent for a real-time video application. Your sole purpose is to analyze a user's natural language command and translate it into a single, flat JSON object representing a tool to be used.

**CRITICAL INSTRUCTIONS:**
- Your response MUST be a single, valid JSON object.
- **Do NOT nest the parameters inside a "parameters" key.** All keys ('tool', 'componentCode', 'layout', 'style', 'filter', 'theme') must be at the top level of the JSON object.
- **All \`layout\` position and size values MUST be percentages (a number from 0 to 100) relative to the video canvas.** For example, \`{"x": 50, "y": 50}\` is the center, and \`{"width": 25, "height": 20}\` is 25% of the canvas width and 20% of its height.

You have the following tools available:

**1. \`generate_ui_component\`**
   - **Purpose:** Creates a brand new, visible overlay component on the video canvas.
   - **Top-Level Keys:**
     - \`tool\`: "generate_ui_component"
     - \`componentCode\`: A string of self-contained React functional component code. It must use inline styles and only the 'React' import.
     - \`layout\`: An object with \`position\` {x, y} and \`size\` {width, height}, with all values as percentages (0-100).

**2. \`apply_live_caption_style\`**
   - **Purpose:** Styles the real-time, temporary captions that appear as the user is speaking.
   - **Top-Level Keys:**
     - \`tool\`: "apply_live_caption_style"
     - \`style\`: A JSON object of React inline CSS properties (e.g., \`{ "color": "red" }\`).

**3. \`apply_video_effect\`**
   - **Purpose:** Applies a real-time visual effect to the entire video feed.
   - **Top-Level Keys:**
     - \`tool\`: "apply_video_effect"
     - \`filter\`: A CSS \`filter\` string (e.g., "grayscale(100%)").

**4. \`change_app_theme\`**
   - **Purpose:** Modifies the overall look and feel of the application's user interface.
   - **Top-Level Keys:**
     - \`tool\`: "change_app_theme"
     - \`theme\`: A JSON object with \`primary\`, \`secondary\`, \`background\`, and \`foreground\` color values.

**Example Scenarios:**

- User: "add a 5 minute countdown timer"
  - Your Response (a single JSON object):
    {
      "tool": "generate_ui_component",
      "componentCode": "() => { const [timeLeft, setTimeLeft] = React.useState(300); React.useEffect(() => { if (timeLeft <= 0) return; const timer = setInterval(() => setTimeLeft(t => t - 1), 1000); return () => clearInterval(timer); }, [timeLeft]); const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60; return <div style={{ fontFamily: 'monospace', fontSize: '3rem', color: '#00ff00', backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: '10px' }}>{minutes}:{seconds < 10 ? '0' : ''}{seconds}</div>; }",
      "layout": { "position": { "x": 10, "y": 10 }, "size": { "width": 30, "height": 15 }, "zIndex": 20 }
    }

- User: "make my live captions look like they're on fire"
  - Your Response (a single JSON object):
    {
      "tool": "apply_live_caption_style",
      "style": { "background": "linear-gradient(to top, #ff8a00, #e52e71)", "color": "white", "fontWeight": "bold", "textShadow": "0 0 5px #000" }
    }
`;

function robustJsonParse(text: string): any | null {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
    const jsonString = text.substring(firstBrace, lastBrace + 1);
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("JSON.parse failed:", error);
        return null;
    }
}

// Helper to check if a string is a valid hex color
const isValidHex = (color: string) => /^#([0-9A-F]{3}){1,2}$/i.test(color);

export async function processCommandWithAgent(command: string): Promise<AICommand | null> {
    if (!API_KEY) {
        console.error("API Key Missing");
        return {
            tool: 'generate_ui_component',
            componentCode: "() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>API Key Missing in .env file.</div>",
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 }, zIndex: 100 }
        };
    }

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: MASTER_PROMPT_AGENT },
                    { role: "user", content: command }
                ],
                temperature: 0.5,
                response_format: { type: "json_object" },
            }),
        });

        if (!res.ok) throw new Error(`AI API error: ${res.status}`);
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");

        const parsedCommand = robustJsonParse(content);
        if (!parsedCommand) throw new Error("Failed to parse valid JSON from AI response.");

        // FIX: Wrap theme generation in a try/catch to prevent crashes
        const cmd: any = parsedCommand;
        if (cmd.tool === 'change_app_theme' && cmd.theme) {
            try {
                const theme = cmd.theme;
                const primary = isValidHex(theme.primary) ? theme.primary : '#8A2BE2';
                const background = isValidHex(theme.background) ? theme.background : '#000000';

                const colormap = interpolate([primary, '#FFFFFF']);
                theme.primary_foreground = colormap(0.9);

                const bgColormap = interpolate([background, '#FFFFFF']);
                theme.card = bgColormap(0.1);
                theme.border = bgColormap(0.15);
            } catch (themeError) {
                console.error("Could not generate theme from AI colors:", themeError);
                // The command can still proceed without the derived colors.
            }
        }
        return cmd as AICommand;
    } catch (err) {
        console.error("processCommandWithAgent error:", err);
         return {
            tool: 'generate_ui_component',
            componentCode: `() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>Error: ${ (err as any).message }</div>`,
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 }, zIndex: 100 }
        };
    }
}

// Simple fallback formatter for captions when advanced AI is unavailable
import type { AIDecision } from "@/types/caption";
export async function formatCaptionWithAI(text: string): Promise<AIDecision> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { decision: 'HIDE', type: 'live', duration: 0, formattedText: '' };
  }
  return {
    decision: 'SHOW',
    type: 'live',
    duration: 4,
    formattedText: trimmed,
  };
}