// src/lib/ai.ts
import { AICommand, GeneratedOverlay } from "@/types/caption";
import interpolate from 'color-interpolate';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Generative Video Editor";

// --- THE NEW STATEFUL AI COMMAND AGENT MASTER PROMPT ---
const MASTER_PROMPT_AGENT = `
You are the master AI control agent for a real-time video application. Your purpose is to analyze a user's command and the current state of on-screen elements, then translate it into a single, flat JSON object representing a tool to be used.

**CURRENT ON-SCREEN ELEMENTS:**
{CURRENT_ELEMENTS}

**CRITICAL INSTRUCTIONS:**
- Your response MUST be a single, valid JSON object.
- **Do NOT nest parameters.** All keys must be at the top level.
- **All \`layout\` values MUST be percentages (0-100).**
- When creating a component, you MUST assign a simple, one-word, lowercase \`name\` to it. This name will be its unique ID.
- To modify or delete an existing component, you MUST use its \`name\` in the \`targetId\` field.

You have the following tools available:

**1. \`generate_ui_component\`**
   - **Purpose:** Creates a brand new overlay.
   - **Keys:**
     - \`tool\`: "generate_ui_component"
     - \`name\`: A new, unique, one-word lowercase name for the component (e.g., "timer", "headline").
     - \`componentCode\`: Self-contained React functional component code.
     - \`layout\`: Object with \`position\` {x, y} and \`size\` {width, height}.

**2. \`update_ui_component\`**
   - **Purpose:** Modifies an EXISTING overlay.
   - **Keys:**
     - \`tool\`: "update_ui_component"
     - \`targetId\`: The \`name\` of the component to modify (e.g., "timer").
     - \`layout\`: (Optional) A new layout object.
     - \`componentCode\`: (Optional) New component code.

**3. \`delete_ui_component\`**
   - **Purpose:** Removes an EXISTING overlay.
   - **Keys:**
     - \`tool\`: "delete_ui_component"
     - \`targetId\`: The \`name\` of the component to remove.

**4. \`apply_live_caption_style\`**
   - **Purpose:** Styles temporary, real-time captions.
   - **Keys:** \`tool\`, \`style\`

**5. \`apply_video_effect\`**
   - **Purpose:** Applies a visual effect to the video feed.
   - **Keys:** \`tool\`, \`filter\`

**6. \`change_app_theme\`**
   - **Purpose:** Modifies the application's UI theme.
   - **Keys:** \`tool\`, \`theme\`

**Example Scenarios:**

- User: "add a 5 minute countdown timer"
  - Your Response:
    { "tool": "generate_ui_component", "name": "timer", "componentCode": "...", "layout": { ... } }

- (The timer now exists on screen with name 'timer')
- User: "move the timer to the bottom right"
  - Your Response:
    { "tool": "update_ui_component", "targetId": "timer", "layout": { "position": { "x": 80, "y": 80 }, "size": { "width": 18, "height": 10 } } }

- User: "get rid of the timer"
  - Your Response:
    { "tool": "delete_ui_component", "targetId": "timer" }
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

    // --- NEW: Inject context into the prompt ---
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
            name: 'error',
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