import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CaptionStyle } from "@/types/caption";

interface CaptionEditorProps {
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

const FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Playfair Display",
  "Bebas Neue",
];

export const CaptionEditor = ({ style, onStyleChange }: CaptionEditorProps) => {
  const updateStyle = (updates: Partial<CaptionStyle>) => {
    onStyleChange({ ...style, ...updates });
  };

  return (
    <Card className="p-6 bg-card border-border space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold">Customize Captions</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select
            value={style.fontFamily}
            onValueChange={(value) => updateStyle({ fontFamily: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Font Size: {style.fontSize}px</Label>
          <Slider
            value={[style.fontSize]}
            onValueChange={([value]) => updateStyle({ fontSize: value })}
            min={12}
            max={72}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label>Text Color</Label>
          <input
            type="color"
            value={style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-full h-10 rounded-md cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <Label>Background Color</Label>
          <input
            type="color"
            value={style.backgroundColor}
            onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
            className="w-full h-10 rounded-md cursor-pointer"
          />
        </div>

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
          <Label>Text Outline</Label>
          <Switch
            checked={style.outline}
            onCheckedChange={(checked) => updateStyle({ outline: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Text Shadow</Label>
          <Switch
            checked={style.shadow}
            onCheckedChange={(checked) => updateStyle({ shadow: checked })}
          />
        </div>
      </div>
    </Card>
  );
};
