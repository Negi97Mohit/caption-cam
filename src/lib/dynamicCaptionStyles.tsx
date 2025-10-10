import React from "react";
import { CaptionStyle } from "@/types/caption";

// Define the props that each dynamic style component will receive
interface DynamicStyleProps {
  text: string;
  fullTranscript: string;
  interimTranscript: string;
  baseStyle: React.CSSProperties;
}

// --- Style Component Implementations ---

const StaticComponent: React.FC<DynamicStyleProps> = ({ text }) => {
  return <span>{text}</span>;
};

const KaraokeComponent: React.FC<DynamicStyleProps> = ({
  fullTranscript,
  interimTranscript,
  baseStyle,
}) => {
  const fullWords = fullTranscript.trim().split(/\s+/);
  const interimWords = interimTranscript.trim().split(/\s+/);
  const totalWords = [...fullWords, ...interimWords];

  return (
    <div
      style={{
        ...baseStyle,
        display: "inline-block",
        background: "transparent",
        padding: "4px 8px",
        borderRadius: "8px",
        position: "relative",
      }}
    >
      {totalWords.map((word, i) => {
        const isActive = i < fullWords.length;
        return (
          <span
            key={i}
            style={{
              position: "relative",
              display: "inline-block",
              marginRight: "4px",
              padding: "2px 6px",
              color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                background: isActive
                  ? "linear-gradient(90deg, #ff007f, #ffcc00)"
                  : "transparent",
                zIndex: -1,
                borderRadius: "4px",
                transition: "width 0.3s ease-in-out",
              }}
            />
            {word}
          </span>
        );
      })}
    </div>
  );
};

const RainbowWaveComponent: React.FC<DynamicStyleProps> = ({ text }) => (
  <div>
    {text.split("").map((char, index) => (
      <span
        key={index}
        className="animate-rainbow-wave"
        style={{
          animationDelay: `${index * 80}ms`,
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

const PopUpComponent: React.FC<DynamicStyleProps> = ({ text }) => {
  const words = text.split(/\s+/);
  return (
    <div>
      {words.map((word, index) => (
        <span
          key={index}
          className="animate-pop"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {word}{" "}
        </span>
      ))}
      <style>{`
        @keyframes pop {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-5px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-pop {
          display: inline-block;
          animation: pop 0.6s cubic-bezier(0.25, 1.25, 0.5, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};


// --- Style Definitions ---

export const DYNAMIC_STYLES: { [key: string]: { id: string; name: string; component: React.FC<DynamicStyleProps> } } = {
  'none': {
    id: 'none',
    name: 'None (Static)',
    component: StaticComponent,
  },
  'karaoke': {
    id: 'karaoke',
    name: 'Karaoke',
    component: KaraokeComponent,
  },
  'rainbow': {
    id: 'rainbow',
    name: 'Rainbow Wave',
    component: RainbowWaveComponent,
  },
  'pop-up': {
    id: 'pop-up',
    name: 'Pop Up',
    component: PopUpComponent,
  },
};

export const DYNAMIC_STYLE_OPTIONS = Object.values(DYNAMIC_STYLES).map(({ id, name }) => ({ id, name }));