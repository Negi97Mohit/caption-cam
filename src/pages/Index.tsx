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

  // --- NEW state for resizable and collapsible sidebar ---
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (w-96)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  // --- Other UI state ---
  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen" | "both">("webcam");

  const handleTemplateSelect = (template: CaptionTemplate) => {
    setSelectedTemplate(template);
    setCaptionStyle(template.style);
    if (selectedCaptionId) {
      setPermanentCaptions(caps => 
        caps.map(c => c.id === selectedCaptionId ? { ...c, style: template.style } : c)
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

  // Determine if the sidebar should be in its minimal, icon-only state
  const isMinimized = isSidebarCollapsed && !isHoveringSidebar;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopToolbar
        style={captionStyle}
        onStyleChange={setCaptionStyle}
        captionsEnabled={captionsEnabled}
        onCaptionsToggle={setCaptionsEnabled}
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(prev => !prev)}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
          style={styleForSidebar}
          onStyleChange={handleStyleChange}
          width={isMinimized ? 64 : sidebarWidth} // Pass calculated width
          isCollapsed={isMinimized}
          onResize={setSidebarWidth} // Pass setter for resizing
          onMouseEnter={() => setIsHoveringSidebar(true)}
          onMouseLeave={() => setIsHoveringSidebar(false)}
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
          onCaptionPositionChange={(position) =>
            setCaptionStyle({ ...captionStyle, position })
          }
        />
      </div>
    </div>
  );
};

export default Index;