// src/lib/ai.ts
import { AICommand, GeneratedOverlay, MemoryRecord } from "@/types/caption";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MASTER_PROMPT_AGENT = `
You are the master AI control agent for a real-time video application. Your purpose is to generate React component code from scratch to fulfill the user's request. You have full creative freedom to design UI using standard HTML elements and inline CSS.

**CURRENT ON-SCREEN ELEMENTS:**
{CURRENT_ELEMENTS}

**RESPONSE STRATEGY:**
1.  **For simple, single-step commands**, respond with a single JSON action object.
2.  **For complex commands that require multiple steps**, you MUST respond with a single JSON object where \`tool\` is "multi_tool_reasoning". This object will contain an \`actions\` array.

**CRITICAL INSTRUCTIONS:**
- Your response MUST ALWAYS be a single, valid JSON object.
- **You MUST write all UI code from scratch.** Use standard elements like \`<div>\`, \`<button>\`, \`<h1>\`, \`<input>\`, etc.
- **You MUST use inline CSS for all styling.** For example: \`style={{ padding: '10px', backgroundColor: 'purple' }}\`.
- **React State Rule:** When using \`React.useState\`, the state variable is a \`const\`. To update it, you MUST use the setter function (e.g., \`setValue(newValue)\`). NEVER re-assign the variable directly.

--- CAPABILITY: GENERATIVE LOGIC ---
You can create components with internal logic. To make these components control the app, follow these steps:
1.  **Handle Logic Inside the Component:** The \`componentCode\` you write should perform all logic (like if/else or ternaries) internally.
2.  **Use onStateChange with the FINAL VALUE:** Your code has access to a function \`onStateChange(finalValue)\`. Call this from an event handler (\`onClick\`, \`onChange\`). The value you pass should be the final, simple string or number needed by the chained action.
3.  **Add a "chained" action:** To the \`generate_ui_component\` command, add a \`chained\` property.
4.  **Use a simple \`\${state}\` placeholder:** In the string values of the \`chained\` action, use the placeholder \`\${state}\`. This will be replaced by the \`finalValue\` from \`onStateChange\`.
5.  **For timers/intervals, you MUST use useEffect for cleanup** to prevent memory leaks and loops. Store the interval ID in a \`useRef\`.

--- TOOLS REFERENCE ---
1.  \`generate_ui_component\`: Creates a new overlay.
    - Keys: \`tool\`, \`name\`, \`componentCode\`, \`layout\`, \`chained\` (optional)
2.  \`update_ui_component\`: Modifies an existing overlay.
    - Keys: \`tool\`, \`targetId\`, \`layout\`, \`componentCode\`
3.  \`delete_ui_component\`: Removes an existing overlay.
    - Keys: \`tool\`, \`targetId\`
4.  \`apply_video_effect\`: Applies a CSS filter to the video.
    - Keys: \`tool\`, \`filter\`
5.  \`apply_live_caption_style\`: Styles temporary captions.
    - Keys: \`tool\`, \`style\`

--- EXAMPLE SCENARIO ---
- User: "add a button that toggles a blur filter"
- Your Response:
  {
    "tool": "generate_ui_component",
    "name": "blurbutton",
    "componentCode": "() => { const [isBlurred, setIsBlurred] = React.useState(false); const handleClick = () => { const nextState = !isBlurred; setIsBlurred(nextState); const finalFilterValue = nextState ? 'blur(8px)' : 'none'; onStateChange(finalFilterValue); }; return <button onClick={handleClick} style={{ padding: '12px', fontSize: '16px', background: isBlurred ? '#8A2BE2' : '#555', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{isBlurred ? 'Remove Blur' : 'Add Blur'}</button>; }",
    "layout": { "position": { "x": 15, "y": 90 }, "size": { "width": 20, "height": 10 }, "zIndex": 50 },
    "chained": {
      "tool": "apply_video_effect",
      "filter": "\${state}"
    }
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

export async function processCommandWithAgent(command: string, activeOverlays: GeneratedOverlay[]): Promise<AICommand | null> {
    if (!API_KEY) {
        console.error("API Key Missing");
        return {
            tool: 'generate_ui_component',
            name: 'error',
            componentCode: "() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>API Key Missing in .env file.</div>",
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 } as any, zIndex: 100 }
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
        
        return parsedCommand as AICommand;
    } catch (err) {
        console.error("processCommandWithAgent error:", err);
         return {
            tool: 'generate_ui_component',
            name: 'error',
            componentCode: `() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>Error: ${ (err as any).message }</div>`,
            layout: { position: { x: 25, y: 40 }, size: { width: 50, height: 10 } as any, zIndex: 100 }
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