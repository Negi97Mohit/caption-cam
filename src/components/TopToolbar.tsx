import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CaptionStyle } from "@/types/caption";
import { useTheme } from "next-themes";
import { Moon, Sun, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Sparkles, BrainCircuit } from "lucide-react";

interface TopToolbarProps {
  captionsEnabled: boolean;
  onCaptionsToggle: (enabled: boolean) => void;
  isSidebarVisible: boolean;
  onSidebarToggle: () => void;
  isAiModeEnabled: boolean; // ADDED
  onAiModeToggle: (enabled: boolean) => void; // ADDED
}

export const TopToolbar = ({
  captionsEnabled,
  onCaptionsToggle,
  isSidebarVisible,
  onSidebarToggle,
  isAiModeEnabled,
  onAiModeToggle,
}: TopToolbarProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-16 border-b-2 border-border bg-card px-4 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary" />
        <span className="font-bold text-xl">gaki がき</span>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Sidebar Toggle Button */}
      <Button variant="ghost" size="icon" onClick={onSidebarToggle}>
        {isSidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
        <span className="sr-only">Toggle sidebar</span>
      </Button>

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
        
        {/* --- NEW: AI Mode Toggle Button --- */}
        <Button
          variant={isAiModeEnabled ? "default" : "secondary"}
          size="sm"
          onClick={() => onAiModeToggle(!isAiModeEnabled)}
          title={isAiModeEnabled ? "Turn off AI features" : "Turn on AI features"}
        >
          {isAiModeEnabled ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Mode On
            </>
          ) : (
            <>
              <BrainCircuit className="w-4 h-4 mr-2" />
              AI Mode Off
            </>
          )}
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