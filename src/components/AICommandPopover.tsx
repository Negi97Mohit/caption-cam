// src/components/AICommandPopover.tsx

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, Crosshair, Package, Sparkles, Trash2, Edit3, Copy, Loader2 } from "lucide-react";
import { GeneratedOverlay } from "@/types/caption";

interface AICommandPopoverProps {
  onSubmit: (text: string) => void;
  activeOverlays: GeneratedOverlay[];
  children: React.ReactNode;
}

const NEW_OVERLAY_VALUE = "--new--";

export const AICommandPopover = ({ onSubmit, activeOverlays, children }: AICommandPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Intent and Modifiers
  const [intent, setIntent] = useState<string>('static_visual');
  const [modifiers, setModifiers] = useState({
    animated: false,
    hasBackground: false,
  });

  // Template suggestions
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = {
    create: [
      { label: "Timer (5 min)", prompt: "create a 5 minute countdown timer" },
      { label: "Title Card", prompt: "create a bold title that says 'Live Stream'" },
      { label: "Stats Counter", prompt: "create a stats box showing viewers count" },
      { label: "Chart", prompt: "create a bar chart with sample data" },
      { label: "Pulse Animation", prompt: "create an animated pulsing circle" },
    ],
    modify: [
      { label: "Make Bigger", prompt: "make this component larger" },
      { label: "Change Color", prompt: "change the color to red" },
      { label: "Reposition", prompt: "move this to the bottom right" },
      { label: "Add Animation", prompt: "add a smooth fade-in animation" },
    ],
    manage: [
      { label: "Delete All", prompt: "remove all overlays from the screen" },
      { label: "Clear Text", prompt: "delete all text components" },
      { label: "Show/Hide", prompt: "hide this component temporarily" },
    ],
  };

  const handleModifierChange = (modifier: keyof typeof modifiers) => {
    setModifiers(prev => ({ ...prev, [modifier]: !prev[modifier] }));
  };

  const handleTemplateSelect = (templatePrompt: string) => {
    setText(templatePrompt);
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      let finalPrompt = text.trim();
      let contextString = `User intent is '${intent}'.`;
      
      const activeModifiers = Object.entries(modifiers)
        .filter(([, value]) => value)
        .map(([key]) => key);

      if (activeModifiers.length > 0) {
        contextString += ` Modifiers: [${activeModifiers.join(', ')}].`;
      }
      
      if (selectedTargetId && selectedTargetId !== NEW_OVERLAY_VALUE) {
        contextString += ` Act ONLY on the UI component named "${selectedTargetId}".`;
      }
      
      finalPrompt = `CONTEXT: ${contextString}\n\nUSER PROMPT: ${finalPrompt}`;
      
      // FIX: The popover should not call the AI agent directly.
      // It should pass the fully formed prompt to the parent component's debounced handler.
      onSubmit(finalPrompt);

      // We don't need to wait for the result here, the parent handles it.
      // Let's close the popover and clear the state optimistically.
      setText("");
      setSelectedTargetId(null);
      setModifiers({ animated: false, hasBackground: false });
      setOpen(false);

    } catch (error) {
      console.error("Error processing command:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleTargetChange = (value: string) => {
    if (value === NEW_OVERLAY_VALUE) {
      setSelectedTargetId(null);
    } else {
      setSelectedTargetId(value);
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <div className="grid gap-4">
          {/* Header */}
          <div className="space-y-2">
            <h4 className="font-semibold leading-none flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Command Center
            </h4>
            <p className="text-xs text-muted-foreground">
              Create, modify, or delete overlays with natural language commands.
            </p>
          </div>

          {/* Intent Selector */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select onValueChange={setIntent} defaultValue={intent}>
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static_visual">📝 Static Visual / Text</SelectItem>
                <SelectItem value="data_widget">📊 Data Widget (Timer, Chart)</SelectItem>
                <SelectItem value="interactive">🔘 Interactive Element</SelectItem>
                <SelectItem value="live_data">🌐 Live Data (Online)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Modifiers */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Enhance With
            </Label>
            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-md">
              <div className="flex items-center space-x-2 flex-1">
                <Checkbox 
                  id="animated" 
                  checked={modifiers.animated} 
                  onCheckedChange={() => handleModifierChange('animated')}
                />
                <Label htmlFor="animated" className="text-xs font-normal leading-none cursor-pointer">
                  Animated
                </Label>
              </div>
              <div className="flex items-center space-x-2 flex-1">
                <Checkbox 
                  id="hasBackground" 
                  checked={modifiers.hasBackground} 
                  onCheckedChange={() => handleModifierChange('hasBackground')}
                />
                <Label htmlFor="hasBackground" className="text-xs font-normal leading-none cursor-pointer">
                  Background
                </Label>
              </div>
            </div>
          </div>

          {/* Target Overlay Selector */}
          {activeOverlays.length > 0 && (
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select onValueChange={handleTargetChange} value={selectedTargetId || NEW_OVERLAY_VALUE}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="Target an overlay (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_OVERLAY_VALUE}>None (Create New)</SelectItem>
                  {activeOverlays.map(overlay => (
                    <SelectItem key={overlay.id} value={overlay.name}>
                      {overlay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Main Input */}
          <Textarea
            placeholder="Describe what you want to create or modify..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="min-h-24 text-sm resize-none"
          />

          {/* Quick Templates */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              💡 Quick Templates
              <span className="text-muted-foreground">{showTemplates ? '▼' : '▶'}</span>
            </Button>
            
            {showTemplates && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50">
                <div className="p-2 max-h-64 overflow-y-auto">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground px-2 pt-1">Create</p>
                    {templates.create.map((t, i) => (
                      <button
                        key={`create-${i}`}
                        onClick={() => handleTemplateSelect(t.prompt)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                    <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">Modify</p>
                    {templates.modify.map((t, i) => (
                      <button
                        key={`modify-${i}`}
                        onClick={() => handleTemplateSelect(t.prompt)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                    <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">Manage</p>
                    {templates.manage.map((t, i) => (
                      <button
                        key={`manage-${i}`}
                        onClick={() => handleTemplateSelect(t.prompt)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className="flex-1"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setText("")}
              disabled={!text.trim()}
              className="h-10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Info Footer */}
          <div className="bg-muted/30 p-2 rounded-md text-xs text-muted-foreground space-y-1">
            <p><strong>Tip:</strong> Use "update [name]" to modify existing components</p>
            <p><strong>Multi-step:</strong> Chain commands like "create X, then update Y"</p>
            <p><strong>Delete:</strong> Say "remove [name]" to delete components</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};