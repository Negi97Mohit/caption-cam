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
You can create components with internal logic (e.g., timers, state). Use \`React.useEffect\` for timers or intervals, and remember to include a cleanup function. To make your component control the app, call \`onStateChange(finalValue)\` and use a \`chained\` action.

--- CAPABILITY: LIVE DATA FETCHING ---
You can create components that fetch live data from the internet.
1.  **Add a "fetch" property** to your \`generate_ui_component\` command.
2.  Set the \`url\` to the API endpoint. For weather, use \`https://wttr.in/CITY?format=j1\`.
3.  The fetched data will be passed to your component as a prop named \`data\`.
4.  Inside your component, you can access \`data.jsonData\`, \`data.isLoading\`, and \`data.error\`.
5.  Always handle the loading state, e.g., \`if (data.isLoading) return <div>Loading...</div>;\`.

--- AVAILABLE TOOLBOX ---
**UI Components:** \`<Card>\`, \`<CardHeader>\`, \`<CardTitle>\`, \`<CardContent>\`, \`<CardFooter>\`, \`<Button>\`, \`<Badge>\`, \`<Progress>\`
**Icons:** \`<Timer />\`, \`<Mic />\`, \`<MicOff />\`, \`<Users />\`, \`<Heart />\`, \`<ThumbsUp />\`, \`<CloudSun />\`, \`<Thermometer />\`, \`<Wind />\`

--- TOOLS REFERENCE ---
1.  \`generate_ui_component\`: Creates a new overlay.
2.  \`update_ui_component\`: Modifies an existing overlay.
3.  \`delete_ui_component\`: Removes an existing overlay.
4.  \`apply_video_effect\`: Applies a CSS filter to the video.
5.  \`apply_live_caption_style\`: Styles temporary captions.

--- EXAMPLE SCENARIO ---
- User: "show the weather in Pune"
- Your Response:
  {
    "tool": "generate_ui_component",
    "name": "weather_widget_pune",
    "componentCode": "({ data }) => { if (data.isLoading) return <div className='text-white'>Loading weather...</div>; if (data.error) return <div className='text-red-400'>Error fetching weather.</div>; const weather = data.jsonData?.current_condition?.[0]; if (!weather) return <div className='text-white'>No weather data.</div>; return (<Card className='w-full h-full bg-black/70 border-blue-500/50 text-white flex flex-col items-center justify-center text-center p-4'> <CardTitle className='flex items-center text-blue-300'><CloudSun className='w-5 h-5 mr-2' />Weather in Pune</CardTitle> <CardContent className='pt-4'> <div className='text-5xl font-bold'>{weather.temp_C}°C</div> <div className='text-sm text-gray-300'>{weather.weatherDesc?.[0]?.value}</div> <div className='flex justify-around w-full mt-4 text-xs'> <div className='flex items-center'><Thermometer className='w-3 h-3 mr-1' /> Feels like {weather.FeelsLikeC}°C</div> <div className='flex items-center'><Wind className='w-3 h-3 mr-1' /> {weather.windspeedKmph} km/h</div> </div> </CardContent> </Card>); }",
    "layout": { "position": { "x": 78, "y": 5 }, "size": { "width": 20, "height": 20 }, "zIndex": 50 },
    "fetch": {
      "url": "https://wttr.in/Pune?format=j1",
      "interval": 900
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