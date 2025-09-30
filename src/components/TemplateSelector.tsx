import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaptionTemplate } from "@/types/caption";
import { Check } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (template: CaptionTemplate) => void;
  selectedTemplate: CaptionTemplate | null;
}

const TEMPLATES: CaptionTemplate[] = [
  {
    id: "lower-third",
    name: "Lower Third",
    description: "Professional news-style caption",
    preview: "🎬",
    style: {
      fontFamily: "Roboto",
      fontSize: 24,
      color: "#FFFFFF",
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      position: { x: 20, y: 85 },
      shape: "rectangular",
      animation: "fade",
      outline: false,
      shadow: true,
    },
  },
  {
    id: "title-card",
    name: "Title Card",
    description: "Large centered text",
    preview: "📺",
    style: {
      fontFamily: "Montserrat",
      fontSize: 48,
      color: "#FFFFFF",
      backgroundColor: "transparent",
      position: { x: 50, y: 50 },
      shape: "rounded",
      animation: "bounce",
      outline: true,
      shadow: true,
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
  },
  {
    id: "bold-emphasis",
    name: "Bold Emphasis",
    description: "Attention-grabbing style",
    preview: "💥",
    style: {
      fontFamily: "Bebas Neue",
      fontSize: 56,
      color: "#FFFF00",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      position: { x: 50, y: 30 },
      shape: "pill",
      animation: "bounce",
      outline: true,
      shadow: true,
    },
  },
  {
    id: "karaoke",
    name: "Karaoke Style",
    description: "Word-by-word highlight",
    preview: "🎤",
    style: {
      fontFamily: "Open Sans",
      fontSize: 32,
      color: "#00F5FF",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      position: { x: 50, y: 90 },
      shape: "rounded",
      animation: "karaoke",
      outline: false,
      shadow: true,
    },
  },
  {
    id: "minimal",
    name: "Minimal Subtitle",
    description: "Clean and simple",
    preview: "✨",
    style: {
      fontFamily: "Inter",
      fontSize: 20,
      color: "#FFFFFF",
      backgroundColor: "transparent",
      position: { x: 50, y: 88 },
      shape: "rounded",
      animation: "fade",
      outline: false,
      shadow: true,
    },
  },
  {
    id: "speech-bubble",
    name: "Speech Bubble",
    description: "Comic-style caption",
    preview: "💬",
    style: {
      fontFamily: "Montserrat",
      fontSize: 22,
      color: "#000000",
      backgroundColor: "#FFFFFF",
      position: { x: 50, y: 70 },
      shape: "speech-bubble",
      animation: "bounce",
      outline: false,
      shadow: true,
    },
  },
  {
    id: "banner",
    name: "Banner Style",
    description: "Full-width colored bar",
    preview: "🎯",
    style: {
      fontFamily: "Roboto",
      fontSize: 28,
      color: "#FFFFFF",
      backgroundColor: "rgba(138, 43, 226, 0.9)",
      position: { x: 50, y: 15 },
      shape: "rectangular",
      animation: "fade",
      outline: false,
      shadow: false,
    },
  },
];

export const TemplateSelector = ({ onSelectTemplate, selectedTemplate }: TemplateSelectorProps) => {
  return (
    <Card className="p-6 bg-card border-border animate-fade-in">
      <h2 className="text-xl font-semibold mb-4">Caption Templates</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant={selectedTemplate?.id === template.id ? "default" : "secondary"}
            className="h-auto flex-col items-start text-left p-4 relative"
            onClick={() => onSelectTemplate(template)}
          >
            {selectedTemplate?.id === template.id && (
              <Check className="absolute top-2 right-2 w-4 h-4" />
            )}
            <div className="text-2xl mb-2">{template.preview}</div>
            <div className="font-semibold">{template.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {template.description}
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};
