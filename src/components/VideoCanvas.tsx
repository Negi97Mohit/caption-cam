import { useState, useRef, useEffect, useCallback } from "react";
import { Maximize, Mic, Move, ScreenShare, Square, Webcam } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaptionStyle, AIDecision } from "@/types/caption";
import { Button } from "@/components/ui/button";
import { useVosk } from "@/hooks/useVosk";
import { useDebug } from "@/context/DebugContext";
import { formatCaptionWithAI } from "@/lib/ai";
import { toast } from "sonner";

interface DraggableCaptionProps {
  caption: AIDecision;
  style: CaptionStyle;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDragChange: (isDragging: boolean) => void;
}

const DraggableCaption = ({ style, caption, onPositionChange, onDragChange }: DraggableCaptionProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current || !caption.id) return;
    onDragChange(true);
    const rect = dragRef.current.getBoundingClientRect();
    offset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragRef.current || !caption.id) return;
    const parentRect = dragRef.current.parentElement!.getBoundingClientRect();
    const x = ((e.clientX - parentRect.left - offset.current.x) / parentRect.width) * 100;
    const y = ((e.clientY - parentRect.top - offset.current.y) / parentRect.height) * 100;
    onPositionChange(caption.id, {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const onMouseUp = () => {
    onDragChange(false);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const captionStyles: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    color: style.color,
    backgroundColor: style.backgroundColor,
    left: `${caption.position?.x ?? 50}%`,
    top: `${caption.position?.y ?? 85}%`,
    transform: "translate(-50%, -50%)",
    fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.7)" : "none",
  };

  return (
    <div
      ref={dragRef}
      className={cn(
        "absolute p-4 cursor-move select-none",
        { "rounded-lg": style.shape === "rounded" },
        { "rounded-full px-6": style.shape === "pill" }
      )}
      style={captionStyles}
      onMouseDown={onMouseDown}
    >
      <Move className="absolute top-1 right-1 h-3 w-3 text-white/50" />
      {caption.formattedText}
    </div>
  );
};

interface VideoCanvasProps {
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  recordingMode: "webcam" | "screen" | "both";
  onRecordingModeChange: (mode: "webcam" | "screen" | "both") => void;
  onCaptionPositionChange: (position: { x: number; y: number }) => void;
}

export const VideoCanvas = ({
  captionStyle,
  captionsEnabled,
  recordingMode,
  onRecordingModeChange,
}: VideoCanvasProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [liveCaption, setLiveCaption] = useState<AIDecision | null>(null);
  const [permanentCaptions, setPermanentCaptions] = useState<AIDecision[]>([]);
  const [partialTranscript, setPartialTranscript] = useState("");
  
  const liveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setDebugInfo } = useDebug();

  const handleNewTranscript = useCallback(
    async (transcript: string) => {
      setPartialTranscript("");
      setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript }));

      try {
        const aiDecision = await formatCaptionWithAI(transcript);
        setDebugInfo((prev) => ({ ...prev, aiResponse: aiDecision, error: null }));

        if (aiDecision.decision === "HIDE") {
            setLiveCaption(null);
            return;
        }

        if (aiDecision.type === 'highlight') {
            setLiveCaption(null);

            const lines = aiDecision.formattedText.split('\n').filter(line => line.trim() !== '');

            if (lines.length > 1) {
              const newCaptions = lines.map((line, index) => ({
                ...aiDecision,
                id: `${Date.now()}-${index}`,
                formattedText: line,
                position: { 
                  x: captionStyle.position.x, 
                  y: captionStyle.position.y + (index * (captionStyle.fontSize / 16) * 4)
                },
              }));
              setPermanentCaptions(prev => [...prev, ...newCaptions]);
            } else {
              setPermanentCaptions(prev => [...prev, { ...aiDecision, id: Date.now().toString(), position: captionStyle.position }]);
            }

        } else {
            setLiveCaption({ ...aiDecision, id: Date.now().toString(), position: captionStyle.position });

            if (liveCaptionTimeoutRef.current) {
                clearTimeout(liveCaptionTimeoutRef.current);
            }

            liveCaptionTimeoutRef.current = setTimeout(() => {
                setLiveCaption(null);
            }, (aiDecision.duration as number) * 1000);
        }

      } catch (error) {
        console.error("AI formatting failed:", error);
        setDebugInfo((prev) => ({ ...prev, error: "AI formatting failed." }));
      }
    },
    [setDebugInfo, captionStyle.position, captionStyle.fontSize],
  );

  const { isRecording, startRecording, stopRecording } = useVosk({
    onTranscript: handleNewTranscript,
    onPartialTranscript: (partial) => {
      setPartialTranscript(partial);
    },
    onError: (error) => {
      toast.error(error.message, {
        description: "Please ensure the Python server is running and you've granted microphone permissions.",
      });
    },
  });

  const handlePermanentCaptionPositionChange = (id: string, position: { x: number; y: number }) => {
    setPermanentCaptions(captions => 
      captions.map(c => c.id === id ? { ...c, position } : c)
    );
  };

  useEffect(() => {
    const startStream = async () => {
      if (videoRef.current) {
        try {
          let stream;
          if (recordingMode === "screen" || recordingMode === "both") {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          } else {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.error("Error accessing media devices.", error);
          toast.error("Could not access camera/screen.", {
            description: "Please check permissions and try again.",
          });
        }
      }
    };

    startStream();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, [recordingMode]);

  const handleStopRecording = () => {
    stopRecording();
    setPermanentCaptions([]);
    setLiveCaption(null);
    setPartialTranscript("");
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  return (
    <div className="flex-1 bg-gray-900 flex justify-center items-center p-4 relative overflow-hidden">
      <div className="relative w-full h-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
        {captionsEnabled && (
          <>
            {permanentCaptions.map((caption) => (
              <DraggableCaption
                key={caption.id}
                style={captionStyle}
                caption={caption}
                onPositionChange={handlePermanentCaptionPositionChange}
                onDragChange={setIsDragging}
              />
            ))}
            {(liveCaption || partialTranscript) && (
              <div 
                className={cn(
                  "absolute p-2 select-none text-center",
                  // FIX: Changed `style` to `captionStyle`
                  { "rounded-lg": captionStyle.shape === "rounded" },
                  { "rounded-full px-6": captionStyle.shape === "pill" }
                )}
                style={{
                  left: `${captionStyle.position.x}%`,
                  top: `${captionStyle.position.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: captionStyle.fontFamily,
                  fontSize: `${captionStyle.fontSize}px`,
                  color: liveCaption ? captionStyle.color : `${captionStyle.color}80`,
                  backgroundColor: captionStyle.backgroundColor,
                }}
              >
                {liveCaption?.formattedText || partialTranscript}
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute bottom-6 flex items-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={() => onRecordingModeChange("webcam")}
          disabled={recordingMode === "webcam"}
        >
          <Webcam />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={() => onRecordingModeChange("screen")}
          disabled={recordingMode === "screen"}
        >
          <ScreenShare />
        </Button>
        {!isRecording ? (
          <Button
            size="icon"
            className="bg-red-600 hover:bg-red-700 rounded-full h-16 w-16"
            onClick={startRecording}
          >
            <Mic />
          </Button>
        ) : (
          <Button
            size="icon"
            className="bg-gray-600 hover:bg-gray-700 rounded-full h-16 w-16"
            onClick={handleStopRecording}
          >
            <Square />
          </Button>
        )}
        <Button variant="secondary" size="icon" className="rounded-full h-12 w-12">
          <Maximize />
        </Button>
      </div>
    </div>
  );
};