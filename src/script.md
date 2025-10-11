# GAKI Elevator Pitch Script
## Full Presentation with AI-Optimized Voice Prompts

---

## SEGMENT 1: SETUP & OPENING CHECKLIST (30 seconds)

### Visual: Checklist of Topics

**YOU SAY:**
"Let me start by showing you what we're going to cover today."

**GAKI PROMPT:**
```
Create a checklist overlay at the top-left of the screen with these items: "What is Gaki", "Market Landscape", "Competition Analysis", "Market Opportunity", "Why I Built It". Use checkboxes next to each item. Style it with a dark background and white text. Make the font size medium and readable.
```

**AI SYSTEM PROCESSES:**
- Creates an interactive checklist component
- Positions at top-left (smart position)
- Assigns unique name like `checklist_topics`

**YOU SAY:**
"As we go through each section, we'll check these off. Let's dive in."

---

## SEGMENT 2: THE HOOK - SHOCKING STATISTIC (15 seconds)

### Visual: Giant Number with Animation

**YOU SAY:**
"In 2025, here's a number that puts everything in perspective."

**GAKI PROMPT:**
```
Create a massive animated number display showing "500M" in the center of the screen. Make the text huge—at least 120px font size. Use a vibrant gradient background going from purple to blue. Add the text "hours of content uploaded daily" underneath in a smaller font. Add a subtle pulse animation to make it feel energetic and important.
```

**AI SYSTEM PROCESSES:**
- Generates large text component with gradient
- Applies `animate-pulse` class
- Centers on screen
- Names it `big_number_content_hours`

**YOU SAY:**
"That's five hundred million hours of video content being uploaded to YouTube, TikTok, Instagram, LinkedIn, and streaming platforms every single day."

**GAKI PROMPT:**
```
Update the big_number_content_hours display. Change the subtitle text to say "across all platforms daily" and make it bold.
```

**AI SYSTEM PROCESSES:**
- Uses `update_ui_component` with targetId `big_number_content_hours`
- Updates props with new text
- Animation stays intact

**YOU SAY:**
"And that's just the video. Add the meetings happening simultaneously..."

**GAKI PROMPT:**
```
Create a second stat box in the bottom-left corner showing "4.3M" as the main number and "daily meetings on Zoom, Teams, Google Meet" as the subtitle. Use the same gradient style but with different colors—maybe blue to cyan. Make it about the same size as the big number but positioned in the corner.
```

**AI SYSTEM PROCESSES:**
- Generates new component with smart positioning
- Names it `stat_meetings`
- Maintains visual consistency

**YOU SAY:**
"Plus millions of concurrent streams happening right now. This is the content explosion we're living in—and it's only accelerating."

---

## SEGMENT 3: BREAKING DOWN THE LANDSCAPE (60 seconds)

### Visual: Multi-Platform Bar Chart

**YOU SAY:**
"Let me show you exactly where all this content is coming from."

**GAKI PROMPT:**
```
Create a horizontal bar chart showing content sources across platforms. The data should show: "YouTube: 720k", "TikTok: 1.2M", "Instagram Reels: 95M", "LinkedIn: 8M", "Twitch: 30k", "Corporate Meetings: 4.3M". Use different colors for each bar. Make it visually compelling with labels and a clean grid background. Position it in the center of the screen and make it large enough to read from a distance.
```

**AI SYSTEM PROCESSES:**
- Generates BarChart component from recharts
- Formats data into proper structure
- Applies responsive sizing
- Names it `platform_breakdown_chart`

**YOU SAY:**
"Notice the pattern? Every platform. Every format. Every second of every day. But here's the critical insight—all this content is being created with tools that haven't fundamentally changed in a decade."

**GAKI PROMPT:**
```
Add a text overlay at the bottom of the chart that says "Problem: Traditional tools are too slow for real-time creation" in bold white text on a semi-transparent red background. Make it stand out as a warning or alert.
```

**AI SYSTEM PROCESSES:**
- Creates alert-style text component
- Positions below chart
- Names it `problem_statement`

**YOU SAY:**
"Video editors? Static. Presentation software? Rigid. Screen recording tools? No live graphics. Streamers? Limited to pre-built overlays. The entire workflow is fundamentally broken."

**GAKI PROMPT:**
```
Replace the problem statement. Update it to say "Current Workflow: Record → Edit (Hours) → Export (More Hours) → Wait → Share"
```

**AI SYSTEM PROCESSES:**
- Updates `problem_statement` component
- Changes text and styling to show workflow

---

## SEGMENT 4: INTRODUCING THE SOLUTION (45 seconds)

### Visual: Old vs. New Workflow Comparison

**YOU SAY:**
"This is where the opportunity lies. What if creators didn't have to choose between speed and quality?"

**GAKI PROMPT:**
```
Create two side-by-side boxes comparing workflows. On the left box titled "Traditional Workflow" list: "1. Record video", "2. Import to editor", "3. Wait for processing", "4. Manually add graphics", "5. Render for hours", "6. Export". Use grey text. On the right box titled "Gaki Workflow" list: "1. Speak your vision", "2. Graphics appear instantly", "3. Real-time updates", "4. No rendering", "5. Export immediately". Use bright green text. Make the boxes about equal size and position them side by side in the center.
```

**AI SYSTEM PROCESSES:**
- Generates two card/box components
- Arranges horizontally with smart spacing
- Names them `workflow_traditional` and `workflow_gaki`

**YOU SAY:**
"That's what gaki does. It bridges the gap between the raw, authentic moment and professional visual polish. You speak. Visuals appear. Real-time."

**GAKI PROMPT:**
```
Add a large arrow or divider line between the two workflow boxes with text above it saying "The Gaki Difference" in bold white letters.
```

**AI SYSTEM PROCESSES:**
- Adds visual separator component
- Names it `workflow_divider`

---

## SEGMENT 5: COMPETITIVE LANDSCAPE (75 seconds)

### Visual: Competitive Comparison Bar Chart

**YOU SAY:**
"Let me show you how the current market is structured. These are the existing solutions and their primary strengths."

**GAKI PROMPT:**
```
Create a horizontal bar chart showing what each competitor excels at. The chart should show: "OBS Studio: Technical Power", "Adobe Creative Suite: Post-Production", "CapCut: Mobile Editing", "Streamlabs: Streaming Overlays", "Shotcut: Open-Source". Use different colors for each bar. Make the bars proportional to market focus, not capability. Add a title "Existing Market Landscape" at the top. Position it in the center.
```

**AI SYSTEM PROCESSES:**
- Generates BarChart component with horizontal layout
- Formats competitor data
- Applies color differentiation
- Names it `market_landscape_chart`

**YOU SAY:**
"OBS Studio owns the technical power-user space. It's incredibly powerful. But it requires you to be half-engineer. You're threading cables, tweaking settings, dealing with plugins. The learning curve is steep."

**YOU SAY:**
"Adobe Creative Suite owns the professional post-production space. Industry standard. Excellent tools. But you're paying hundreds per month. It's built for batch editing, not real-time workflows. Not for live creation."

**YOU SAY:**
"CapCut democratized mobile video editing. Social media creators love it. Great for TikTok and Reels. But it's mobile-first, not professional-first. Try doing data visualization or advanced streaming overlays—you're limited."

**YOU SAY:**
"Streamlabs owns the streaming overlay space. Focused tool. Works well for Twitch and YouTube streamers. But it's narrow. If you're doing anything beyond streaming overlays, you need something else."

**YOU SAY:**
"Here's the problem: every single tool on this chart solves for ONE workflow. OBS for power users. Adobe for editors. CapCut for mobile. Streamlabs for streamers. There's no unified platform that handles real-time creation across all these use cases."

**GAKI PROMPT:**
```
Add a large text box or callout below the chart that says "The Gap: No real-time, voice-controlled, unified solution exists." Make it prominent with a bold red or orange background to show this is the market opportunity.
```

**AI SYSTEM PROCESSES:**
- Generates alert or callout component
- Names it `market_gap_statement`

**YOU SAY:**
"That's where Gaki comes in. We're not competing in any of these narrow lanes. We're creating a new category—real-time, voice-controlled content creation. Built for creators who need fast, professional results without the learning curve."

**GAKI PROMPT:**
```
Update the market gap statement. Change it to say "Gaki: The Only Real-Time, Voice-Controlled, Full-Stack Creator Platform." Use bright green background instead. Make it stand out as the solution to the gap.
```

**AI SYSTEM PROCESSES:**
- Updates `market_gap_statement` 
- Changes styling and text
- Names it updated version `gaki_solution_statement`

**YOU SAY:**
"We're not trying to beat OBS at technical power. We're not trying to compete with Adobe on features. We're solving a completely different problem—how to create professional content in real-time, with your voice, without any technical friction. That's the category we're inventing."

---

## SEGMENT 6: MARKET OPPORTUNITY & TAM (60 seconds)

### Visual: Market Size & Segments

**YOU SAY:**
"Now let's talk about market size. Who are we building for, and how big is this opportunity?"

**GAKI PROMPT:**
```
Create a pie chart showing market segments for video creation tools. The segments should be: "Content Creators & YouTubers: 35%", "Educators & Online Trainers: 25%", "Corporate Streamers & Communications: 20%", "Live Event Producers: 15%", "Gaming & Music Creators: 5%". Use vibrant, distinct colors for each slice. Add a title above the pie chart saying "TAM: $8.2B Annually" and a legend showing the segments. Position it in the center-left of the screen.
```

**AI SYSTEM PROCESSES:**
- Generates PieChart component
- Formats data with percentages
- Applies color palette
- Names it `market_tam_pie`

**YOU SAY:**
"The global video creation tools market is $8.2 billion annually and growing at 15% year over year. That's a multi-billion dollar opportunity."

**YOU SAY:**
"But more importantly, let me break down our specific beachhead market—the segments we're targeting first."

**GAKI PROMPT:**
```
Create three callout boxes appearing one below the other on the right side of the screen. Box 1 should say "Content Creators: 5M+ professionals seeking faster workflows. Growing 22% annually." Box 2 should say "Educators: Online teaching and course creation growing 40% annually. Universities + corporate training." Box 3 should say "Enterprise Communications: Product demos, internal streaming, marketing content. Moving away from static to dynamic." Make each box a different color, readable, and make them appear to stack vertically.
```

**AI SYSTEM PROCESSES:**
- Generates three separate text/card components
- Positions them vertically on the right
- Names them `segment_creators`, `segment_educators`, `segment_enterprise`

**YOU SAY:**
"Our total addressable market—just in the first year focusing on professional content creators—is conservatively $2.1 billion. That's where we're starting."

---

## SEGMENT 7: WHY I'M BUILT FOR THIS (45 seconds)

### Visual: Founder Credibility & Timeline

**YOU SAY:**
"Finally, I want to address the most important question: why am I the right person to build this?"

**GAKI PROMPT:**
```
Create a vertical timeline or progression graphic showing my journey. Start from the bottom and build upward with these milestones: "Started tinkering with video tools in [year]", "Shipped [X projects] for content creators", "Built [specific product/tool] affecting [number] of creators", "Became deeply frustrated with existing workflows", "Built Gaki to solve the problem for everyone". Each milestone should build upward on the timeline. Use icons or visual markers for each step. Make it visually impressive and tell a narrative arc of progression.
```

**AI SYSTEM PROCESSES:**
- Generates vertical layout with timeline markers
- May use icons or badge components
- Names it `founder_timeline`

**YOU SAY:**
"I've been building in the creator and video space for [X years]. I've shipped [specific products] that affected [X] creators. I've talked to hundreds of people about their pain points. I didn't build Gaki because I thought it would make money. I built it because I was frustrated. We all were."

**GAKI PROMPT:**
```
Add a quote box that says "Video creation shouldn't require a PhD in software. It should be as natural as talking." and put my name underneath as the attribution. Make the quote styled nicely—maybe italicized and in a different color. Position it below the timeline.
```

**AI SYSTEM PROCESSES:**
- Creates quote/blockquote component
- Names it `founder_quote`

**YOU SAY:**
"I understand the creator mindset. I understand the technical challenges. And I understand what modern workflows demand. This isn't theoretical for me—this is personal."

**GAKI PROMPT:**
```
Update the founder quote. Change it to say "I didn't build Gaki for investors. I built it for creators like me who were tired of waiting."
```

**AI SYSTEM PROCESSES:**
- Updates `founder_quote` with new text

---

## SEGMENT 8: CLOSING THE LOOP (20 seconds)

### Visual: Call to Action

**YOU SAY:**
"Here's what we're doing with Gaki: We're building the future of content creation."

**GAKI PROMPT:**
```
Create a large, bold centered headline that says "The Future of Content Creation is Now" in massive text. Make it white text on a dark background with a subtle animation—maybe a fade-in or a slight scale-up effect when it appears. Below that, add three smaller lines: "Real-time Creation", "Voice-Controlled", "Effortless Professional Output". At the very bottom, add a line with my name and contact information or "Visit gaki.io" or "Early Access Available".
```

**AI SYSTEM PROCESSES:**
- Generates large title component with animation
- Adds subtitle lines
- Names it `closing_cta`

**YOU SAY:**
"Where your words become visual reality instantly. Where creators spend their time creating, not fighting software."

**YOU SAY:**
"That's Gaki. If you're interested in seeing a live demo, or if you'd like to get early access to the beta, I'd love to connect. Let's change how content gets made."

---

## SEGMENT 9: LIVE DEMO (if time permits) - 90 seconds

### Gaki in Real-Time Action

**YOU SAY:**
"Let me show you what Gaki looks like in action. I'm going to create a professional data visualization on the fly, using nothing but voice commands."

**GAKI PROMPT:**
```
Create a line chart showing "Video Content Growth Across Platforms". The chart should display data for: "January: 300M hours", "February: 350M hours", "March: 400M hours", "April: 450M hours", "May: 500M hours". Use a vibrant gradient background. Add gridlines. Include axis labels. Make it look polished and professional. Title it at the top.
```

**AI SYSTEM PROCESSES:**
- Generates LineChart component
- Formats time-series data
- Names it `demo_growth_chart`

**YOU SAY:**
"Notice—that chart was created from a voice command, in real-time, without touching any menus or clicking through dialogs. No rendering. No waiting. That's speed."

**GAKI PROMPT:**
```
Update the demo_growth_chart. Add a second line to the chart showing "TikTok Daily Uploads" with data: "January: 800M", "February: 950M", "March: 1.1B", "April: 1.15B", "May: 1.2B". Make it a different color—maybe bright green or cyan—so it stands out from the first line.
```

**AI SYSTEM PROCESSES:**
- Uses `update_ui_component` with targetId `demo_growth_chart`
- Adds additional data series
- Chart updates instantly

**YOU SAY:**
"I just added a second data series. Still no menus. Still no waiting. I can update, modify, and refine visuals on the fly. That's the Gaki difference."

**GAKI PROMPT:**
```
Now make the TikTok line animated. Add a pulsing or glowing effect to the second line to make it stand out. Make it feel dynamic and alive.
```

**AI SYSTEM PROCESSES:**
- Updates chart with animation classes
- Applies visual effects to specific data series

**YOU SAY:**
"Real-time editing. Real-time creation. No learning curve. That's what every creator deserves."

---

## QUICK REFERENCE: Execution Order

1. **CHECKLIST** – Set topic expectations
2. **SHOCK NUMBER** – Hook (500M)
3. **SECOND STAT** – Meetings stat
4. **BAR CHART** – Platform breakdown
5. **PROBLEM STATEMENT** – Paint the pain
6. **WORKFLOW COMPARISON** – Old vs. New
7. **COMPETITOR MATRIX** – Show dominance
8. **PIE CHART** – Market size
9. **SEGMENT CALLOUTS** – Target markets
10. **FOUNDER TIMELINE** – Build credibility
11. **FOUNDER QUOTE** – Personal connection
12. **CLOSING CTA** – Strong exit
13. **DEMO CHART** – Show the product
14. **DEMO UPDATE** – Show real-time power

---

## DELIVERY TIPS

**Pacing & Timing:**
- Let each visual land for 5-10 seconds before speaking over it or moving to the next one
- Let the audience absorb the data
- Pause after the competitor matrix to let it sink in
- This script runs 8-10 minutes without demo, 12-15 minutes with demo

**Tone & Delivery:**
- Start energetic with the big number (500M)
- Drop to thoughtful, problem-focused when discussing pain points
- Rise back up when revealing Gaki as the solution
- Get personal when talking about why you built it
- End strong with energy and vision

**The Meta-Moment:**
- The fact that you're using Gaki to present Gaki is incredibly powerful
- It's not just a pitch—it's a demo
- Lean into that explicitly: "I'm using Gaki right now to show you Gaki"
- This builds immediate credibility

**Engagement Hooks:**
- After the 500M number: "Raise your hand if you create video content"
- After competitor section: "Who here has fought with Adobe or OBS?"
- After Gaki reveal: "Who wants to create faster?"

**Checkpoint Language:**
- Use the checklist updates strategically
- "Now let's check off the competitive landscape..."
- "We've covered the market—one more section before the demo..."

---

## EXAMPLE COMMAND VARIATIONS

If the AI system doesn't capture your intent perfectly, try these variations:

**For Charts:**
- "Show me a chart of content across YouTube, TikTok, Instagram, LinkedIn, and Twitch"
- "Display video upload statistics as a bar chart with colors"
- "Create a pie chart splitting the market into creator segments"

**For Updates:**
- "Change the chart title to 'Content Growth Over Time'"
- "Add another data series to the existing chart"
- "Make the number bigger and more vibrant"

**For Positioning:**
- "Put that in the top-left corner"
- "Center this on the screen"
- "Move it to the bottom-right"

**For Styling:**
- "Add a glow effect to make it stand out"
- "Use a gradient background—purple to blue"
- "Make it red with white text"

---

## NOTES FOR YOUR AI SYSTEM

The prompts above are designed to work with your `processCommandWithAgent` function. They:

1. **Use natural language** — The system parses intent and generates appropriate components
2. **Specify positioning** — Top-left, center, side-by-side, etc.
3. **Request styling** — Colors, gradients, animations, fonts
4. **Target updates** — When you say "update X", the system will use `update_ui_component` with the component's name as `targetId`
5. **Leverage templates** — Your system recognizes chart types (bar, line, pie) and generates appropriate Recharts components
6. **Chain operations** — Multi-step demos use sequential prompts with updates to existing components

The validation logic in your `ai.ts` ensures that:
- Updates target existing components
- New creations don't duplicate names
- Layout values stay within bounds (0-100)
- JSON responses are properly formatted and executable



Creates the big red "YOU LAUGH YOU LOSE" heading

Creates the two interactive counters side-by-side

Left counter: "LAUGHS" (red button)
Right counter: "NO LAUGH" (green button)
Both have clickable buttons that increment their respective scores
State management keeps score persistent