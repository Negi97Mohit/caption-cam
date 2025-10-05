// src/pages/Index.tsx

import { useState, useCallback } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle } from "@/types/caption";
import { generateComponentCodeWithAI } from "@/lib/ai";
import { toast } from "sonner";
import { useLog } from "@/context/LogContext";
import { useDebug } from "@/context/DebugContext";

// Define the new type for our dynamically generated overlays
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
  // This state remains for the base styling of any potential text component
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    fontFamily: "Inter", fontSize: 24, color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.8)",
    position: { x: 50, y: 85 }, shape: "rounded", animation: "fade", outline: false, shadow: true,
    bold: false, italic: false, underline: false,
  });

  // The old caption/graph state is replaced with a single array for all generated overlays
  const [generatedOverlays, setGeneratedOverlays] = useState<GeneratedOverlay[]>([]);

  // Other state remains the same
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

  // REWRITTEN AI Processing Logic
  const processTranscript = useCallback(async (transcript: string) => {
    if (!isAiModeEnabled) {
      toast.info("AI Mode is off. Turn it on to generate overlays.");
      return;
    }

    log('TRANSCRIPT', 'Raw transcript for generation', transcript);
    setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, aiResponse: null, error: null }));

    try {
      toast.loading("Generating component from your command...");
      const aiResponse = await generateComponentCodeWithAI(transcript);
      
      log('AI_RESPONSE', 'Generated component response', aiResponse);
      setDebugInfo((prev) => ({ ...prev, aiResponse }));

      if (aiResponse && aiResponse.componentCode) {
        const newOverlay: GeneratedOverlay = {
          id: `gen-${Date.now()}`,
          componentCode: aiResponse.componentCode,
          layout: aiResponse.layout || { position: { x: 100, y: 100 }, size: { width: 300, height: 150 }, zIndex: 10 },
        };
        setGeneratedOverlays(prev => [...prev, newOverlay]);
        toast.success("AI component generated and added to canvas!");
      } else {
        throw new Error("Invalid response structure from AI.");
      }
    } catch (error) {
      log('ERROR', 'Error in processTranscript', error);
      setDebugInfo((prev) => ({ ...prev, error: "AI component generation failed." }));
      toast.error("Failed to generate component from speech.");
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
        />
      </div>
    </div>
  );
};

export default Index;

