// src/components/LeftSidebar.tsx

import React, { useState, useCallback } from "react";
import { CaptionStyle, CaptionTemplate, AIDecision, GraphObject } from "@/types/caption";
import { PRESET_TEMPLATES } from "@/lib/presets";
import { BACKGROUND_PRESETS } from "@/lib/backgrounds";
import { StyleControls } from "./StyleControls";
import { DebugPanel } from "./DebugPanel";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { LayoutTemplate, Palette, Bug, Sparkles, Ban, Droplets, Text, Wand2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { CustomStylesSelector } from "./CustomStylesSelector";

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
  backgroundEffect: 'none' | 'blur' | 'image';
  onBackgroundEffectChange: (effect: 'none' | 'blur' | 'image') => void;
  backgroundImageUrl: string | null;
  onBackgroundImageUrlChange: (url: string | null) => void;
  isAutoFramingEnabled: boolean;
  onAutoFramingChange: (enabled: boolean) => void;
  onTextSubmit: (text: string) => void;
  permanentCaptions: AIDecision[];
  graphs: GraphObject[];
  selectedCaptionId: string | null;
  onCustomStyleSelect: (style: Partial<CaptionStyle>) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export const LeftSidebar = ({
  onSelectTemplate, selectedTemplate, style, onStyleChange,
  width, isCollapsed, onResize, onMouseEnter, onMouseLeave,
  backgroundEffect, onBackgroundEffectChange, backgroundImageUrl, onBackgroundImageUrlChange,
  isAutoFramingEnabled, onAutoFramingChange, onTextSubmit,
  permanentCaptions, graphs, selectedCaptionId, onCustomStyleSelect
}: LeftSidebarProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const [manualText, setManualText] = useState("");
  const isResizing = React.useRef(false);

  const handleBackgroundSelect = (effect: 'none' | 'blur' | 'image', url: string | null = null) => {
    onBackgroundEffectChange(effect);
    onBackgroundImageUrlChange(url);
  };
  
  const handleTextSubmit = () => {
    if (!manualText.trim()) return;
    onTextSubmit(manualText);
    setManualText(""); // Clear input after submission
  };

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
        <div className="p-4 border-b">
          <div className="h-24 w-full rounded-lg bg-background/50 flex items-center justify-center p-2">
            <div className="px-4 py-2 rounded-md text-center truncate" style={previewStyle}>
              Your Caption
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4">
          <Accordion type="multiple" defaultValue={["customize", "effects"]} className="w-full">
            <AccordionItem value="templates">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 flex-shrink-0" /> 
                <span className="flex-1 text-left truncate">Templates</span>
              </AccordionTrigger>
              <AccordionContent>
                 <div className="pt-2 grid grid-cols-2 gap-3">
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
            
            <AccordionItem value="suggested-styles">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Suggested Styles</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <CustomStylesSelector
                    overlays={[...permanentCaptions, ...graphs]}
                    selectedOverlayId={selectedCaptionId}
                    onSelectStyle={onCustomStyleSelect}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="customize">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Customize Style</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <StyleControls style={style} onStyleChange={onStyleChange} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="effects">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Video Effects</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-6">
                  <div className="space-y-3">
                    <Label>Background</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant={backgroundEffect === 'none' ? 'default' : 'secondary'} className="h-16 flex-col" onClick={() => handleBackgroundSelect('none')}>
                        <Ban className="w-5 h-5 mb-1" /> None
                      </Button>
                      <Button variant={backgroundEffect === 'blur' ? 'default' : 'secondary'} className="h-16 flex-col" onClick={() => handleBackgroundSelect('blur')}>
                        <Droplets className="w-5 h-5 mb-1" /> Blur
                      </Button>
                      {BACKGROUND_PRESETS.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleBackgroundSelect('image', preset.imageUrl)}
                          className={cn(
                            "cursor-pointer rounded-md border-2 transition-all aspect-[16/10] bg-cover bg-center",
                            backgroundEffect === 'image' && backgroundImageUrl === preset.imageUrl ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"
                          )}
                          style={{ backgroundImage: `url(${preset.thumbnailUrl})` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Label htmlFor="auto-framing-toggle" className="font-medium">Auto-framing</Label>
                    <Switch id="auto-framing-toggle" checked={isAutoFramingEnabled} onCheckedChange={onAutoFramingChange} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="text-input">
                <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                    <Text className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">Manual Text Input</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-4">
                      <Label htmlFor="manual-caption">Enter text to generate a caption or command</Label>
                      <Textarea
                          id="manual-caption"
                          placeholder="e.g., Let's talk about quarterly earnings..."
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleTextSubmit();
                              }
                          }}
                      />
                      <Button onClick={handleTextSubmit} className="w-full">
                          Generate
                      </Button>
                  </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="debug">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Bug className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Debug</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <Label htmlFor="debug-panel-toggle" className="font-medium">Show Debug Panel</Label>
                    <Switch id="debug-panel-toggle" checked={showDebug} onCheckedChange={setShowDebug} />
                  </div>
                  {showDebug && <DebugPanel />}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </div>

      <div className={cn("absolute top-0 left-0 h-full w-full flex flex-col items-center py-4 gap-4 transition-opacity duration-200", !isCollapsed && "opacity-0 pointer-events-none")}>
        <div className="flex flex-col gap-2">
           <Button variant="ghost" size="icon" className="w-10 h-10"><LayoutTemplate className="w-5 h-5" /></Button>
           <Button variant="ghost" size="icon" className="w-10 h-10"><Palette className="w-5 h-5" /></Button>
           <Button variant="ghost" size="icon" className="w-10 h-10"><Sparkles className="w-5 h-5" /></Button>
           <Button variant="ghost" size="icon" className="w-10 h-10"><Bug className="w-5 h-5" /></Button>
        </div>
      </div>

      <div
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors mx-auto" />
      </div>
    </aside>
  );
};