import { useState } from "react";
import { VideoRecorder } from "@/components/VideoRecorder";
import { CaptionEditor } from "@/components/CaptionEditor";
import { TemplateSelector } from "@/components/TemplateSelector";
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
  });

  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8 text-center animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            CaptionCam
          </h1>
          <p className="text-muted-foreground text-lg">
            Record, Caption, and Share - All in One Place
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          <div className="space-y-6">
            <VideoRecorder
              captionStyle={captionStyle}
              captionsEnabled={captionsEnabled}
              onCaptionsToggle={setCaptionsEnabled}
            />
          </div>

          <div className="space-y-6">
            <TemplateSelector
              onSelectTemplate={(template) => {
                setSelectedTemplate(template);
                setCaptionStyle(template.style);
              }}
              selectedTemplate={selectedTemplate}
            />

            <CaptionEditor
              style={captionStyle}
              onStyleChange={setCaptionStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
