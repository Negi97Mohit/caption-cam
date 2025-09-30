import { useState } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, CaptionTemplate } from "@/types/caption";

const Index = () => {
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    fontFamily: "Inter",
    fontSize: 24,
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    position: { x: 50, y: 85 },
    shape: "rounded",
    animation: "fade",
    outline: false,
    shadow: true,
    bold: false,
    italic: false,
    underline: false,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen" | "both">("webcam");

  const handleTemplateSelect = (template: CaptionTemplate) => {
    setSelectedTemplate(template);
    setCaptionStyle(template.style);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Toolbar */}
      <TopToolbar
        style={captionStyle}
        onStyleChange={setCaptionStyle}
        captionsEnabled={captionsEnabled}
        onCaptionsToggle={setCaptionsEnabled}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
          style={captionStyle}
          onStyleChange={setCaptionStyle}
        />

        {/* Central Canvas */}
        <VideoCanvas
          captionStyle={captionStyle}
          captionsEnabled={captionsEnabled}
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          onCaptionPositionChange={(position) =>
            setCaptionStyle({ ...captionStyle, position })
          }
        />
      </div>
    </div>
  );
};

export default Index;
