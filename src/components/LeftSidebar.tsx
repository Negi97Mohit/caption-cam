import React, { useState, useEffect, useCallback } from "react";
import { CaptionStyle, CaptionTemplate } from "@/types/caption";
import { PRESET_TEMPLATES } from "@/lib/presets";
import { StyleControls } from "./StyleControls";
import { DebugPanel } from "./DebugPanel";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { LayoutTemplate, Palette, Bug } from "lucide-react";
import { Button } from "./ui/button"; // FIXED: Added the missing import for Button

interface LeftSidebarProps {
  onSelectTemplate: (template: CaptionTemplate) => void;
  selectedTemplate: CaptionTemplate | null;
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  width: number;
  isCollapsed: boolean;
  onResize: (width: number) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export const LeftSidebar = ({ 
  onSelectTemplate, selectedTemplate, style, onStyleChange, 
  width, isCollapsed, onResize, onMouseEnter, onMouseLeave 
}: LeftSidebarProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const isResizing = React.useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      let newWidth = e.clientX;
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
      onResize(newWidth);
    }
  }, [onResize]);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const previewStyle: React.CSSProperties = {
    fontFamily: style.fontFamily, fontSize: `${style.fontSize}px`, color: style.color,
    backgroundColor: style.backgroundColor, fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal", textDecoration: style.underline ? "underline" : "none",
    textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.5)" : "none",
  };

  return (
    <aside
      className="relative bg-card/50 backdrop-blur-lg flex flex-col h-full z-10 transition-all duration-300 ease-in-out"
      style={{ width: `${width}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cn("flex-1 flex flex-col overflow-hidden transition-opacity duration-200", isCollapsed && "opacity-0")}>
        {/* --- EXPANDED VIEW --- */}
        <div className="p-4 border-b">
          <div className="h-24 w-full rounded-lg bg-background/50 flex items-center justify-center p-2">
            <div className="px-4 py-2 rounded-md text-center truncate" style={previewStyle}>
              Your Caption
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <Accordion type="multiple" defaultValue={["customize"]} className="w-full">
            <AccordionItem value="templates">
              <AccordionTrigger className="px-4 text-base font-semibold">Templates</AccordionTrigger>
              <AccordionContent className="px-4">
                <p className="text-sm text-muted-foreground mb-4">Select a style to get started.</p>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className={`cursor-pointer rounded-lg border-2 transition-all ${selectedTemplate?.id === template.id ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"}`}
                      onClick={() => onSelectTemplate(template)}
                    >
                      <img src={template.preview} alt={template.name} className="w-full rounded-md aspect-[2/1] object-cover" />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="customize">
              <AccordionTrigger className="px-4 text-base font-semibold">Customize Style</AccordionTrigger>
              <AccordionContent className="px-4">
                <StyleControls style={style} onStyleChange={onStyleChange} />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="debug">
              <AccordionTrigger className="px-4 text-base font-semibold">Debug</AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="flex items-center justify-between mb-4">
                  <Label htmlFor="debug-panel-toggle" className="font-medium">Show Debug Panel</Label>
                  <Switch id="debug-panel-toggle" checked={showDebug} onCheckedChange={setShowDebug} />
                </div>
                {showDebug && <DebugPanel />}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </div>

      {/* --- COLLAPSED / MINIMIZED VIEW --- */}
      <div className={cn("absolute top-0 left-0 h-full w-full flex flex-col items-center py-4 gap-4 transition-opacity duration-200", !isCollapsed && "opacity-0 pointer-events-none")}>
        <div className="flex flex-col gap-2">
           <Button variant="ghost" size="icon" className="w-10 h-10">
              <LayoutTemplate className="w-5 h-5" />
           </Button>
           <Button variant="ghost" size="icon" className="w-10 h-10">
              <Palette className="w-5 h-5" />
           </Button>
           <Button variant="ghost" size="icon" className="w-10 h-10">
              <Bug className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* --- RESIZE HANDLE --- */}
      <div
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors mx-auto" />
      </div>
    </aside>
  );
};