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

export interface EditAction {
  command: "EDIT" | "APPEND" | "DELETE_LINE";
  targetCaptionId: string;
  newText?: string; // For EDIT and APPEND
  lineToDelete?: number; // For DELETE_LINE (e.g., 1 for the first line)
}

// --- START: NEW GRAPH TYPES ---
export interface GraphDataPoint {
  label: string;
  value: number;
}

export interface GraphConfig {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface GraphObject {
  id: string;
  type: 'graph';
  graphType: 'bar' | 'line' | 'pie';
  data: GraphDataPoint[];
  config: GraphConfig;
  position: { x: number; y: number };
  size: { width: number; height: number };
}