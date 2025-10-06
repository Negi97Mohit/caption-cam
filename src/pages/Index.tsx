import { useState, useCallback, useEffect } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, GeneratedOverlay, AICommand } from "@/types/caption";
import { processCommandWithAgent } from "@/lib/ai";
import { toast } from "sonner";
import { useLog } from "@/context/LogContext";
import { useDebug } from "@/context/DebugContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toPng } from 'html-to-image';

const Index = () => {
  const [savedOverlays, setSavedOverlays] = useLocalStorage<GeneratedOverlay[]>("savedOverlays", []);
  const [activeOverlays, setActiveOverlays] = useState<GeneratedOverlay[]>([]);
  const [liveCaptionStyle, setLiveCaptionStyle] = useState<React.CSSProperties>({});
  const [videoFilter, setVideoFilter] = useState<string>('none');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

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
  
  // Media controls
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | undefined>(undefined);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | undefined>(undefined);

  const [isAiModeEnabled, setIsAiModeEnabled] = useState(true);

  // New: State for auto-tracking customization
  const [zoomSensitivity, setZoomSensitivity] = useState(2.5);
  const [trackingSpeed, setTrackingSpeed] = useState(0.07);

  const { log } = useLog();
  const { setDebugInfo } = useDebug();
  
  const applyTheme = (theme: any) => {
    const root = document.documentElement;
    const hexToHsl = (hex: string) => {
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

  const generatePreview = useCallback((overlayId: string) => {
    const node = document.getElementById(overlayId);
    if (node) {
      toPng(node, { cacheBust: true, style: { background: 'transparent' } })
        .then((dataUrl) => {
          setSavedOverlays(prev => 
            prev.map(o => o.id === overlayId ? { ...o, preview: dataUrl } : o)
          );
        })
        .catch((err) => {
          console.error('Failed to generate preview image', err);
        });
    }
  }, [setSavedOverlays]);

  const processTranscript = useCallback(async (transcript: string) => {
    if (!isAiModeEnabled) {
      toast.info("AI Mode is off. Turn it on to use AI commands.");
      return;
    }
    if (isProcessingAi) {
        toast.info("AI is already working on a previous command.");
        return;
    }

    log('TRANSCRIPT', 'Processing command', transcript);
    setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, aiResponse: null, error: null }));
    const thinkingToast = toast.loading("AI is thinking...");
    setIsProcessingAi(true);

    try {
      const command = await processCommandWithAgent(transcript) as AICommand;
      log('AI_RESPONSE', 'Agent command received', command);
      setDebugInfo((prev) => ({ ...prev, aiResponse: command as any }));

      if (!command) throw new Error("AI did not return a valid command.");

      switch (command.tool) {
        case 'generate_ui_component':
          const newOverlay: GeneratedOverlay = {
            id: `overlay-${Date.now()}`,
            componentCode: command.componentCode,
            layout: command.layout || { position: { x: 10, y: 10 }, size: { width: 30, height: 15 }, zIndex: 10 },
          };
          
          setActiveOverlays(prev => [...prev, newOverlay]);
          setSavedOverlays(prev => [...prev, newOverlay]);
          toast.success("AI generated a new overlay!");

          setTimeout(() => generatePreview(newOverlay.id), 500);
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
      toast.error("AI command failed: " + (error as Error).message);
    } finally {
        setIsProcessingAi(false);
        toast.dismiss(thinkingToast);
    }
  }, [isAiModeEnabled, log, setDebugInfo, isProcessingAi, setSavedOverlays, generatePreview]);

  const handleLayoutChange = (id: string, key: 'position' | 'size', value: any) => {
      const updater = (prev: GeneratedOverlay[]) => prev.map(o => 
          o.id === id ? { ...o, layout: { ...o.layout, [key]: value } } : o
      );
      setActiveOverlays(updater);
      setSavedOverlays(updater);
  };
  
  const handleRemoveOverlay = (id: string) => {
      setActiveOverlays(prev => prev.filter(o => o.id !== id));
      toast.info("Overlay removed from canvas. It remains in your saved list.");
  };

  const addSavedOverlayToCanvas = (overlay: GeneratedOverlay) => {
    if (activeOverlays.find(o => o.id === overlay.id)) {
        toast.warning("This overlay is already on the canvas.");
        return;
    }
    setActiveOverlays(prev => [...prev, overlay]);
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
          savedOverlays={savedOverlays}
          onAddSavedOverlay={addSavedOverlayToCanvas}
          onDeleteSavedOverlay={(id) => {
            setSavedOverlays(prev => prev.filter(o => o.id !== id));
            setActiveOverlays(prev => prev.filter(o => o.id !== id));
          }}
          onTextSubmit={processTranscript}
          // New: Pass tracking controls to the sidebar
          zoomSensitivity={zoomSensitivity}
          onZoomSensitivityChange={setZoomSensitivity}
          trackingSpeed={trackingSpeed}
          onTrackingSpeedChange={setTrackingSpeed}
        />

        <VideoCanvas
          captionsEnabled={captionsEnabled}
          backgroundEffect={backgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          onProcessTranscript={processTranscript}
          generatedOverlays={activeOverlays}
          onOverlayLayoutChange={handleLayoutChange}
          onRemoveOverlay={handleRemoveOverlay}
          liveCaptionStyle={liveCaptionStyle}
          videoFilter={videoFilter}
          isAudioOn={isAudioOn}
          onAudioToggle={setIsAudioOn}
          isVideoOn={isVideoOn}
          onVideoToggle={setIsVideoOn}
          isRecording={isRecording}
          onRecordingToggle={setIsRecording}
          selectedAudioDevice={selectedAudioDevice}
          onAudioDeviceSelect={setSelectedAudioDevice}
          selectedVideoDevice={selectedVideoDevice}
          onVideoDeviceSelect={setSelectedVideoDevice}
          // New: Pass tracking values to the canvas
          zoomSensitivity={zoomSensitivity}
          trackingSpeed={trackingSpeed}
        />
      </div>
    </div>
  );
};

export default Index;