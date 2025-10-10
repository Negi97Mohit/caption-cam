import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Crosshair } from "lucide-react";
import { GeneratedOverlay } from "@/types/caption";

interface AICommandPopoverProps {
  onSubmit: (text: string) => void;
  activeOverlays: GeneratedOverlay[]; // ADDED: To populate the dropdown
  children: React.ReactNode;
}

export const AICommandPopover = ({ onSubmit, activeOverlays, children }: AICommandPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (text.trim()) {
      let finalPrompt = text.trim();
      
      // MODIFIED: Prepend context to the prompt if an overlay is selected
      if (selectedTargetId) {
        finalPrompt = `CONTEXT: Act ONLY on the UI component named "${selectedTargetId}".\n\nUSER PROMPT: ${finalPrompt}`;
        // Reset selection after submitting
        setSelectedTargetId(null);
      }
      
      onSubmit(finalPrompt);
      setText("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">AI Command</h4>
            <p className="text-sm text-muted-foreground">
              Describe the overlay or effect you want to create or modify.
            </p>
          </div>

          {/* ADDED: Optional overlay selector */}
          {activeOverlays.length > 0 && (
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={setSelectedTargetId} value={selectedTargetId || ""}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Target an overlay (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {activeOverlays.map(overlay => (
                    <SelectItem key={overlay.id} value={overlay.name}>
                      {overlay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Textarea
            placeholder="e.g., 'add a 5 minute countdown timer' or 'make it bigger'"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button onClick={handleSubmit}>
            <Send className="w-4 h-4 mr-2" />
            Generate with AI
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};