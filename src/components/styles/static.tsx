import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const StaticComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <span>{text}</span>
);

export const StaticStyle: CaptionStyleDef = {
  id: "none",
  name: "Static",
  component: StaticComponent,
};