// src/lib/ai.ts
import { AIDecision } from "@/types/caption";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Recommended by OpenRouter to identify your app in their logs
const SITE_URL = import.meta.env.VITE_APP_SITE_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;

export async function formatCaptionWithAI(transcript: string): Promise<AIDecision> {
  const fallbackDecision: AIDecision = {
    decision: "SHOW",
    type: "live",
    duration: 5,
    formattedText: transcript,
  };

  if (!transcript.trim()) {
    return { ...fallbackDecision, decision: "HIDE", formattedText: "" };
  }

  const systemPrompt = `You are an AI assistant for a live video captioning system. You will receive transcripts of spoken text in real time. Your goal is to decide how to display the text and format it for maximum readability.

You must always return only a single, valid JSON object with the following structure:
{"decision": "SHOW" | "HIDE", "type": "live" | "highlight", "duration": number | "permanent", "formattedText": "string"}

Follow these rules:
1.  "type": "live": Use for casual, conversational sentences. Temporary, duration = 3–5.
2.  "type": "highlight": Use for important or structured content (lists, key statements, conclusions). Duration = "permanent".
3.  "decision": "HIDE": Use only for filler words like "um", "ah", "you know", "like", etc.
4.  "formattedText": Clean, concise, ready for overlay.
   - Lists can be bullet points using "\\n" for new lines.
   - Key statements can emphasize keywords or summarize.
   - Let the content guide formatting; do not add explanations.

Example Input: "let me make a few points about why it is boring; lets begin with fighting, maybe talking and we cannot forget about loving"
Example Output:
{
  "decision": "SHOW",
  "type": "highlight",
  "duration": "permanent",
  "formattedText": "• Fighting\\n• Talking\\n• Loving"
}

Now, process the following transcript:`;

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
        model: "openai/gpt-3.5-turbo", // Switched to a more reliable model for JSON output
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API request failed:", errorText);
      return fallbackDecision;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // START: MODIFIED LOGIC
    // The AI response content is a string, so we must parse it into a JSON object.
    try {
      const decision: AIDecision = JSON.parse(content);
      return decision;
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", parseError);
      // If parsing fails, return the fallback with the raw content.
      fallbackDecision.formattedText = content; 
      return fallbackDecision;
    }
    // END: MODIFIED LOGIC

  } catch (error) {
    console.error("Error calling AI API:", error);
    return fallbackDecision;
  }
}