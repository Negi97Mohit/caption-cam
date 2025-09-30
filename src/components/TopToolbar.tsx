import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaptionStyle } from "@/types/caption";
import { 
  Bold, 
  Italic, 
  Underline, 
  Type,
  Palette,
  Eye,
  EyeOff,
} from "lucide-react";

const FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Playfair Display",
  "Bebas Neue",
];

interface TopToolbarProps {
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  captionsEnabled: boolean;
  onCaptionsToggle: (enabled: boolean) => void;
}

export const TopToolbar = ({
  style,
  onStyleChange,
  captionsEnabled,
  onCaptionsToggle,
}: TopToolbarProps) => {
  const updateStyle = (updates: Partial<CaptionStyle>) => {
    onStyleChange({ ...style, ...updates });
  };

  return (
    <div className="h-16 border-b border-border bg-card px-4 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary" />
        <span className="font-bold text-xl">CaptionCam</span>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Font Selector */}
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-muted-foreground" />
        <Select value={style.fontFamily} onValueChange={(value) => updateStyle({ fontFamily: value })}>
          <SelectTrigger className="w-40">
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

      {/* Font Size */}
      <Select
        value={style.fontSize.toString()}
        onValueChange={(value) => updateStyle({ fontSize: parseInt(value) })}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72].map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-8" />

      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant={style.bold ? "default" : "ghost"}
          size="icon"
          onClick={() => updateStyle({ bold: !style.bold })}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant={style.italic ? "default" : "ghost"}
          size="icon"
          onClick={() => updateStyle({ italic: !style.italic })}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant={style.underline ? "default" : "ghost"}
          size="icon"
          onClick={() => updateStyle({ underline: !style.underline })}
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Color Pickers */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <input
            type="color"
            value={style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-10 h-10 rounded cursor-pointer"
            title="Text Color"
          />
        </div>
        <input
          type="color"
          value={style.backgroundColor}
          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
          className="w-10 h-10 rounded cursor-pointer"
          title="Background Color"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={captionsEnabled ? "default" : "secondary"}
          size="sm"
          onClick={() => onCaptionsToggle(!captionsEnabled)}
        >
          {captionsEnabled ? (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Captions On
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Captions Off
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
