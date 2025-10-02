import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaptionStyle } from "@/types/caption";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
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
  const { theme, setTheme } = useTheme();
  const updateStyle = (updates: Partial<CaptionStyle>) => {
    onStyleChange({ ...style, ...updates });
  };

  return (
    <div className="h-16 border-b border-border bg-card px-4 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary" />
        <span className="font-bold text-xl">gaki がき/ガキ</span>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Font Selector */}

      <div className="ml-auto flex items-center gap-2">
          <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
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
