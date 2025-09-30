import { useEffect, useState, useRef } from "react";
import { CaptionStyle } from "@/types/caption";

interface LiveCaptionsProps {
  style: CaptionStyle;
  onCaptionChange: (caption: string) => void;
  isRecording: boolean;
}

export const LiveCaptions = ({ style, onCaptionChange, isRecording }: LiveCaptionsProps) => {
  const [caption, setCaption] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isRecording) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const currentCaption = finalTranscript || interimTranscript;
      setCaption(currentCaption);
      onCaptionChange(currentCaption);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, onCaptionChange]);

  if (!caption) return null;

  const getShapeClasses = () => {
    switch (style.shape) {
      case "pill":
        return "rounded-full";
      case "rectangular":
        return "rounded-none";
      case "speech-bubble":
        return "rounded-2xl relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-full after:border-8 after:border-transparent after:border-t-current";
      case "rounded":
      default:
        return "rounded-xl";
    }
  };

  const getAnimationClasses = () => {
    switch (style.animation) {
      case "bounce":
        return "animate-bounce";
      case "fade":
        return "animate-fade-in";
      case "karaoke":
        return "animate-slide-up";
      default:
        return "";
    }
  };

  return (
    <div
      className={`absolute px-6 py-3 max-w-[90%] ${getShapeClasses()} ${getAnimationClasses()}`}
      style={{
        left: `${style.position.x}%`,
        top: `${style.position.y}%`,
        transform: "translate(-50%, -50%)",
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        color: style.color,
        backgroundColor: style.backgroundColor,
        background: style.gradient || style.backgroundColor,
        textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
        WebkitTextStroke: style.outline ? "2px rgba(0,0,0,0.8)" : "none",
      }}
    >
      {caption}
    </div>
  );
};
