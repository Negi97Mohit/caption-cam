// src/lib/ai.ts

// The old AI functions have been removed and replaced with a single, powerful generative function.

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = import.meta.env.VITE_APP_SITE_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;


// --- REVISED CORE AI "MASTER PROMPT V2" ---
// This new prompt instructs the AI to act as a React component developer.
const MASTER_PROMPT_V2 = `
You are an expert AI frontend developer specializing in React. Your task is to translate a user's natural language command into a single, self-contained React functional component as a string of code.

**CRITICAL RULES:**

1.  **GENERATE CODE:** You MUST return a block of React component code. Do NOT just describe it.
2.  **SELF-CONTAINED:** The component must be entirely self-contained. It should not rely on any external imports other than React. Use React hooks (useState, useEffect) for any state or animation.
3.  **FUNCTIONAL COMPONENT:** The component MUST be a standard React functional component.
4.  **STYLING:** Use inline CSS for all styling.
5.  **NO PROPS:** The component should not expect any props. All necessary data or text should be hardcoded into the component based on the user's prompt.

**OUTPUT FORMAT (JSON ONLY):**
You must respond with a single JSON object. The key "componentCode" must contain the React component code as a single, escaped string. The "layout" key should provide sensible defaults for initial placement and size.

{
  "componentCode": "...",
  "layout": {
    "position": { "x": number, "y": number },
    "size": { "width": number, "height": number },
    "zIndex": 10
  }
}

**EXAMPLES:**

* **User:** "a simple button that says click me"
* **AI \`componentCode\` Output:**
    "() => { return <button style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(45deg, #6a11cb, #2575fc)', color: 'white', cursor: 'pointer' }}>Click Me</button>; }"

* **User:** "show a pulsating circle that glows"
* **AI \`componentCode\` Output:**
    "() => { const [scale, setScale] = React.useState(1); React.useEffect(() => { const interval = setInterval(() => { setScale(s => s === 1 ? 1.1 : 1); }, 500); return () => clearInterval(interval); }, []); return <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, #ff00de, #4a00e0)', transition: 'transform 0.5s, box-shadow 0.5s', transform: \`scale(\${scale})\`, boxShadow: \`0 0 20px 5px #ff00de\` }} />; }"

* **User:** "display the current time, updating every second"
* **AI \`componentCode\` Output:**
    "() => { const [time, setTime] = React.useState(new Date()); React.useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer); }, []); return <div style={{ fontFamily: 'monospace', fontSize: '2rem', color: '#00ff00', backgroundColor: 'black', padding: '10px 20px', borderRadius: '5px' }}>{time.toLocaleTimeString()}</div>; }"
`;

export async function generateComponentCodeWithAI(command: string): Promise<any> {
    if (!API_KEY) {
        return {
            componentCode: "() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>API Key Missing in .env file.</div>",
            layout: { position: { x: 100, y: 150 }, size: { width: 400, height: 50 }, zIndex: 100 }
        };
    }
    
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": APP_NAME,
            },
            body: JSON.stringify({
                model: "openai/gpt-4o",
                messages: [
                    { role: "system", content: MASTER_PROMPT_V2 },
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
        
        return JSON.parse(content);

    } catch (err) {
        console.error("generateComponentCodeWithAI error:", err);
        return {
            componentCode: `() => <div style={{color: 'white', backgroundColor: 'red', padding: '10px'}}>Error generating component: ${err.message}</div>`,
            layout: { position: { x: 100, y: 150 }, size: { width: 400, height: 50 }, zIndex: 100 }
        };
    }
}
