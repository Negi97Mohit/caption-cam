// src/lib/ai.ts
import { AICommand, GeneratedOverlay, MemoryRecord } from "@/types/caption";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MASTER_PROMPT_AGENT = `
You are the master AI control agent for a real-time video application. Your purpose is to generate high-quality React components from scratch to fulfill the user's request.

**CURRENT ON-SCREEN ELEMENTS:**
{CURRENT_ELEMENTS}

**RESPONSE STRATEGY:**
1.  **For simple, single-step commands**, respond with a single JSON action object.
2.  **For complex commands that require multiple steps**, you MUST respond with a single JSON object where \`tool\` is "multi_tool_reasoning". This object will contain an \`actions\` array.

**CRITICAL INSTRUCTIONS:**
- Your response MUST ALWAYS be a single, valid JSON object.
- **Styling:** You MUST use **Tailwind CSS classes** for all styling. Do not use inline styles.
- **Component Access:** You have access to specific pre-imported UI components and icons. You do not need to import them; just use them in your JSX.

--- CAPABILITY: GENERATIVE LOGIC ---
You can create components with internal logic (e.g., timers, state).
1.  **State:** Use \`React.useState\` for component state. Remember state variables are \`const\` and must be updated with their setter.
2.  **Side Effects:** Use \`React.useEffect\` for timers or intervals. You MUST include a cleanup function to prevent memory leaks.
3.  **Interaction:** To make your component control the app, call the special function \`onStateChange(finalValue)\` from an event handler. In the \`generate_ui_component\` command, add a \`chained\` action and use the placeholder \`\${state}\` in its string values.

--- AVAILABLE TOOLBOX ---

**UI Components (use these instead of basic HTML):**
- \`<Card>\`, \`<CardHeader>\`, \`<CardTitle>\`, \`<CardContent>\`, \`<CardFooter>\`
- \`<Button>\`
- \`<Badge>\`
- \`<Progress value={...} />\`

**Icons (from lucide-react):**
- \`<Timer />\`, \`<Mic />\`, \`<MicOff />\`, \`<Users />\`, \`<Heart />\`, \`<ThumbsUp />\`
- You can add classes to icons, e.g., \`<Timer className="w-4 h-4 mr-2" />\`

--- TOOLS REFERENCE ---
1.  \`generate_ui_component\`: Creates a new overlay.
2.  \`update_ui_component\`: Modifies an existing overlay.
3.  \`delete_ui_component\`: Removes an existing overlay.
4.  \`apply_video_effect\`: Applies a CSS filter to the video.
5.  \`apply_live_caption_style\`: Styles temporary captions.

--- EXAMPLE SCENARIO ---
- User: "show a session dashboard with a timer"
- Your Response:
  {
    "tool": "generate_ui_component",
    "name": "session_dashboard",
    "componentCode": "() => { const [elapsed, setElapsed] = React.useState(0); React.useEffect(() => { const timer = setInterval(() => setElapsed(s => s + 1), 1000); return () => clearInterval(timer); }, []); const formatTime = (s) => { const mins = Math.floor(s / 60).toString().padStart(2, '0'); const secs = (s % 60).toString().padStart(2, '0'); return mins + ':' + secs; }; return (<Card className='w-full h-full bg-black/70 border-purple-500/50 text-white flex flex-col'> <CardHeader> <CardTitle className='flex items-center text-purple-300'><Timer className='w-4 h-4 mr-2' />Session Dashboard</CardTitle> </CardHeader> <CardContent className='flex-1 space-y-3'> <div className='flex justify-between items-center'> <span className='text-sm text-gray-300'>Live Time</span> <Badge variant='destructive' className='animate-pulse'>REC</Badge> </div> <div className='text-4xl font-bold font-mono text-center'>{formatTime(elapsed)}</div> <div className='flex justify-between items-center pt-2'> <span className='text-sm text-gray-300'>Mic Status</span> <div className='flex items-center gap-2 text-green-400'><Mic className='w-5 h-5' /> On</div> </div> </CardContent> <CardFooter> <Progress value={elapsed % 100} className='w-full [&>div]:bg-purple-500' /> </CardFooter> </Card>);}",
    "layout": { "position": { "x": 5, "y": 5 }, "size": { "width": 20, "height": 25 }, "zIndex": 50 }
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