import { useState, useCallback, useEffect } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, GeneratedOverlay, AICommand, DEFAULT_LAYOUT_STATE, LayoutMode, CameraShape, SingleActionCommand, ChainedAction, GenerateUICommand } from "@/types/caption";
import { processCommandWithAgent } from "@/lib/ai";
import { toast } from "sonner";
import { useLog } from "@/context/LogContext";
import { useDebug } from "@/context/DebugContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toPng } from 'html-to-image';

const generateOverlayId = (() => {
  let counter = 0;
  return () => `overlay-${Date.now()}-${++counter}`;
})();

const substituteStateInAction = (action: ChainedAction, state: any): ChainedAction => {
  const newAction: { [key: string]: any } = {};
  for (const key in action) {
    const value = (action as any)[key];
    if (typeof value === 'string') {
      newAction[key] = value.replace(/\$\{state\}/g, String(state));
    } else if (typeof value === 'object' && value !== null) {
      newAction[key] = substituteStateInAction(value, state);
    } else {
      newAction[key] = value;
    }
  }
  return newAction as ChainedAction;
};

const Index = () => {
  const [savedOverlays, setSavedOverlays] = useLocalStorage<GeneratedOverlay[]>("savedOverlays", []);
  const [activeOverlays, setActiveOverlays] = useState<GeneratedOverlay[]>([]);
  const [liveCaptionStyle, setLiveCaptionStyle] = useState<React.CSSProperties>({});
  const [videoFilter, setVideoFilter] = useState<string>('none');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiButtonPosition, setAiButtonPosition] = useState({ x: 92, y: 85 });

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
  
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | undefined>(undefined);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | undefined>(undefined);

  const [isAiModeEnabled, setIsAiModeEnabled] = useState(true);
  const [zoomSensitivity, setZoomSensitivity] = useState(4.0);
  const [trackingSpeed, setTrackingSpeed] = useState(0.07);

  const [isBeautifyEnabled, setIsBeautifyEnabled] = useState(false);
  const [isLowLightEnabled, setIsLowLightEnabled] = useState(false);
  const [dynamicStyle, setDynamicStyle] = useState('none');

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULT_LAYOUT_STATE.mode);
  const [cameraShape, setCameraShape] = useState<CameraShape>(DEFAULT_LAYOUT_STATE.cameraShape);
  const [splitRatio, setSplitRatio] = useState(DEFAULT_LAYOUT_STATE.splitRatio);
  const [pipPosition, setPipPosition] = useState(DEFAULT_LAYOUT_STATE.pipPosition);
  const [pipSize, setPipSize] = useState(DEFAULT_LAYOUT_STATE.pipSize);
  const [customMaskUrl, setCustomMaskUrl] = useState<string | undefined>(undefined);

  const { log } = useLog();
  const { setDebugInfo } = useDebug();

  const executeCommand = useCallback((action: SingleActionCommand, currentOverlays: GeneratedOverlay[]): GeneratedOverlay[] => {
      log('AI_ACTION', `Executing: ${action.tool}`, action);
      let updatedOverlays = [...currentOverlays];
      switch (action.tool) {
        case 'generate_ui_component': {
            if (updatedOverlays.some(o => o.name === action.name)) { 
              break; 
            }
            const newOverlay: GeneratedOverlay = {
              id: generateOverlayId(),
              name: action.name, componentCode: action.componentCode,
              layout: action.layout || { position: { x: 10, y: 10 }, size: { width: 30, height: 15 }, zIndex: 10 },
              chainedAction: (action as GenerateUICommand).chained,
            };
            updatedOverlays = [...updatedOverlays, newOverlay];
            break;
        }
        case 'update_ui_component': {
            updatedOverlays = updatedOverlays.map(o => {
              if (o.name === action.targetId) { return { ...o, layout: { ...o.layout, ...action.layout } }; } return o;
            });
            break;
        }
        case 'delete_ui_component': {
            updatedOverlays = updatedOverlays.filter(o => o.name !== action.targetId);
            break;
        }
        case 'apply_live_caption_style': {
            setCaptionStyle(prevStyle => ({ ...prevStyle, ...action.style }));
            toast.success("Caption style updated by AI.");
            break;
        }
        case 'apply_video_effect': setVideoFilter(action.filter); break;
        default: console.warn("AI returned an unknown command.");
      }
      return updatedOverlays;
  }, [log]);
  
  const generatePreview = useCallback((overlayId: string) => {
    const node = document.getElementById(overlayId);
    if (node) {
      toPng(node, { cacheBust: true, style: { background: 'transparent' }, skipFonts: true })
        .then((dataUrl) => { setSavedOverlays(prev => prev.map(o => o.id === overlayId ? { ...o, preview: dataUrl } : o)); })
        .catch((err) => { console.error('Failed to generate preview image', err); });
    }
  }, [setSavedOverlays]);

  const processTranscript = useCallback(async (transcript: string) => {
    if (!isAiModeEnabled || isProcessingAi) { return; }
    log('TRANSCRIPT', 'Processing command', transcript);
    setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, aiResponse: null, error: null }));
    const thinkingToast = toast.loading("AI is thinking...");
    setIsProcessingAi(true);
    try {
      const originalOverlays = [...activeOverlays];
      const command = await processCommandWithAgent(transcript, originalOverlays);
      log('AI_RESPONSE', 'Agent command received', command);
      setDebugInfo((prev) => ({ ...prev, aiResponse: command as any }));
      if (!command) throw new Error("AI did not return a valid command.");
      
      const actions = command.tool === 'multi_tool_reasoning' ? command.actions : [command as SingleActionCommand];
      if(command.tool === 'multi_tool_reasoning') { toast.info(`AI is performing ${actions.length} actions...`); }

      let finalOverlays = [...originalOverlays];
      for (const action of actions) {
          finalOverlays = executeCommand(action, finalOverlays);
      }

      const originalOverlayIds = new Set(originalOverlays.map(o => o.id));
      const newlyCreatedOverlay = finalOverlays.find(o => !originalOverlayIds.has(o.id));

      if (newlyCreatedOverlay) {
        toast.success(`AI generated: "${newlyCreatedOverlay.name}"`);
        setSavedOverlays(prev => [...prev, newlyCreatedOverlay]);
        setTimeout(() => generatePreview(newlyCreatedOverlay.id), 500);
      }

      setActiveOverlays(finalOverlays);

    } catch (error) {
      log('ERROR', 'Error in processTranscript', error);
      setDebugInfo((prev) => ({ ...prev, error: "AI command processing failed." }));
      toast.error("AI command failed: " + (error as Error).message);
    } finally {
        setIsProcessingAi(false);
        toast.dismiss(thinkingToast);
    }
  }, [isAiModeEnabled, isProcessingAi, activeOverlays, executeCommand, log, setDebugInfo, setSavedOverlays, generatePreview]);

  const handleLayoutChange = (id: string, key: 'position' | 'size', value: any) => {
      const updater = (prev: GeneratedOverlay[]) => prev.map(o => o.id === id ? { ...o, layout: { ...o.layout, [key]: value } } : o);
      setActiveOverlays(updater);
      setSavedOverlays(updater);
  };

  const handleOverlayStateChange = useCallback((overlayId: string, newState: any) => {
    setActiveOverlays(currentOverlays => {
        const overlay = currentOverlays.find(o => o.id === overlayId);
        if (!overlay || !overlay.chainedAction) {
            return currentOverlays;
        } 
        const resolvedAction = substituteStateInAction(overlay.chainedAction, newState);
        return executeCommand(resolvedAction as SingleActionCommand, currentOverlays);
    });
  }, [executeCommand]);
  
  const handleRemoveOverlay = (id: string) => {
      setActiveOverlays(prev => prev.filter(o => o.id !== id));
      toast.info("Overlay removed from canvas. It remains in your saved list.");
  };
  const addSavedOverlayToCanvas = (overlay: GeneratedOverlay) => {
    if (activeOverlays.find(o => o.id === overlay.id)) { toast.warning("This overlay is already on the canvas."); return; }
    setActiveOverlays(prev => [...prev, overlay]);
  };

  const handleCustomMaskUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { const result = e.target?.result; if (typeof result === 'string') { setCustomMaskUrl(result); toast.success("Custom camera mask uploaded!"); } };
    reader.readAsDataURL(file);
  };

  const isMinimized = isSidebarCollapsed && !isHoveringSidebar;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopToolbar
        captionsEnabled={captionsEnabled} onCaptionsToggle={setCaptionsEnabled}
        isSidebarVisible={!isSidebarCollapsed} onSidebarToggle={() => setIsSidebarCollapsed(prev => !prev)}
        isAiModeEnabled={isAiModeEnabled} onAiModeToggle={setIsAiModeEnabled}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          style={captionStyle} onStyleChange={setCaptionStyle}
          dynamicStyle={dynamicStyle} onDynamicStyleChange={setDynamicStyle}
          width={isMinimized ? 64 : sidebarWidth} isCollapsed={isMinimized}
          onResize={setSidebarWidth} onMouseEnter={() => setIsHoveringSidebar(true)} onMouseLeave={() => setIsHoveringSidebar(false)}
          backgroundEffect={backgroundEffect} onBackgroundEffectChange={setBackgroundEffect}
          backgroundImageUrl={backgroundImageUrl} onBackgroundImageUrlChange={setBackgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled} onAutoFramingChange={setIsAutoFramingEnabled}
          savedOverlays={savedOverlays} onAddSavedOverlay={addSavedOverlayToCanvas}
          onDeleteSavedOverlay={(id) => { setSavedOverlays(prev => prev.filter(o => o.id !== id)); setActiveOverlays(prev => prev.filter(o => o.id !== id)); }}
          zoomSensitivity={zoomSensitivity} onZoomSensitivityChange={setZoomSensitivity}
          trackingSpeed={trackingSpeed} onTrackingSpeedChange={setTrackingSpeed}
          isBeautifyEnabled={isBeautifyEnabled} onBeautifyToggle={setIsBeautifyEnabled}
          isLowLightEnabled={isLowLightEnabled} onLowLightToggle={setIsLowLightEnabled}
          videoFilter={videoFilter}
          onVideoFilterChange={setVideoFilter}
      />
        <VideoCanvas
          captionsEnabled={captionsEnabled} backgroundEffect={backgroundEffect} backgroundImageUrl={backgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled} onProcessTranscript={processTranscript}
          generatedOverlays={activeOverlays} onOverlayLayoutChange={handleLayoutChange}
          onOverlayStateChange={handleOverlayStateChange} onRemoveOverlay={handleRemoveOverlay}
          liveCaptionStyle={{...liveCaptionStyle, ...captionStyle}}
          dynamicStyle={dynamicStyle}
          videoFilter={videoFilter}
          isAudioOn={isAudioOn} onAudioToggle={setIsAudioOn}
          isVideoOn={isVideoOn} onVideoToggle={setIsVideoOn}
          isRecording={isRecording} onRecordingToggle={setIsRecording}
          selectedAudioDevice={selectedAudioDevice} onAudioDeviceSelect={setSelectedAudioDevice}
          selectedVideoDevice={selectedVideoDevice} onVideoDeviceSelect={setSelectedVideoDevice}
          zoomSensitivity={zoomSensitivity} trackingSpeed={trackingSpeed}
          isBeautifyEnabled={isBeautifyEnabled} isLowLightEnabled={isLowLightEnabled}
          layoutMode={layoutMode} cameraShape={cameraShape}
          splitRatio={splitRatio} pipPosition={pipPosition} pipSize={pipSize}
          onLayoutModeChange={setLayoutMode} onCameraShapeChange={setCameraShape}
          onSplitRatioChange={setSplitRatio} onPipPositionChange={setPipPosition} onPipSizeChange={setPipSize}
          customMaskUrl={customMaskUrl} onCustomMaskUpload={handleCustomMaskUpload}
          aiButtonPosition={aiButtonPosition} onAiButtonPositionChange={setAiButtonPosition}
        />
      </div>
    </div>
  );
};

export default Index;