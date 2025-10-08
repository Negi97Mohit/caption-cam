// src/lib/ai.ts
import { AICommand, GeneratedOverlay } from "@/types/caption";
import interpolate from 'color-interpolate';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- THE NEW MULTI-TOOL AI COMMAND AGENT MASTER PROMPT ---
const MASTER_PROMPT_AGENT = `
You are the master AI control agent for a real-time video application. Your purpose is to analyze a user's command and the current on-screen context, then formulate a plan.

**CURRENT ON-SCREEN ELEMENTS:**
{CURRENT_ELEMENTS}

**RESPONSE STRATEGY:**
1.  **For simple, single-step commands**, respond with a single JSON action object.
2.  **For complex commands that require multiple steps**, you MUST respond with a single JSON object where \`tool\` is "multi_tool_reasoning". This object will contain an \`actions\` array, with each element being a single JSON action object to be executed in sequence.

**CRITICAL INSTRUCTIONS:**
- Your response MUST ALWAYS be a single, valid JSON object.
- **Do NOT nest parameters.** All keys for single actions must be at the top level of their respective objects.
- **All \`layout\` values MUST be percentages (0-100).**
- When creating a component, you MUST assign a simple, one-word, lowercase \`name\`.

--- TOOLS REFERENCE ---

**Tool Wrapper for Complex Commands:**
- \`tool\`: "multi_tool_reasoning"
  - \`actions\`: An array of single-action objects from the list below.

**Available Single Actions:**
1.  \`generate_ui_component\`: Creates a new overlay.
    - Keys: \`tool\`, \`name\`, \`componentCode\`, \`layout\`
2.  \`update_ui_component\`: Modifies an existing overlay.
    - Keys: \`tool\`, \`targetId\`, \`layout\`, \`componentCode\`
3.  \`delete_ui_component\`: Removes an existing overlay.
    - Keys: \`tool\`, \`targetId\`
4.  \`apply_video_effect\`: Applies a CSS filter to the video.
    - Keys: \`tool\`, \`filter\`
5.  \`apply_live_caption_style\`: Styles temporary captions.
    - Keys: \`tool\`, \`style\`
6.  \`change_app_theme\`: Changes the application's UI colors.
    - Keys: \`tool\`, \`theme\`
    - **IMPORTANT**: The 'theme' value MUST be an object. Example: { "primary": "#8A2BE2", "background": "#1A1A1A" }

--- EXAMPLE SCENARIOS ---

- User: "make the video black and white" (Simple Command)
- Your Response (Single Action):
  {
    "tool": "apply_video_effect",
    "filter": "grayscale(100%)"
  }

- User: "add a headline that says 'Welcome' and blur my background" (Complex Command)
- Your Response (Multi-Action Plan):
  {
    "tool": "multi_tool_reasoning",
    "actions": [
      {
        "tool": "generate_ui_component",
        "name": "headline",
        "componentCode": "() => <h1 style={{fontSize: '3rem', color: 'white', textShadow: '2px 2px 4px black'}}>Welcome</h1>",
        "layout": { "position": { "x": 50, "y": 20 }, "size": { "width": 50, "height": 15 }, "zIndex": 10 }
      },
      {
        "tool": "apply_video_effect",
        "filter": "blur(8px)"
      }
    ]
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

const isValidHex = (color: string) => /^#([0-9A-F]{3}){1,2}$/i.test(color);

export async function processCommandWithAgent(command: string, activeOverlays: GeneratedOverlay[]): Promise<AICommand | null> {
    if (!API_KEY) {
        console.error("API Key Missing");
        return {
            tool: 'generate_ui_component',
            name: 'error',
            componentCode: "() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>API Key Missing in .env file.</div>",
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 }, zIndex: 100 }
        };
    }

    const elementsContext = activeOverlays.length > 0
        ? "You can modify or delete the following components by using their 'name' as the 'targetId':\n" + activeOverlays.map(o => `- Component named '${o.name}'`).join("\n")
        : "There are currently no elements on the screen. You can only generate new ones.";
        
    const finalPrompt = MASTER_PROMPT_AGENT.replace('{CURRENT_ELEMENTS}', elementsContext);

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
                    { role: "system", content: finalPrompt },
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
            }
        }
        return cmd as AICommand;
    } catch (err) {
        console.error("processCommandWithAgent error:", err);
         return {
            tool: 'generate_ui_component',
            name: 'error',
            componentCode: `() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>Error: ${ (err as any).message }</div>`,
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 }, zIndex: 100 }
        };
    }
}

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