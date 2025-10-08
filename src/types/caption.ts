// src/types/caption.ts
export type CaptionShape = "rectangular" | "rounded" | "pill" | "speech-bubble" | "banner";
export type CaptionAnimation = "fade" | "bounce" | "karaoke" | "none" | "slide-up";

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
  textShadow?: string;
}

export type GeneratedLayout = {
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
};

export interface GeneratedOverlay {
  id: string;
  componentCode: string;
  layout: GeneratedLayout;
  preview?: string;
}

export interface GenerateUICommand {
  tool: 'generate_ui_component';
  componentCode: string;
  layout: GeneratedLayout;
}

export interface ApplyVideoEffectCommand {
  tool: 'apply_video_effect';
  filter: string;
}

export interface ApplyLiveCaptionStyleCommand {
  tool: 'apply_live_caption_style';
  style: React.CSSProperties;
}

export interface ChangeAppThemeCommand {
  tool: 'change_app_theme';
  theme: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    primary_foreground?: string;
    card?: string;
    border?: string;
  };
}

export type AICommand = GenerateUICommand | ApplyVideoEffectCommand | ApplyLiveCaptionStyleCommand | ChangeAppThemeCommand;

// Layout types
export type LayoutMode = 'split-vertical' | 'split-horizontal' | 'pip';
export type CameraShape = 'rectangle' | 'circle' | 'rounded';

export interface LayoutState {
  mode: LayoutMode;
  cameraShape: CameraShape;
  splitRatio: number;
  pipPosition: { x: number; y: number };
  pipSize: { width: number; height: number };
  customMaskUrl?: string;
}

export const DEFAULT_LAYOUT_STATE: LayoutState = {
  mode: 'pip',
  cameraShape: 'rectangle',
  splitRatio: 0.5,
  pipPosition: { x: 75, y: 75 },
  pipSize: { width: 20, height: 20 },
};

// Additional types for AI overlays, templates, and graphs
export type AIDecisionType = 'live' | 'static';
export type AIDecisionChoice = 'SHOW' | 'HIDE';

export interface AIDecision {
  id?: string;
  decision: AIDecisionChoice;
  type: AIDecisionType;
  duration: number | 'permanent';
  formattedText: string;
  captionIntent?: 'title' | 'question' | 'list' | 'stat' | 'quote';
}

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // URL or emoji
  style: CaptionStyle;
}

export type GraphType = 'bar' | 'line' | 'pie';
export interface GraphDataPoint { label: string; value: number; }
export interface GraphConfig { title: string; xAxisLabel?: string; yAxisLabel?: string; }
export interface GraphObject {
  id: string;
  type: 'graph';
  graphType: GraphType;
  data: GraphDataPoint[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: GraphConfig;
}