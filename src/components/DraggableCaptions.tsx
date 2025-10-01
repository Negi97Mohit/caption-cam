// src/components/DraggableCaptions.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { AIDecision, CaptionStyle } from "@/types/caption";
import { formatCaptionWithAI } from "@/lib/ai";
import { useDebug } from "@/context/DebugContext";
import { cn } from "@/lib/utils";
import { useContinuousAudio } from "@/hooks/useContinuousAudio";

const VOSK_WEBSOCKET_URL = "ws://localhost:2700";

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
  const [currentCaption, setCurrentCaption] = useState<AIDecision | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const captionRef = useRef<HTMLDivElement>(null);
  const captionTimeoutRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const finalTranscriptRef = useRef<string>("");

  const { setDebugInfo } = useDebug();

  const handleTranscript = useCallback(async (transcript: { final: string; interim: string }) => {
    const rawText = transcript.final || transcript.interim;
    setDebugInfo((prev) => ({ ...prev, rawTranscript: rawText, error: null }));

    // Show interim results for a live feeling
    setCurrentCaption({
      decision: "SHOW",
      type: "live",
      duration: 5,
      formattedText: rawText,
    });

    if (transcript.final) {
      finalTranscriptRef.current += transcript.final + " ";
      const aiResponse = await formatCaptionWithAI(finalTranscriptRef.current.trim());
      setDebugInfo((prev) => ({ ...prev, aiResponse }));

      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);

      if (aiResponse.decision === "SHOW") {
        setCurrentCaption(aiResponse);
        onCaptionChange(aiResponse.formattedText);

        if (aiResponse.type === "live" && typeof aiResponse.duration === "number") {
          captionTimeoutRef.current = window.setTimeout(() => setCurrentCaption(null), aiResponse.duration * 1000);
        }
      } else {
        if (currentCaption?.duration !== "permanent") setCurrentCaption(null);
      }
      finalTranscriptRef.current = "";
    }
  }, [setDebugInfo, onCaptionChange, currentCaption?.duration]);

  const { isCapturing, startCapture, stopCapture } = useContinuousAudio({
    onAudioChunk: (chunk) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(chunk);
      }
    },
    onError: (error) => {
      setDebugInfo((prev) => ({ ...prev, error: `Audio Capture Error: ${error.message}` }));
    },
  });

  // ✅ Effect 1: Controls audio capture based on isRecording
  useEffect(() => {
    if (isRecording) {
      startCapture();
    } else {
      stopCapture();
    }
  }, [isRecording, startCapture, stopCapture]);

  // ✅ Effect 2: Manages WebSocket based on capture state
  useEffect(() => {
    if (isCapturing) {
      const ws = new WebSocket(VOSK_WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => console.log("Vosk WebSocket connected.");
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text) {
          handleTranscript({ final: data.text, interim: "" });
        } else if (data.partial) {
          handleTranscript({ final: "", interim: data.partial });
        }
      };
      ws.onclose = () => console.log("Vosk WebSocket disconnected.");
      ws.onerror = () => setDebugInfo((prev) => ({ ...prev, error: "WebSocket Error. Is your Vosk server running?" }));

      // Cleanup when capture stops
      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        wsRef.current = null;
      };
    }
  }, [isCapturing, handleTranscript, setDebugInfo]);

  // --- Dragging Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!captionRef.current) return;
    setIsDragging(true);
    const rect = captionRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
  }, [isDragging, dragOffset, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!currentCaption || currentCaption.decision === "HIDE" || !currentCaption.formattedText) {
    return null;
  }

  const getShapeClasses = () => {
    switch (style.shape) {
      case "pill": return "rounded-full";
      case "rectangular": return "rounded-none";
      case "banner": return "rounded-none w-full left-0 right-0";
      case "speech-bubble":
        return "rounded-2xl relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-full after:border-8 after:border-transparent after:border-t-current";
      case "rounded":
      default:
        return "rounded-xl";
    }
  };

  const getAnimationClasses = () => {
    switch (style.animation) {
      case "bounce": return "animate-bounce";
      case "fade": return "animate-fade-in";
      case "karaoke": return "animate-slide-up";
      default: return "";
    }
  };

  const getTextStyles = (): React.CSSProperties => {
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
      className={cn(
        "absolute px-6 py-3 max-w-[90%] cursor-move select-none",
        getShapeClasses(),
        getAnimationClasses(),
        isDragging && "opacity-70",
      )}
      style={{
        left: style.shape === "banner" ? "0" : `${style.position.x}%`,
        top: `${style.position.y}%`,
        transform: style.shape === "banner" ? "translateY(-50%)" : "translate(-50%, -50%)",
        color: getTextStyles().color,
        ...getTextStyles(),
      }}
      onMouseDown={handleMouseDown}
    >
      {currentCaption.formattedText}
    </div>
  );
};
