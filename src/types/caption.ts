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
  name?: string;
  decision: "SHOW" | "HIDE";
  type: "live" | "highlight";
  duration: number | "permanent";
  formattedText: string;
  position?: { x: number; y: number };
  style?: CaptionStyle;
  size?: { width: number; height: number }; // ADDED: For resizable captions
  cellIndex?: number;
  captionIntent?: string; // 'title' | 'question' | 'quote' | 'list' | 'live' | 'default'
}

export interface EditAction {
  command: "EDIT" | "APPEND" | "DELETE_LINE" | "EDIT_LINE" | "GRAPH_ADD" | "GRAPH_CONFIG";
  targetId: string;
  newText?: string; // For EDIT, APPEND, EDIT_LINE
  lineNumber?: number; // For DELETE_LINE, EDIT_LINE (1-based)
  graphData?: { label: string; value: number }; // For GRAPH_ADD
  graphConfig?: { // For GRAPH_CONFIG
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
  };
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
  name?: string;
  type: 'graph';
  graphType: 'bar' | 'line' | 'pie';
  data: GraphDataPoint[];
  config: GraphConfig;
  position: { x: number; y: number };
  size: { width: number; height: number };
}