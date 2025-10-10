import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const RainbowWaveComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div>
    {text.split("").map((char, i) => (
      <span
        key={i}
        className="animate-rainbow-wave"
        style={{
          animationDelay: `${i * 80}ms`,
          display: "inline-block",
          background: "linear-gradient(90deg, #ff2a2a, #ffa52a, #2aff47, #2a89ff, #a22aff)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ))}
    <style>{`
      @keyframes rainbow-wave {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .animate-rainbow-wave {
        animation: rainbow-wave 1.5s ease-in-out infinite;
      }
    `}</style>
  </div>
);

export const RainbowStyle: CaptionStyleDef = {
  id: "rainbow",
  name: "Rainbow Wave",
  component: RainbowWaveComponent,
};