// src/components/CaptionRenderer.tsx
import React from "react";
import { DYNAMIC_STYLES } from "@/lib/dynamicCaptionStyles";import { DynamicStyleProps } from "@/types/caption";
import { CaptionStyle } from "@/types/caption";
import { cn } from "@/lib/utils";

interface CaptionRendererProps extends DynamicStyleProps {
  activeStyleId: string;
  captionStyle: CaptionStyle;
}

export const CaptionRenderer: React.FC<CaptionRendererProps> = ({
  activeStyleId,
  captionStyle,
  ...props
}) => {
  const getShapeClasses = () => {
    switch (captionStyle.shape) {
      case "pill": return "rounded-full";
      case "rectangular": return "rounded-none";
      case "speech-bubble": return "rounded-2xl relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-full after:border-8 after:border-transparent after:border-t-current";
      case "banner": return "rounded-none w-full text-center";
      default: return "rounded-xl";
    }
  };

  const text = (props.fullTranscript + " " + props.interimTranscript).trim();
  if (!text) return null;

  const styleEntry = DYNAMIC_STYLES[activeStyleId] || DYNAMIC_STYLES["none"];
  const StyleComponent = styleEntry.component;

  // The style prop for absolute positioning has been removed.
  // The component now fills its parent and centers its content.
  return (
    <div
      className={cn(
        "w-full h-full p-2 max-w-full transition-all duration-200 flex items-center justify-center text-center", 
        getShapeClasses()
      )}
      style={props.baseStyle}
    >
      <StyleComponent {...props} />
    </div>
  );
};