import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const NeonComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div className="neon-text">{text}
    <style>{`
      .neon-text {
        font-weight: bold;
        color: #fff;
        text-shadow: 0 0 5px #0ff, 0 0 10px #0ff,
                     0 0 20px #0ff, 0 0 40px #0ff;
        animation: flicker 2s infinite alternate;
      }
      @keyframes flicker {
        0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
        20%, 24%, 55% { opacity: 0.3; }
      }
    `}</style>
  </div>
);

export const NeonStyle: CaptionStyleDef = {
  id: "neon",
  name: "Neon Glow",
  component: NeonComponent,
  tags: ["glow", "neon", "bright"],
};
