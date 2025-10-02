import { useState } from "react";
import { CaptionStyle, CaptionTemplate } from "@/types/caption";
import { PRESET_TEMPLATES } from "@/lib/presets";
import { Separator } from "./ui/separator";
import { StyleControls } from "./StyleControls";
import { DebugPanel } from "./DebugPanel";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";

interface LeftSidebarProps {
  onSelectTemplate: (template: CaptionTemplate) => void;
  selectedTemplate: CaptionTemplate | null;
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

export const LeftSidebar = ({ onSelectTemplate, selectedTemplate, style, onStyleChange }: LeftSidebarProps) => {
  const [showDebug, setShowDebug] = useState(false);

  // This style object is used for the live preview
  const previewStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.5)" : "none",
  };

  return (
    <aside className="w-96 bg-card border-r flex flex-col h-full">
      {/* Live Preview Section */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight mb-2">Live Preview</h2>
        <div className="h-24 w-full rounded-lg bg-muted flex items-center justify-center p-2">
          <div
            className="px-4 py-2 rounded-md text-center"
            style={previewStyle}
          >
            Your Caption
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={["customize"]} className="w-full">
          {/* Templates Section */}
          <AccordionItem value="templates">
            <AccordionTrigger className="px-4 text-base font-semibold">Templates</AccordionTrigger>
            <AccordionContent className="px-4">
              <p className="text-sm text-muted-foreground mb-4">Select a style to get started.</p>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`cursor-pointer rounded-lg border-2 transition-all ${
                      selectedTemplate?.id === template.id ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => onSelectTemplate(template)}
                  >
                    <img src={template.preview} alt={template.name} className="w-full rounded-md aspect-[2/1] object-cover" />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Customize Section */}
          <AccordionItem value="customize">
            <AccordionTrigger className="px-4 text-base font-semibold">Customize Style</AccordionTrigger>
            <AccordionContent className="px-4">
              <StyleControls style={style} onStyleChange={onStyleChange} />
            </AccordionContent>
          </AccordionItem>
          
          {/* Debug Section */}
          <AccordionItem value="debug">
            <AccordionTrigger className="px-4 text-base font-semibold">Debug</AccordionTrigger>
            <AccordionContent className="px-4">
               <div className="flex items-center justify-between mb-4">
                <Label htmlFor="debug-panel-toggle" className="font-medium">
                  Show Debug Panel
                </Label>
                <Switch
                  id="debug-panel-toggle"
                  checked={showDebug}
                  onCheckedChange={setShowDebug}
                />
              </div>
              {showDebug && <DebugPanel />}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </aside>
  );
};