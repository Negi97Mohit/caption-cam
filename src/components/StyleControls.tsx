import { CaptionStyle } from "@/types/caption";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

interface StyleControlsProps {
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

export const StyleControls = ({ style, onStyleChange }: StyleControlsProps) => {
  // A single, robust handler for all style property updates
  const handleValueChange = <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) => {
    onStyleChange({ ...style, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Font Family Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="font-family">Font Family</Label>
        <Select
          value={style.fontFamily}
          onValueChange={(value) => handleValueChange("fontFamily", value)}
        >
          <SelectTrigger id="font-family">
            <SelectValue placeholder="Select a font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Roboto">Roboto</SelectItem>
            <SelectItem value="Open Sans">Open Sans</SelectItem>
            <SelectItem value="Montserrat">Montserrat</SelectItem>
            <SelectItem value="Playfair Display">Playfair Display</SelectItem>
            <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size Slider */}
      <div className="space-y-2">
        <Label htmlFor="font-size">Font Size: {style.fontSize}px</Label>
        <Slider
          id="font-size"
          value={[style.fontSize]}
          onValueChange={([value]) => handleValueChange("fontSize", value)}
          min={12}
          max={96}
          step={1}
        />
      </div>

      {/* Color Pickers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Text Color</Label>
          <Input
            id="color"
            type="color"
            value={style.color}
            onChange={(e) => handleValueChange("color", e.target.value)}
            className="p-1 h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bg-color">Background Color</Label>
          <Input
            id="bg-color"
            type="color"
            value={style.backgroundColor}
            onChange={(e) => handleValueChange("backgroundColor", e.target.value)}
            className="p-1 h-10"
          />
        </div>
      </div>
      
      {/* Boolean Toggles */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 pt-2">
        <div className="flex items-center space-x-2">
          <Switch 
            id="bold-toggle" 
            checked={style.bold} 
            onCheckedChange={(checked) => handleValueChange("bold", checked)}
          />
          <Label htmlFor="bold-toggle">Bold</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="italic-toggle"
            checked={style.italic}
            onCheckedChange={(checked) => handleValueChange("italic", checked)}
          />
          <Label htmlFor="italic-toggle">Italic</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="underline-toggle"
            checked={style.underline}
            onCheckedChange={(checked) => handleValueChange("underline", checked)}
          />
          <Label htmlFor="underline-toggle">Underline</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="shadow-toggle"
            checked={style.shadow}
            onCheckedChange={(checked) => handleValueChange("shadow", checked)}
          />
          <Label htmlFor="shadow-toggle">Shadow</Label>
        </div>
      </div>
    </div>
  );
};