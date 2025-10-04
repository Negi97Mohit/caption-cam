import { CaptionTemplate } from "@/types/caption";

// This array holds the definitions for the predefined caption style templates.
// The LeftSidebar component maps over this array to display the preview images.
export const PRESET_TEMPLATES: CaptionTemplate[] = [
  {
    id: "neon-glow",
    name: "Neon Glow",
    description: "A bright, glowing text effect with a dark background.",
    preview: "https://placehold.co/600x120/1a1a1a/e94560/png?text=Neon+Glow",
    style: {
      fontFamily: "Montserrat",
      fontSize: 28,
      color: "#e94560",
      backgroundColor: "rgba(26, 26, 26, 0.8)",
      position: { x: 50, y: 85 },
      shape: "rounded",
      animation: "fade",
      outline: false,
      shadow: true,
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "karaoke-highlight",
    name: "Karaoke Highlight",
    description: "Bright, clear text on a bottom banner, styled for karaoke.",
    preview: "https://placehold.co/600x120/1e1e1e/00F5FF/png?text=Karaoke+Style",
    style: {
      fontFamily: "Bebas Neue",
      fontSize: 42,
      color: "#00F5FF", // A bright cyan color
      backgroundColor: "rgba(30, 30, 30, 0.9)", // A dark, semi-transparent bar
      position: { x: 50, y: 90 }, // Positioned at the bottom
      shape: "rectangular",
      animation: "slide-up",
      outline: false,
      shadow: true,
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "news-ticker",
    name: "News Ticker",
    description: "A classic news-style lower-third banner.",
    preview: "https://placehold.co/600x120/00539C/FFFFFF/png?text=News+Ticker",
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      color: "#FFFFFF",
      backgroundColor: "rgba(0, 83, 156, 0.9)",
      position: { x: 50, y: 90 },
      shape: "rectangular",
      animation: "fade",
      outline: false,
      shadow: false,
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "minimal-stroke",
    name: "Minimal Stroke",
    description: "Clean text with an outline for high contrast on any video.",
    preview: "https://placehold.co/600x120/999999/FFFFFF/png?text=Minimal+Stroke",
    style: {
      fontFamily: "Inter",
      fontSize: 26,
      color: "#FFFFFF",
      backgroundColor: "rgba(0, 0, 0, 0)", // Transparent background
      position: { x: 50, y: 85 },
      shape: "rounded",
      animation: "fade",
      outline: true, // This would be handled by text-stroke css
      shadow: true,
      bold: true,
      italic: false,
      underline: false,
    },
  },
  {
    id: "vintage-film",
    name: "Vintage Film",
    description: "A classic, elegant serif font for a cinematic feel.",
    preview: "https://placehold.co/600x120/4a4a4a/f5e5c5/png?text=Vintage+Film",
    style: {
      fontFamily: "Playfair Display",
      fontSize: 30,
      color: "#f5e5c5",
      backgroundColor: "rgba(0, 0, 0, 0)",
      position: { x: 50, y: 85 },
      shape: "rounded",
      animation: "fade",
      outline: false,
      shadow: true,
      bold: false,
      italic: true,
      underline: false,
    },
  },
];