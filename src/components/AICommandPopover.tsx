// src/components/AICommandPopover.tsx
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface AICommandPopoverProps {
  onSubmit: (text: string) => void;
  children: React.ReactNode;
}

export const AICommandPopover = ({ onSubmit, children }: AICommandPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
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
              Describe the overlay or effect you want to create.
            </p>
          </div>
          <Textarea
            placeholder="e.g., 'add a 5 minute countdown timer'"
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