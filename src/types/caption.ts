export type CaptionShape = "rectangular" | "rounded" | "pill" | "speech-bubble" | "banner";
export type CaptionAnimation = "fade" | "bounce" | "karaoke" | "none" | "slide-up";

// This style is now a 'base' style, primarily for text, but can be used by the AI
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

// --- NEW AI AGENT TYPES ---

export type GeneratedLayout = {
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
};

// Represents a command for the AI to generate a brand new UI component
export interface GenerateUICommand {
  tool: 'generate_ui_component';
  componentCode: string;
  layout: GeneratedLayout;
}

// Represents a command to apply a CSS filter to the main video feed
export interface ApplyVideoEffectCommand {
  tool: 'apply_video_effect';
  filter: string; // e.g., 'grayscale(100%)', 'sepia(80%)', 'blur(5px)'
}

// Represents a command to apply inline CSS styles to the live partial transcript
export interface ApplyLiveCaptionStyleCommand {
  tool: 'apply_live_caption_style';
  style: React.CSSProperties;
}

// Represents a command to change the overall application theme (CSS variables)
export interface ChangeAppThemeCommand {
  tool: 'change_app_theme';
  theme: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    // These will be derived in the AI function
    primary_foreground?: string;
    card?: string;
    border?: string;
  };
}

// A union type representing any possible command the AI can return
export type AICommand = GenerateUICommand | ApplyVideoEffectCommand | ApplyLiveCaptionStyleCommand | ChangeAppThemeCommand;