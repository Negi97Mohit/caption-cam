import React from "react";
import { CaptionStyleDef, DynamicStyleProps } from "@/types/caption";

const PopUpComponent: React.FC<DynamicStyleProps> = ({ text }) => {
  const words = text.split(/\s+/);
  return (
    <div>
      {words.map((word, index) => (
        <React.Fragment key={index}>
          <span
            className="animate-pop-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {word}
          </span>
          {' '}
        </React.Fragment>
      ))}
      <style>{`
        @keyframes pop-up {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-5px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-pop-up {
          display: inline-block;
          animation: pop-up 0.6s cubic-bezier(0.25, 1.25, 0.5, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export const PopUpStyle: CaptionStyleDef = {
  id: "pop-up",
  name: "Pop Up",
  component: PopUpComponent,
};