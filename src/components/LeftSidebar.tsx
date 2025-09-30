import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CaptionStyle, CaptionTemplate } from "@/types/caption";
import { Check } from "lucide-react";

interface LeftSidebarProps {
  onSelectTemplate: (template: CaptionTemplate) => void;
  selectedTemplate: CaptionTemplate | null;
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

const TEMPLATES: CaptionTemplate[] = [
  {
    id: "lower-third",
    name: "Lower Third",
    description: "Professional news-style",
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
      bold: false,
      italic: false,
      underline: false,
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
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "bold-emphasis",
    name: "Bold Emphasis",
    description: "Meme-style text",
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
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "karaoke",
    name: "Karaoke Style",
    description: "Word-by-word",
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
      bold: false,
      italic: false,
      underline: false,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean subtitle",
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
      bold: false,
      italic: false,
      underline: false,
    },
  },
  {
    id: "speech-bubble",
    name: "Speech Bubble",
    description: "Comic-style",
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
      bold: false,
      italic: false,
      underline: false,
    },
  },
  {
    id: "banner",
    name: "Banner",
    description: "Full-width bar",
    preview: "🎯",
    style: {
      fontFamily: "Roboto",
      fontSize: 28,
      color: "#FFFFFF",
      backgroundColor: "rgba(138, 43, 226, 0.9)",
      position: { x: 50, y: 15 },
      shape: "banner",
      animation: "fade",
      outline: false,
      shadow: false,
      bold: true,
      italic: false,
      underline: false,
    },
  },
];

export const LeftSidebar = ({
  onSelectTemplate,
  selectedTemplate,
  style,
  onStyleChange,
}: LeftSidebarProps) => {
  const updateStyle = (updates: Partial<CaptionStyle>) => {
    onStyleChange({ ...style, ...updates });
  };

  return (
    <div className="w-80 border-r border-border bg-card overflow-y-auto">
      <Tabs defaultValue="templates" className="h-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Caption Templates</h3>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id
                    ? "border-primary ring-2 ring-primary"
                    : "border-border"
                }`}
                onClick={() => onSelectTemplate(template)}
              >
                {selectedTemplate?.id === template.id && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
                <div className="text-3xl mb-2">{template.preview}</div>
                <div className="text-sm font-semibold">{template.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {template.description}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customize" className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Advanced Styling</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shape</Label>
              <Select
                value={style.shape}
                onValueChange={(value: any) => updateStyle({ shape: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangular">Rectangular</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                  <SelectItem value="speech-bubble">Speech Bubble</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Animation</Label>
              <Select
                value={style.animation}
                onValueChange={(value: any) => updateStyle({ animation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="karaoke">Karaoke</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position X: {style.position.x}%</Label>
              <Slider
                value={[style.position.x]}
                onValueChange={([value]) =>
                  updateStyle({ position: { ...style.position, x: value } })
                }
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Position Y: {style.position.y}%</Label>
              <Slider
                value={[style.position.y]}
                onValueChange={([value]) =>
                  updateStyle({ position: { ...style.position, y: value } })
                }
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Outline</Label>
              <Switch
                checked={style.outline}
                onCheckedChange={(checked) => updateStyle({ outline: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Shadow</Label>
              <Switch
                checked={style.shadow}
                onCheckedChange={(checked) => updateStyle({ shadow: checked })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
