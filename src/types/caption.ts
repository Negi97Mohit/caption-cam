export type CaptionShape = "rectangular" | "rounded" | "pill" | "speech-bubble" | "banner";
export type CaptionAnimation = "fade" | "bounce" | "karaoke" | "none";

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: { x: number; y: number };
  shape: CaptionShape;
  animation: CaptionAnimation;
  outline: boolean;
  shadow: boolean;
  gradient?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  style: CaptionStyle;
  preview: string;
}

export interface AIDecision {
  id?: string;
  decision: "SHOW" | "HIDE";
  type: "live" | "highlight";
  duration: number | "permanent";
  formattedText: string;
  position?: { x: number; y: number };
  cellIndex?: number;
  captionIntent?: string; // 'title' | 'question' | 'quote' | 'list' | 'live' | 'default'
}