import { CaptionStyleDef } from "@/types/caption";

// Import each style module
import { StaticStyle } from "./static";
import { KaraokeStyle } from "./karaoke";
import { PopUpStyle } from "./pop-up";
import { RainbowStyle } from "./rainbow";

// Register all available styles here.
// To add a new style, just import it and add it to this object.
export const DYNAMIC_STYLES: Record<string, CaptionStyleDef> = {
  [StaticStyle.id]: StaticStyle,
  [KaraokeStyle.id]: KaraokeStyle,
  [PopUpStyle.id]: PopUpStyle,
  [RainbowStyle.id]: RainbowStyle,
};

// Create an array of options for the UI to automatically use
export const DYNAMIC_STYLE_OPTIONS = Object.values(DYNAMIC_STYLES).map(
  ({ id, name }) => ({ id, name })
);