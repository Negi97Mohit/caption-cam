// src/lib/ai.ts - Enhanced Production-Ready AI System (FIXED)
import { AICommand, GeneratedOverlay } from "@/types/caption";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ===== ENHANCED SYSTEM PROMPT WITH ADVANCED CAPABILITIES =====
const MASTER_PROMPT = `You are an elite AI agent for a real-time video overlay system. You have complete control over UI components with advanced capabilities.

**CURRENT ELEMENTS:**
{CURRENT_ELEMENTS}

**CRITICAL INSTRUCTION - TARGET AWARENESS:**
When a user specifies they are modifying or updating an EXISTING overlay (indicated by {TARGET_OVERLAY} below), you MUST:
1. ONLY use update_ui_component or similar modification tools
2. NEVER create a new overlay under any circumstances
3. Focus entirely on modifying the targeted overlay
4. If the user says "update X" or "modify X" or "change X", ALWAYS use update_ui_component with targetId set to the overlay name

**TARGET OVERLAY (if user is modifying existing):**
{TARGET_OVERLAY}

**CORE OPERATIONS:**
1. CREATE - Generate new overlays with full customization
2. UPDATE - Modify existing overlays (partial or complete)
3. DELETE - Remove overlays by ID or pattern
4. BATCH - Chain multiple operations atomically
5. CLONE - Duplicate existing overlays with modifications
6. ANIMATE - Add complex animations and transitions
7. GROUP - Create grouped/linked components
8. STYLE - Apply themes and style presets

**ADVANCED CAPABILITIES:**
- Multi-component coordination (e.g., "create 3 stats boxes aligned horizontally")
- Conditional logic (e.g., "show timer only when recording")
- State management (e.g., "counter that increments on click")
- Live data integration (fetch from APIs with polling)
- Responsive positioning (smart placement avoiding collisions)
- Animation sequences (entrance, idle, exit animations)
- Theme application (apply consistent styling across multiple components)
- Component relationships (parent-child, master-detail patterns)

**RESPONSE FORMAT - CRITICAL:**
Respond with ONLY valid JSON. No markdown, no code fences, no explanations.

Single action:
{
  "tool": "generate_ui_component",
  "name": "unique_id",
  "componentCode": "React component string",
  "props": {},
  "layout": { "position": {"x": 0-100, "y": 0-100}, "size": {"width": 0-100, "height": 0-100}, "zIndex": 1-1000 },
  "metadata": { "category": "type", "tags": [], "description": "..." }
}

Multiple actions:
{
  "tool": "multi_tool_reasoning",
  "actions": [...],
  "metadata": { "sequence": "description of operation flow" }
}

**TOOLS AVAILABLE:**

1. **generate_ui_component** - Create new overlay
   Required: name, componentCode, layout
   Optional: props, fetch, metadata, animations, conditions
   ⚠️ DO NOT USE if TARGET_OVERLAY is specified

2. **update_ui_component** - Modify existing
   Required: targetId
   Optional: componentCode, props, layout (partial updates allowed)
   ✅ USE THIS when TARGET_OVERLAY is specified

3. **delete_ui_component** - Remove overlay
   Required: targetId

4. **clone_ui_component** - Duplicate with changes
   Required: sourceId, newName
   Optional: modifications (props/layout changes)

5. **batch_update** - Update multiple at once
   Required: targets[] (array of targetIds), changes (props/layout to apply)

6. **multi_tool_reasoning** - Chain operations
   Required: actions[] (array of any tool)

**COMPONENT LIBRARIES:**

UI Components:
- Card, CardHeader, CardTitle, CardContent, CardFooter
- Button, Badge, Progress, Input, Select
- Alert, AlertTitle, AlertDescription

Icons (lucide-react):
- Timer, Clock, Calendar, Bell, Zap
- Mic, MicOff, Video, VideoOff, Volume2
- Users, UserPlus, Eye, Heart, ThumbsUp, Star
- Activity, TrendingUp, BarChart3, PieChart
- CloudSun, CloudRain, Thermometer, Wind
- Play, Pause, Square, Circle, Check, X

Charts (recharts):
- BarChart, LineChart, PieChart, AreaChart
- Bar, Line, Pie, Area, Cell
- XAxis, YAxis, CartesianGrid, Tooltip, Legend
- ResponsiveContainer

**STYLING RULES:**
1. Accept \`style\` prop for colors, fonts, text styling
2. Use Tailwind classes for layout: flex, grid, padding, margin, rounded, shadow
3. Support dark/light themes via className
4. Provide responsive sizing
5. Include hover/active states where interactive

**ANIMATION PATTERNS:**

Tailwind Animations:
- animate-pulse - Pulsing effect
- animate-bounce - Bouncing
- animate-spin - Spinning
- animate-ping - Radar ping

Custom Transitions:
- transition-all duration-300 - Smooth transitions
- hover:scale-110 - Hover scale
- opacity-0 group-hover:opacity-100 - Fade in

**LIVE DATA FETCHING:**

Structure:
{
  "fetch": {
    "url": "https://api.example.com/data",
    "interval": 10,
    "transform": "optional JS function string"
  }
}

Weather API: https://wttr.in/CITY?format=j1
Stock API: https://api.example.com/stock/SYMBOL

Component receives: { data: { jsonData, isLoading, error } }

**SMART POSITIONING:**

Predefined Positions:
- top-left: {x: 5, y: 5}
- top-center: {x: 50, y: 5}
- top-right: {x: 95, y: 5}
- center: {x: 50, y: 50}
- bottom-center: {x: 50, y: 95}
- bottom-right: {x: 95, y: 95}

Size Presets:
- badge: {width: 15, height: 8}
- small: {width: 20, height: 15}
- medium: {width: 30, height: 25}
- large: {width: 50, height: 40}
- full-width: {width: 90, height: 15}

**COMPONENT PATTERNS:**

1. Simple Text:
"({ style, text }) => <div style={style} className='text-center p-4'>{text}</div>"

2. Interactive Counter:
"({ style }) => {
  const [count, setCount] = React.useState(0);
  return <button onClick={() => setCount(c => c + 1)} style={style} className='px-6 py-3 rounded-lg'>{count}</button>;
}"

3. Timer Component:
"({ style, duration = 300 }) => {
  const [time, setTime] = React.useState(duration);
  React.useEffect(() => {
    const interval = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  return <div style={style} className='font-mono text-4xl'>{mins}:{secs.toString().padStart(2, '0')}</div>;
}"

4. Bar Chart Component:
"({ data }) => {
  const chartData = data?.jsonData || [{name: 'A', value: 100}];
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='name' />
        <YAxis />
        <Tooltip />
        <Bar dataKey='value' fill='#8884d8' />
      </BarChart>
    </ResponsiveContainer>
  );
}"

5. Pie Chart Component:
"({ data }) => {
  const chartData = data?.jsonData || [{name: 'Group A', value: 400}, {name: 'Group B', value: 300}];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <PieChart>
        <Pie data={chartData} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={80} fill='#8884d8' label>
          {chartData.map((entry, index) => <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}"


**COMMAND INTERPRETATION:**

"create X" → generate_ui_component
"update X" → update_ui_component (if X exists)
"modify X" → update_ui_component (if X exists)
"change X" → update_ui_component (if X exists)
"make X bigger/red" → update_ui_component
"delete X" → delete_ui_component
"duplicate X as Y" → clone_ui_component
"create 3 X in a row" → multi_tool_reasoning (3 generates with aligned positions)
"update all text to red" → batch_update
"replace X with Y" → multi_tool_reasoning (delete + generate)
"animate X" → update_ui_component (add animation classes)
"move X to corner" → update_ui_component (change position)

**CONTEXT AWARENESS:**

Use provided context to enhance generation:
- intent: 'static_visual' | 'data_widget' | 'interactive' | 'live_data'
- modifiers: ['animated', 'hasBackground']
- targetOverlay: specific component to act on

Examples:
- intent='data_widget' → include state management
- modifiers=['animated'] → add animation classes
- modifiers=['hasBackground'] → wrap in Card component
- targetOverlay set → ONLY modify that component, NEVER create new ones

**VALIDATION RULES:**

1. name must be unique (check CURRENT_ELEMENTS)
2. targetId must exist for update/delete
3. position x,y must be 0-100
4. size width,height must be 0-100
5. zIndex must be 1-1000
6. componentCode must be valid JSX
7. For updates, include ONLY changed fields
8. ⚠️ When TARGET_OVERLAY is specified, NEVER generate new overlays - only modify the target

**ERROR RECOVERY:**

If component doesn't exist: suggest creating it (unless TARGET_OVERLAY specified)
If position invalid: use smart positioning
If syntax error: provide corrected version
If conflicting operations: resolve with priority

**EXAMPLES:**

Example 1 - Simple Create:
Input: "create a title saying Hello World"
Output:
{
  "tool": "generate_ui_component",
  "name": "title_hello",
  "componentCode": "({ style, text }) => <h1 style={style} className='text-center font-bold'>{text}</h1>",
  "props": {
    "text": "Hello World",
    "style": { "fontSize": "48px", "color": "#FFFFFF" }
  },
  "layout": {
    "position": { "x": 50, "y": 15 },
    "size": { "width": 60, "height": 12 },
    "zIndex": 10
  }
}

Example 2 - Update Existing:
Input: "update title_hello to say Goodbye"
Target Overlay: title_hello
Output:
{
  "tool": "update_ui_component",
  "targetId": "title_hello",
  "props": {
    "text": "Goodbye"
  }
}

Example 3 - Make Bigger (Targeted):
Input: "make it bigger and red"
Target Overlay: title_hello
Output:
{
  "tool": "update_ui_component",
  "targetId": "title_hello",
  "props": {
    "style": { "fontSize": "64px", "color": "#FF0000" }
  }
}

Example 4 - Multi-Step:
Input: "create a timer and stats box side by side"
Output:
{
  "tool": "multi_tool_reasoning",
  "actions": [
    {
      "tool": "generate_ui_component",
      "name": "timer_main",
      "componentCode": "...",
      "props": { "duration": 300, "style": { "color": "#FFFFFF" } },
      "layout": { "position": { "x": 30, "y": 50 }, "size": { "width": 25, "height": 20 }, "zIndex": 10 }
    },
    {
      "tool": "generate_ui_component",
      "name": "stats_main",
      "componentCode": "...",
      "props": { "style": { "color": "#FFFFFF" } },
      "layout": { "position": { "x": 70, "y": 50 }, "size": { "width": 25, "height": 20 }, "zIndex": 10 }
    }
  ]
}

Example 5 - Clone:
Input: "duplicate the timer as a second timer below it"
Output:
{
  "tool": "clone_ui_component",
  "sourceId": "timer_main",
  "newName": "timer_secondary",
  "modifications": {
    "layout": {
      "position": { "x": 30, "y": 75 }
    }
  }
}

**REMEMBER:**
- Always respond with PURE JSON only
- Validate all field values
- Check if overlays exist before updating/deleting
- Use smart positioning for new components
- Provide meaningful component names
- Include only changed fields in updates
- Chain related operations in multi_tool_reasoning
- ⚠️ NEVER create new overlays when TARGET_OVERLAY is specified
- When modifying, focus ENTIRELY on the target
`;

// ===== VALIDATION & PARSING =====

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function robustJsonParse(text: string): any | null {
  // Remove markdown code fences if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }
  
  const jsonString = text.substring(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
}

function validateCommand(command: any, activeOverlays: GeneratedOverlay[], targetOverlay?: string): ValidationResult {
  if (!command) return { valid: false, error: "Command is null" };
  if (!command.tool) return { valid: false, error: "Missing 'tool' field" };
  
  const validTools = [
    'generate_ui_component',
    'update_ui_component',
    'delete_ui_component',
    'clone_ui_component',
    'batch_update',
    'multi_tool_reasoning'
  ];
  
  if (!validTools.includes(command.tool)) {
    return { valid: false, error: `Unknown tool: ${command.tool}` };
  }
  
  // CRITICAL: If targetOverlay is specified, ONLY allow modification tools
  if (targetOverlay) {
    if (command.tool === 'generate_ui_component') {
      console.error(`❌ BLOCKED: Attempted to create new overlay when target "${targetOverlay}" was specified`);
      return { valid: false, error: `Cannot create new overlay when targeting "${targetOverlay}". Use update_ui_component instead.` };
    }
    // Ensure targetId matches the target
    if (command.tool === 'update_ui_component' && command.targetId !== targetOverlay) {
      console.warn(`⚠️ WARNING: targetId "${command.targetId}" doesn't match expected target "${targetOverlay}". Correcting...`);
      command.targetId = targetOverlay;
    }
  }
  
  // Validate multi_tool_reasoning
  if (command.tool === 'multi_tool_reasoning') {
    if (!Array.isArray(command.actions) || command.actions.length === 0) {
      return { valid: false, error: "multi_tool_reasoning requires non-empty actions array" };
    }
    for (const action of command.actions) {
      const result = validateCommand(action, activeOverlays, targetOverlay);
      if (!result.valid) return result;
    }
    return { valid: true };
  }
  
  // Validate generate_ui_component
  if (command.tool === 'generate_ui_component') {
    if (!command.name) return { valid: false, error: "generate_ui_component requires 'name'" };
    if (!command.componentCode) return { valid: false, error: "generate_ui_component requires 'componentCode'" };
    if (!command.layout) return { valid: false, error: "generate_ui_component requires 'layout'" };
    
    // Check for duplicate names
    if (activeOverlays.some(o => o.name === command.name)) {
      return { valid: false, error: `Overlay named "${command.name}" already exists` };
    }
    
    // Validate layout values
    const { position, size } = command.layout;
    if (position && (position.x < 0 || position.x > 100 || position.y < 0 || position.y > 100)) {
      return { valid: false, error: "Position values must be 0-100" };
    }
    if (size && (size.width < 0 || size.width > 100 || size.height < 0 || size.height > 100)) {
      return { valid: false, error: "Size values must be 0-100" };
    }
  }
  
  // Validate update_ui_component
  if (command.tool === 'update_ui_component') {
    if (!command.targetId) return { valid: false, error: "update_ui_component requires 'targetId'" };
    if (!activeOverlays.some(o => o.name === command.targetId)) {
      return { valid: false, error: `Overlay "${command.targetId}" not found` };
    }
  }
  
  // Validate delete_ui_component
  if (command.tool === 'delete_ui_component') {
    if (!command.targetId) return { valid: false, error: "delete_ui_component requires 'targetId'" };
    if (!activeOverlays.some(o => o.name === command.targetId)) {
      return { valid: false, error: `Overlay "${command.targetId}" not found` };
    }
  }
  
  // Validate clone_ui_component
  if (command.tool === 'clone_ui_component') {
    if (!command.sourceId) return { valid: false, error: "clone_ui_component requires 'sourceId'" };
    if (!command.newName) return { valid: false, error: "clone_ui_component requires 'newName'" };
    if (!activeOverlays.some(o => o.name === command.sourceId)) {
      return { valid: false, error: `Source overlay "${command.sourceId}" not found` };
    }
    if (activeOverlays.some(o => o.name === command.newName)) {
      return { valid: false, error: `Overlay named "${command.newName}" already exists` };
    }
  }
  
  // Validate batch_update
  if (command.tool === 'batch_update') {
    if (!Array.isArray(command.targets) || command.targets.length === 0) {
      return { valid: false, error: "batch_update requires non-empty 'targets' array" };
    }
    for (const targetId of command.targets) {
      if (!activeOverlays.some(o => o.name === targetId)) {
        return { valid: false, error: `Overlay "${targetId}" not found in batch_update` };
      }
    }
  }
  
  return { valid: true };
}

// ===== RETRY LOGIC =====

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      lastError = new Error(`API error: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if ((error as Error).message.includes("Rate limit exceeded")) {
        break;
      }
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

// ===== MAIN PROCESSING FUNCTION =====

export async function processCommandWithAgent(
  command: string,
  activeOverlays: GeneratedOverlay[],
  userContext?: { intent?: string; modifiers?: string[]; targetOverlay?: string }
): Promise<AICommand | null> {
  if (!API_KEY) {
    console.error("API Key Missing");
    return {
      tool: 'generate_ui_component',
      name: 'error_no_api_key',
      componentCode: "() => <div className='bg-red-600 text-white p-4 rounded-lg text-sm'><strong>API Key Missing</strong><br/>Set VITE_GROQ_API_KEY in your .env file</div>",
      layout: { position: { x: 50, y: 50 }, size: { width: 60, height: 15 }, zIndex: 1000 }
    };
  }
  
  // Build current elements context
  const elementsContext = activeOverlays.length > 0
    ? "Active overlays you can modify or delete:\n" + 
      activeOverlays.map(o => `- "${o.name}" (z-index: ${o.layout?.zIndex || 0})`).join("\n")
    : "No overlays currently on screen. You can only create new ones.";
  
  // Build target overlay context - THIS IS CRITICAL
  let targetOverlayContext = "";
  if (userContext?.targetOverlay) {
    targetOverlayContext = `⚠️ CRITICAL INSTRUCTION: You MUST modify ONLY the existing overlay named "${userContext.targetOverlay}". Use update_ui_component with targetId="${userContext.targetOverlay}". ABSOLUTELY DO NOT create a new overlay under ANY circumstances.`;
  }
  
  // Build user context
  let contextPrefix = "";
  const parts = [];
  if (userContext?.intent) parts.push(`Intent: ${userContext.intent}`);
  if (userContext?.modifiers && userContext.modifiers.length > 0) {
    parts.push(`Modifiers: [${userContext.modifiers.join(', ')}]`);
  }
  if (userContext?.targetOverlay) {
    parts.push(`TARGET OVERLAY: ${userContext.targetOverlay}`);
  }
  
  if (parts.length > 0 || targetOverlayContext) {
    contextPrefix = `[USER CONTEXT] ${parts.join('; ')}\n\n${targetOverlayContext}\n\n`;
  }
  
  const systemPrompt = MASTER_PROMPT
    .replace('{CURRENT_ELEMENTS}', elementsContext)
    .replace('{TARGET_OVERLAY}', userContext?.targetOverlay || 'None - User is creating new overlays');
  
  try {
    const response = await fetchWithRetry(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextPrefix + command }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    }, 3);
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from API");
    }
    
    const parsedCommand = robustJsonParse(content);
    
    if (!parsedCommand) {
      throw new Error("Failed to parse JSON from response");
    }
    
    const validation = validateCommand(parsedCommand, activeOverlays, userContext?.targetOverlay);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    return parsedCommand as AICommand;
    
  } catch (err) {
    const errorMessage = (err as any).message || "Unknown error";
    console.error("processCommandWithAgent error:", err);
    
    return {
      tool: 'generate_ui_component',
      name: 'error_processing',
      componentCode: `() => <div className='bg-red-600 text-white p-4 rounded-lg text-sm max-h-48 overflow-auto'><strong>⚠️ AI Processing Error</strong><br/><span className='text-xs'>${errorMessage}</span></div>`,
      layout: { position: { x: 50, y: 50 }, size: { width: 70, height: 20 }, zIndex: 1000 }
    };
  }
}

// ===== BATCH PROCESSING =====

export async function processMultipleCommands(
  commands: string[],
  activeOverlays: GeneratedOverlay[]
): Promise<AICommand[]> {
  const results: AICommand[] = [];
  
  for (const cmd of commands) {
    const result = await processCommandWithAgent(cmd, activeOverlays);
    if (result) {
      results.push(result);
      if (result.tool === 'generate_ui_component') {
        activeOverlays = [...activeOverlays, {
          id: `temp-${Date.now()}`,
          name: result.name,
          componentCode: result.componentCode,
          layout: result.layout,
          props: result.props || {}
        } as GeneratedOverlay];
      }
    }
  }
  
  return results;
}

// ===== CAPTION FORMATTING =====

export async function formatCaptionWithAI(
  text: string,
  context?: { style?: string; duration?: number }
): Promise<any> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { decision: 'HIDE', type: 'live', duration: 0, formattedText: '' };
  }
  
  return {
    decision: 'SHOW',
    type: 'live',
    duration: context?.duration || 4,
    formattedText: trimmed,
    style: context?.style || 'default',
  };
}