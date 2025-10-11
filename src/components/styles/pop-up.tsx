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
            style={{
              animationDelay: `${index * 250}ms`, // slower delay between words
              animationFillMode: "forwards",
            }}
          >
            {word}
          </span>{" "}
        </React.Fragment>
      ))}

      <style>{`
        @keyframes pop-up {
          0% {
            opacity: 0;
            transform: translateY(25px) scale(0.85);
          }
          40% {
            opacity: 1;
            transform: translateY(-5px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-pop-up {
          display: inline-block;
          opacity: 0;
          animation: pop-up 3s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
};

export const PopUpStyle: CaptionStyleDef = {
  id: "pop-up",
  name: "Pop Up (Smooth)",
  component: PopUpComponent,
};
