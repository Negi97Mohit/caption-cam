import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const TypewriterComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div className="typewriter">
    <span>{text}</span>
    <style>{`
      .typewriter span {
        display: inline-block;
        white-space: nowrap;
        overflow: hidden;
        border-right: 3px solid #fff;
        animation: typing 2s steps(${text.length}), blink .75s step-end infinite;
      }
      @keyframes typing { from { width: 0 } to { width: 100% } }
      @keyframes blink { 50% { border-color: transparent } }
    `}</style>
  </div>
);

export const TypewriterStyle: CaptionStyleDef = {
  id: "typewriter",
  name: "Typewriter",
  component: TypewriterComponent,
  tags: ["typing", "retro", "minimal"],
};
