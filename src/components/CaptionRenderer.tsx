import React from "react";
import { DYNAMIC_STYLES } from "./styles";
import { DynamicStyleProps } from "@/types/caption";
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
    // ... (This function can be copied from the old VideoCanvas.tsx)
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

  return (
    <div
      className={cn("absolute px-4 py-2 max-w-[90%] transition-all duration-200", getShapeClasses())}
      style={{
        ...props.baseStyle,
        left: captionStyle.shape === 'banner' ? '50%' : `${captionStyle.position.x}%`,
        top: `${captionStyle.position.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <StyleComponent {...props} />
    </div>
  );
};