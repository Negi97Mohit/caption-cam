import React, { useState, useCallback } from "react";
import { CaptionStyle, GeneratedOverlay } from "@/types/caption";
import { StyleControls } from "./StyleControls";
import { DebugPanel } from "./DebugPanel";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
// UPDATED: Added the 'Ban' icon to the import list
import { Palette, Bug, Sparkles, Droplets, Trash2, Ban } from "lucide-react";
import { Button } from "./ui/button";
import { BACKGROUND_PRESETS } from "@/lib/backgrounds";
import { Slider } from "./ui/slider";

interface LeftSidebarProps {
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
  savedOverlays: GeneratedOverlay[];
  onAddSavedOverlay: (overlay: GeneratedOverlay) => void;
  onDeleteSavedOverlay: (id: string) => void;
  zoomSensitivity: number;
  onZoomSensitivityChange: (value: number) => void;
  trackingSpeed: number;
  onTrackingSpeedChange: (value: number) => void;
  isBeautifyEnabled: boolean;
  onBeautifyToggle: (enabled: boolean) => void;
  isLowLightEnabled: boolean;
  onLowLightToggle: (enabled: boolean) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export const LeftSidebar = ({
  style, onStyleChange,
  width, isCollapsed, onResize, onMouseEnter, onMouseLeave,
  backgroundEffect, onBackgroundEffectChange, backgroundImageUrl, onBackgroundImageUrlChange,
  isAutoFramingEnabled, onAutoFramingChange,
  savedOverlays, onAddSavedOverlay, onDeleteSavedOverlay,
  zoomSensitivity, onZoomSensitivityChange,
  trackingSpeed, onTrackingSpeedChange,
  isBeautifyEnabled, onBeautifyToggle,
  isLowLightEnabled, onLowLightToggle,
}: LeftSidebarProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const isResizing = React.useRef(false);

  const handleBackgroundSelect = (effect: 'none' | 'blur' | 'image', url: string | null = null) => {
    onBackgroundEffectChange(effect);
    onBackgroundImageUrlChange(url);
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


  return (
    <aside
      className="relative bg-card/80 backdrop-blur-xl border-r flex flex-col h-full z-10 transition-all duration-300 ease-in-out shadow-lg"
      style={{ width: `${width}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-6 py-6 px-2">
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Saved Overlays">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Text Styles">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Video Effects">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Debug">
            <Bug className="w-5 h-5 text-primary" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden transition-opacity duration-200">
        <ScrollArea className="flex-1 px-4">
          <Accordion type="multiple" defaultValue={["saved-overlays", "effects"]} className="w-full">

            <AccordionItem value="saved-overlays">
                <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">Saved Overlays</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                      {savedOverlays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center p-4">
                          Generated overlays will be saved here for reuse.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {savedOverlays.map(overlay => (
                            <div key={overlay.id} className="group relative aspect-video rounded-md bg-secondary/50 flex items-center justify-center overflow-hidden border">
                              <button 
                                className="w-full h-full"
                                onClick={() => onAddSavedOverlay(overlay)}
                                title={`Add overlay to canvas`}
                              >
                                {overlay.preview ? (
                                    <img src={overlay.preview} alt="Overlay preview" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-muted-foreground">No Preview</span>
                                )}
                              </button>
                              <Button 
                                variant="destructive"
                                size="icon" 
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onDeleteSavedOverlay(overlay.id)}
                                title="Delete saved overlay"
                              >
                                  <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="customize">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Base Text Style</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-4">Base styles for any generated text. The AI may override these.</p>
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
                  
                  {isAutoFramingEnabled && (
                    <div className="space-y-4 pl-2 pr-1 pb-2 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="zoom-sensitivity" className="text-sm">Zoom Sensitivity</Label>
                        <Slider
                          id="zoom-sensitivity"
                          value={[zoomSensitivity]}
                          onValueChange={([value]) => onZoomSensitivityChange(value)}
                          min={1.5}
                          max={8}
                          step={0.1}
                        />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="tracking-speed" className="text-sm">Tracking Speed</Label>
                         <Slider
                           id="tracking-speed"
                           value={[trackingSpeed]}
                           onValueChange={([value]) => onTrackingSpeedChange(value)}
                           min={0.01}
                           max={0.2}
                           step={0.01}
                         />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Label htmlFor="beautify-toggle" className="font-medium">Beautify Filter (Soften)</Label>
                    <Switch id="beautify-toggle" checked={isBeautifyEnabled} onCheckedChange={onBeautifyToggle} />
                  </div>
                   <div className="flex items-center justify-between">
                    <Label htmlFor="low-light-toggle" className="font-medium">Low-light Mode</Label>
                    <Switch id="low-light-toggle" checked={isLowLightEnabled} onCheckedChange={onLowLightToggle} />
                  </div>
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
      )}

      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
          onMouseDown={handleMouseDown}
        >
          <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors mx-auto" />
        </div>
      )}
    </aside>
  );
};