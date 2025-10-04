// src/components/CustomStylesSelector.tsx

import { AIDecision, GraphObject } from "@/types/caption";
import { CUSTOM_STYLES, CustomStyle } from "@/lib/customStyles";
import { useMemo } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface CustomStylesSelectorProps {
  overlays: (AIDecision | GraphObject)[];
  selectedOverlayId: string | null;
  onSelectStyle: (style: Partial<CustomStyle['style']>) => void;
}

export const CustomStylesSelector = ({ overlays, selectedOverlayId, onSelectStyle }: CustomStylesSelectorProps) => {
  const availableIntents = useMemo(() => {
    const intents = new Set<string>();
    overlays.forEach(overlay => {
      if ('captionIntent' in overlay && overlay.captionIntent) {
        intents.add(overlay.captionIntent);
      }
      if (overlay.type === 'graph') {
        intents.add('graph');
      }
    });
    return intents;
  }, [overlays]);

  const relevantStyles = CUSTOM_STYLES.filter(style => availableIntents.has(style.target));
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);
  const selectedIntent = selectedOverlay 
    ? ('captionIntent' in selectedOverlay && selectedOverlay.captionIntent) || selectedOverlay.type 
    : null;


  if (relevantStyles.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">Create a title, question, or stat to see style suggestions.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {relevantStyles.map(style => (
        <Button
          key={style.id}
          variant="secondary"
          className={cn(
            "h-auto flex-col items-start text-left p-2 transition-all",
            selectedIntent && style.target !== selectedIntent && "opacity-40"
          )}
          onClick={() => onSelectStyle(style.style)}
          disabled={!selectedOverlayId}
          title={selectedOverlayId ? `Apply '${style.name}'` : 'Select an overlay first'}
        >
          <img src={style.preview} alt={style.name} className="w-full rounded-md aspect-[16/9] object-cover mb-2" />
          <div className="font-semibold text-xs">{style.name}</div>
        </Button>
      ))}
    </div>
  );
};