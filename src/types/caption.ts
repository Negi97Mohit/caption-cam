export type CaptionShape = "rectangular" | "rounded" | "pill" | "speech-bubble";
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
}

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  style: CaptionStyle;
  preview: string;
}
