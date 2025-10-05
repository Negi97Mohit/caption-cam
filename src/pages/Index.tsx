
import { useState, useCallback, useEffect } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, AICommand } from "@/types/caption";
import { processCommandWithAgent } from "@/lib/ai";
import { toast } from "sonner";
import { useLog } from "@/context/LogContext";
import { useDebug } from "@/context/DebugContext";

// Define the type for our dynamically generated overlays
export type GeneratedOverlay = {
  id: string;
  componentCode: string;
  layout: {
    position: { x: number; y: number };
    size: { width: number | string; height: number | string };
    zIndex: number;
  };
};

const Index = () => {
  // State for generated overlay components
  const [generatedOverlays, setGeneratedOverlays] = useState<GeneratedOverlay[]>([]);
  
  // State for dynamically applied styles and effects
  const [liveCaptionStyle, setLiveCaptionStyle] = useState<React.CSSProperties>({});
  const [videoFilter, setVideoFilter] = useState<string>('none');

  // --- Other existing state ---
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    fontFamily: "Inter", fontSize: 24, color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.8)",
    position: { x: 50, y: 85 }, shape: "rounded", animation: "fade", outline: false, shadow: true,
    bold: false, italic: false, underline: false,
  });
  const [backgroundEffect, setBackgroundEffect] = useState<'none' | 'blur' | 'image'>('none');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isAutoFramingEnabled, setIsAutoFramingEnabled] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen" | "both">("webcam");
  const [isAiModeEnabled, setIsAiModeEnabled] = useState(true);

  const { log } = useLog();
  const { setDebugInfo } = useDebug();
  
  // Function to apply theme changes to the document's root element
  const applyTheme = (theme) => {
    const root = document.documentElement;
    // Simple hex to HSL conversion for ShadCN compatibility
    const hexToHsl = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return `${(h * 360).toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
    };
    
    if (theme.primary) root.style.setProperty('--primary', hexToHsl(theme.primary));
    if (theme.background) root.style.setProperty('--background', hexToHsl(theme.background));
    if (theme.foreground) root.style.setProperty('--foreground', hexToHsl(theme.foreground));
    if (theme.card) root.style.setProperty('--card', hexToHsl(theme.card));
    if (theme.border) root.style.setProperty('--border', hexToHsl(theme.border));
    if (theme.primary_foreground) root.style.setProperty('--primary-foreground', hexToHsl(theme.primary_foreground));
  };


  // --- NEW MASTER AI COMMAND PROCESSOR ---
  const processTranscript = useCallback(async (transcript: string) => {
    if (!isAiModeEnabled) {
      toast.info("AI Mode is off. Turn it on to use AI commands.");
      return;
    }

    log('TRANSCRIPT', 'Processing command', transcript);
    setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, aiResponse: null, error: null }));
    toast.loading("AI is thinking...");

    try {
      const command = await processCommandWithAgent(transcript);
      log('AI_RESPONSE', 'Agent command received', command);
      setDebugInfo((prev) => ({ ...prev, aiResponse: command as any }));

      if (!command) throw new Error("AI did not return a valid command.");

      // --- COMMAND DISPATCHER ---
      switch (command.tool) {
        case 'generate_ui_component':
          const newOverlay: GeneratedOverlay = {
            id: `gen-${Date.now()}`,
            componentCode: command.componentCode,
            layout: command.layout || { position: { x: 100, y: 100 }, size: { width: 300, height: 150 }, zIndex: 10 },
          };
          setGeneratedOverlays(prev => [...prev, newOverlay]);
          toast.success("AI generated a new overlay!");
          break;

        case 'apply_live_caption_style':
          setLiveCaptionStyle(command.style);
          toast.success("Live caption style updated!");
          break;

        case 'apply_video_effect':
          setVideoFilter(command.filter);
          toast.success("Video effect applied!");
          break;

        case 'change_app_theme':
          applyTheme(command.theme);
          toast.success("Application theme changed!");
          break;

        default:
          toast.warning("AI returned an unknown command.");
      }
    } catch (error) {
      log('ERROR', 'Error in processTranscript', error);
      setDebugInfo((prev) => ({ ...prev, error: "AI command processing failed." }));
      toast.error("AI command failed: " + error.message);
    }
  }, [isAiModeEnabled, log, setDebugInfo]);

  const handleLayoutChange = (id: string, key: 'position' | 'size', value: any) => {
      setGeneratedOverlays(prev => prev.map(o => 
          o.id === id ? { ...o, layout: { ...o.layout, [key]: value } } : o
      ));
  };
  
  const handleRemoveOverlay = (id: string) => {
      setGeneratedOverlays(prev => prev.filter(o => o.id !== id));
  };

  const isMinimized = isSidebarCollapsed && !isHoveringSidebar;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopToolbar
        captionsEnabled={captionsEnabled}
        onCaptionsToggle={setCaptionsEnabled}
        isSidebarVisible={!isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(prev => !prev)}
        isAiModeEnabled={isAiModeEnabled}
        onAiModeToggle={setIsAiModeEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          style={captionStyle}
          onStyleChange={setCaptionStyle}
          width={isMinimized ? 64 : sidebarWidth}
          isCollapsed={isMinimized}
          onResize={setSidebarWidth}
          onMouseEnter={() => setIsHoveringSidebar(true)}
          onMouseLeave={() => setIsHoveringSidebar(false)}
          backgroundEffect={backgroundEffect}
          onBackgroundEffectChange={setBackgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          onBackgroundImageUrlChange={setBackgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          onAutoFramingChange={setIsAutoFramingEnabled}
          onTextSubmit={processTranscript}
        />

        <VideoCanvas
          captionsEnabled={captionsEnabled}
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          backgroundEffect={backgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          onProcessTranscript={processTranscript}
          generatedOverlays={generatedOverlays}
          onOverlayLayoutChange={handleLayoutChange}
          onRemoveOverlay={handleRemoveOverlay}
          liveCaptionStyle={liveCaptionStyle}
          videoFilter={videoFilter}
        />
      </div>
    </div>
  );
};

export default Index;