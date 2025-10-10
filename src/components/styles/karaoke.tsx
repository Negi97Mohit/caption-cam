import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const KaraokeComponent: React.FC<DynamicStyleProps> = ({
  fullTranscript,
  interimTranscript,
  baseStyle,
}) => {
  const fullWords = fullTranscript.trim() ? fullTranscript.trim().split(/\s+/) : [];
  const interimWords = interimTranscript.trim() ? interimTranscript.trim().split(/\s+/) : [];
  const allWords = [...fullWords, ...interimWords].filter(Boolean);

  return (
    <div style={{ ...baseStyle, display: "inline-block", padding: "6px 10px", borderRadius: "8px", background: "transparent" }}>
      {allWords.map((word, i) => {
        const isActive = i < fullWords.length;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                position: "relative",
                display: "inline-block",
                padding: "2px 6px",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                transition: "all 0.25s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: isActive ? "linear-gradient(90deg,#ff007f,#ffcc00)" : "transparent",
                  zIndex: -1,
                  borderRadius: "4px",
                  transition: "width 0.25s ease",
                }}
              />
              {word}
            </span>
            {' '}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const KaraokeStyle: CaptionStyleDef = {
  id: "karaoke",
  name: "Karaoke Highlight",
  component: KaraokeComponent,
  tags: ["karaoke", "highlight", "progressive"],
};