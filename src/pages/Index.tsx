import { useState, useCallback, useEffect } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, CaptionTemplate, AIDecision } from "@/types/caption";

const Index = () => {
  // --- Default caption style state ---
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    fontFamily: "Inter", fontSize: 24, color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.8)",
    position: { x: 50, y: 85 }, shape: "rounded", animation: "fade", outline: false, shadow: true,
    bold: false, italic: false, underline: false,
  });

  // --- State for individual captions ---
  const [permanentCaptions, setPermanentCaptions] = useState<AIDecision[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // --- State for video effects ---
  const [backgroundEffect, setBackgroundEffect] = useState<'none' | 'blur' | 'image'>('none');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isAutoFramingEnabled, setIsAutoFramingEnabled] = useState(false);

  // --- State for resizable and collapsible sidebar ---
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (w-96)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  // --- Other UI state ---
  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen" | "both">("webcam");
  const [isAiModeEnabled, setIsAiModeEnabled] = useState(true);

  // --- CORRECTED FUNCTION ---
  const handleTemplateSelect = (template: CaptionTemplate) => {
    setSelectedTemplate(template);

    // Destructure the template's style to separate its position from other properties
    const { position: _, ...stylesToApply } = template.style;

    // Apply the new visual styles to the global default, but preserve the existing position
    setCaptionStyle(prev => ({ ...stylesToApply, position: prev.position }));

    // If a specific caption is selected, apply the new styles to it without changing its position
    if (selectedCaptionId) {
      setPermanentCaptions(caps =>
        caps.map(c => {
          if (c.id === selectedCaptionId) {
            return {
              ...c,
              style: {
                ...c.style!, // Keep the caption's existing style (which has the correct position)
                ...stylesToApply, // Apply the new template styles over it
              },
            };
          }
          return c;
        })
      );
    }
  };

  const handleStyleChange = useCallback((newStyle: CaptionStyle) => {
    if (selectedCaptionId) {
      setPermanentCaptions(caps =>
        caps.map(c => c.id === selectedCaptionId ? { ...c, style: newStyle } : c)
      );
    } else {
      setCaptionStyle(newStyle);
    }
  }, [selectedCaptionId]);

  const selectedCaption = permanentCaptions.find(c => c.id === selectedCaptionId);
  const styleForSidebar = selectedCaption?.style || captionStyle;

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
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
          style={styleForSidebar}
          onStyleChange={handleStyleChange}
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
        />

        <VideoCanvas
          captionStyle={captionStyle}
          captionsEnabled={captionsEnabled}
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          permanentCaptions={permanentCaptions}
          setPermanentCaptions={setPermanentCaptions}
          selectedCaptionId={selectedCaptionId}
          setSelectedCaptionId={setSelectedCaptionId}
          backgroundEffect={backgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          isAiModeEnabled={isAiModeEnabled}
        />
      </div>
    </div>
  );
};

export default Index;