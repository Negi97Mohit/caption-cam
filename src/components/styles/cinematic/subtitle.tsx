import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const SubtitleComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div style={{
    fontSize: "1.2rem",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "4px",
    textAlign: "center",
  }}>
    {text}
  </div>
);

export const SubtitleStyle: CaptionStyleDef = {
  id: "subtitle",
  name: "Cinematic Subtitle",
  component: SubtitleComponent,
  tags: ["cinematic", "subtitle", "film"],
};
