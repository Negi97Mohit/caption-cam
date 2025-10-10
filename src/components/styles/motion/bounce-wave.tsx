import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const BounceWaveComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div>
    {text.split("").map((c, i) => (
      <span
        key={i}
        style={{
          display: "inline-block",
          animation: `bounce 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.08}s`,
        }}
      >
        {c === " " ? "\u00A0" : c}
      </span>
    ))}
    <style>{`
      @keyframes bounce {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
    `}</style>
  </div>
);

export const BounceWaveStyle: CaptionStyleDef = {
  id: "bounce-wave",
  name: "Bounce Wave",
  component: BounceWaveComponent,
  tags: ["motion", "wave", "bounce"],
};
