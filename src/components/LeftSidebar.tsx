import React, { useState, useCallback, useRef, useEffect } from "react";
import { CaptionStyle, GeneratedOverlay, CaptionTemplate } from "@/types/caption";
import { StyleControls } from "./StyleControls";
import { DebugPanel } from "./DebugPanel";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { cn } from "@/lib/utils";
import { Palette, Bug, Sparkles, Droplets, Trash2, Ban, Paintbrush, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { BACKGROUND_PRESETS } from "@/lib/backgrounds";
import { Slider } from "./ui/slider";
import { FILTER_PRESETS } from "@/lib/filters.ts";
import { CAPTION_PRESETS } from "@/lib/captionPresets";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { DYNAMIC_STYLE_OPTIONS } from "@/components/styles";
import { Input } from "./ui/input"; // Import the Input component

interface LeftSidebarProps {
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  dynamicStyle: string;
  onDynamicStyleChange: (styleId: string) => void;
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
  videoFilter: string;
  onVideoFilterChange: (filter: string) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

export const LeftSidebar = ({
  style, onStyleChange,
  dynamicStyle, onDynamicStyleChange,
  width, isCollapsed, onResize, onMouseEnter, onMouseLeave,
  backgroundEffect, onBackgroundEffectChange, backgroundImageUrl, onBackgroundImageUrlChange,
  isAutoFramingEnabled, onAutoFramingChange,
  savedOverlays, onAddSavedOverlay, onDeleteSavedOverlay,
  zoomSensitivity, onZoomSensitivityChange,
  trackingSpeed, onTrackingSpeedChange,
  isBeautifyEnabled, onBeautifyToggle,
  isLowLightEnabled, onLowLightToggle,
  videoFilter, onVideoFilterChange,
}: LeftSidebarProps) => {
  const [showDebug, setShowDebug] = useState(false);
  const [filterSearch, setFilterSearch] = useState(""); // State for the filter search
  const isResizing = React.useRef(false);
  const filterContainerRef = useRef<HTMLDivElement>(null); // Ref for the filter container

  // Automatically scroll to the selected filter
  useEffect(() => {
    if (videoFilter && filterContainerRef.current) {
      const activeFilter = FILTER_PRESETS.find(p => p.style === videoFilter);
      if (activeFilter) {
        const element = filterContainerRef.current.querySelector(`#filter-btn-${activeFilter.id}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    }
  }, [videoFilter]);

  const handleBackgroundSelect = (effect: 'none' | 'blur' | 'image', url: string | null = null) => {
    onBackgroundEffectChange(effect);
    onBackgroundImageUrlChange(url);
  };
  
  const handlePresetSelect = (preset: CaptionTemplate) => {
    onStyleChange(preset.style);
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

  // Filter presets based on search query
  const displayedFilters = filterSearch
    ? FILTER_PRESETS.filter(p => p.name.toLowerCase().includes(filterSearch.toLowerCase()))
    : FILTER_PRESETS;

  return (
    <aside
      className="relative bg-card/80 backdrop-blur-xl border-r flex flex-col h-full z-10 transition-all duration-300 ease-in-out shadow-lg"
      style={{ width: `${width}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-6 py-6 px-2">
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Dynamic Styles"><Zap className="w-5 h-5 text-primary" /></div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Saved Overlays"><Sparkles className="w-5 h-5 text-primary" /></div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Text Styles"><Palette className="w-5 h-5 text-primary" /></div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Video Effects"><Droplets className="w-5 h-5 text-primary" /></div>
          <div className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer" title="Debug"><Bug className="w-5 h-5 text-primary" /></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden transition-opacity duration-200 px-4">
          <Accordion type="multiple" defaultValue={["dynamic-styles", "effects"]} className="w-full">

            <AccordionItem value="dynamic-styles">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                <span className="flex-1 text-left truncate">Dynamic Styles</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <RadioGroup value={dynamicStyle} onValueChange={onDynamicStyleChange} className="space-y-2">
                    {DYNAMIC_STYLE_OPTIONS.map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={item.id} id={`dynamic-${item.id}`} />
                        <Label htmlFor={`dynamic-${item.id}`} className="font-normal cursor-pointer">{item.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="presets">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Paintbrush className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Static Style Presets</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 grid grid-cols-2 gap-3">
                  {CAPTION_PRESETS.map(preset => (
                    <button key={preset.id} onClick={() => handlePresetSelect(preset)} title={preset.name} className="block w-full rounded-md overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                      <img src={preset.preview} alt={preset.name} className="w-full aspect-video object-cover"/>
                    </button>
                  ))}
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

            <AccordionItem value="saved-overlays">
              <AccordionTrigger className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Saved Overlays</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-3">
                  {savedOverlays.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center p-4">Generated overlays will be saved here for reuse.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {savedOverlays.map(overlay => (
                        <div key={overlay.id} className="group relative aspect-square rounded-md bg-secondary/50 flex items-center justify-center overflow-hidden border">
                          <button className="w-full h-full" onClick={() => onAddSavedOverlay(overlay)} title={`Add overlay to canvas`}>
                            {overlay.preview ? (<img src={overlay.preview} alt="Overlay preview" className="absolute inset-0 w-full h-full object-contain p-1" />) : (<span className="text-xs text-muted-foreground">No Preview</span>)}
                          </button>
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDeleteSavedOverlay(overlay.id)} title="Delete saved overlay">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <Label>Filter</Label>
                    <Input
                      placeholder="Search filters..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full"
                    />
                    <div
                      ref={filterContainerRef}
                      className="w-full overflow-x-auto pb-2 -mx-4 px-4"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      <div className="flex flex-nowrap items-center gap-2">
                        {displayedFilters.map((preset) => (
                          <Button
                            key={preset.id}
                            id={`filter-btn-${preset.id}`}
                            variant={videoFilter === preset.style ? 'default' : 'secondary'}
                            onClick={() => onVideoFilterChange(preset.style)}
                            className="flex-shrink-0"
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Background</Label>
                    <div className="w-full overflow-x-auto pb-2 -mx-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant={backgroundEffect === 'none' ? 'default' : 'secondary'} className="h-16 w-20 flex-col flex-shrink-0" onClick={() => handleBackgroundSelect('none')}>
                          <Ban className="w-5 h-5 mb-1" /> None
                        </Button>
                        <Button variant={backgroundEffect === 'blur' ? 'default' : 'secondary'} className="h-16 w-20 flex-col flex-shrink-0" onClick={() => handleBackgroundSelect('blur')}>
                          <Droplets className="w-5 h-5 mb-1" /> Blur
                        </Button>
                        {BACKGROUND_PRESETS.map((preset) => (
                          <div key={preset.id} onClick={() => handleBackgroundSelect('image', preset.imageUrl)} className={cn("cursor-pointer rounded-md border-2 transition-all aspect-[16/10] h-16 w-auto flex-shrink-0 bg-cover bg-center", backgroundEffect === 'image' && backgroundImageUrl === preset.imageUrl ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50")} style={{ backgroundImage: `url(${preset.thumbnailUrl})` }} />
                        ))}
                      </div>
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
                        <Slider id="zoom-sensitivity" value={[zoomSensitivity]} onValueChange={([value]) => onZoomSensitivityChange(value)} min={1.5} max={8} step={0.1} />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="tracking-speed" className="text-sm">Tracking Speed</Label>
                         <Slider id="tracking-speed" value={[trackingSpeed]} onValueChange={([value]) => onTrackingSpeedChange(value)} min={0.01} max={0.2} step={0.01} />
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
        </div>
      )}
      {!isCollapsed && (
        <div className="absolute top-0 right-0 h-full w-2 cursor-col-resize group" onMouseDown={handleMouseDown}>
          <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors mx-auto" />
        </div>
      )}
    </aside>
  );
};