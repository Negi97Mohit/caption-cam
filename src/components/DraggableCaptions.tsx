import { useEffect, useState, useRef } from "react";
import { CaptionStyle } from "@/types/caption";

interface DraggableCaptionsProps {
  style: CaptionStyle;
  onCaptionChange: (caption: string) => void;
  isRecording: boolean;
  onPositionChange: (position: { x: number; y: number }) => void;
}

export const DraggableCaptions = ({
  style,
  onCaptionChange,
  isRecording,
  onPositionChange,
}: DraggableCaptionsProps) => {
  const [caption, setCaption] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const captionRef = useRef<HTMLDivElement>(null);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!captionRef.current) return;
    
    setIsDragging(true);
    const rect = captionRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !captionRef.current) return;

    const parent = captionRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const x = ((e.clientX - parentRect.left - dragOffset.x) / parentRect.width) * 100;
    const y = ((e.clientY - parentRect.top - dragOffset.y) / parentRect.height) * 100;

    onPositionChange({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!caption) return null;

  const getShapeClasses = () => {
    switch (style.shape) {
      case "pill":
        return "rounded-full";
      case "rectangular":
        return "rounded-none";
      case "banner":
        return "rounded-none w-full left-0 right-0";
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

  const getTextStyles = () => {
    const styles: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      color: style.color,
      backgroundColor: style.backgroundColor,
      background: style.gradient || style.backgroundColor,
      textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
      WebkitTextStroke: style.outline ? "2px rgba(0,0,0,0.8)" : "none",
    };

    if (style.bold) styles.fontWeight = "bold";
    if (style.italic) styles.fontStyle = "italic";
    if (style.underline) styles.textDecoration = "underline";

    return styles;
  };

  return (
    <div
      ref={captionRef}
      className={`absolute px-6 py-3 max-w-[90%] cursor-move select-none ${getShapeClasses()} ${getAnimationClasses()} ${
        isDragging ? "opacity-70" : ""
      }`}
      style={{
        left: style.shape === "banner" ? "0" : `${style.position.x}%`,
        top: `${style.position.y}%`,
        transform: style.shape === "banner" ? "translateY(-50%)" : "translate(-50%, -50%)",
        ...getTextStyles(),
      }}
      onMouseDown={handleMouseDown}
    >
      {caption}
    </div>
  );
};
