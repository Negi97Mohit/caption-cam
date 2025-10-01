import { useState, useRef, useEffect, useCallback } from "react";
import { Maximize, Mic, Move, ScreenShare, Square, Webcam, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaptionStyle, AIDecision } from "@/types/caption";
import { Button } from "@/components/ui/button";
import { useVosk } from "@/hooks/useVosk";
import { useDebug } from "@/context/DebugContext";
import { formatCaptionWithAI } from "@/lib/ai";
import { toast } from "sonner";

const MAX_PERMANENT_CAPTIONS = 9;

// Simplified Caption Management Hook (No auto-cleanup)
const useCaptionManagement = (
  setPermanentCaptions: React.Dispatch<React.SetStateAction<AIDecision[]>>,
  setOccupiedCells: React.Dispatch<React.SetStateAction<Set<number>>>
) => {
  const removeCaption = useCallback((id: string) => {
    setPermanentCaptions(prev => {
      const caption = prev.find(c => c.id === id);
      if (caption?.cellIndex !== undefined) {
        setOccupiedCells(cells => {
          const newSet = new Set(cells);
          newSet.delete(caption.cellIndex!);
          return newSet;
        });
      }
      return prev.filter(c => c.id !== id);
    });
  }, [setPermanentCaptions, setOccupiedCells]);

  return { removeCaption };
};

// Get dynamic styles based on caption type/intent
const getCaptionStyleOverrides = (caption: AIDecision, baseStyle: CaptionStyle) => {
  const text = caption.formattedText;
  const isList = text.includes('•') || text.includes('\n');
  const isQuestion = text.includes('?');
  const isQuote = text.startsWith('"') || text.startsWith("'");
  const isTitle = caption.captionIntent === 'title' || (text === text.toUpperCase() && text.length < 30);

  // Title style - bold, large, gradient background
  if (isTitle) {
    return {
      fontSize: baseStyle.fontSize * 1.4,
      fontWeight: '800',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      padding: '16px 32px',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
    };
  }

  // Question style - distinct color, rounded, with icon
  if (isQuestion) {
    return {
      fontSize: baseStyle.fontSize * 1.1,
      fontWeight: '600',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#ffffff',
      padding: '14px 24px',
      borderRadius: '20px',
      boxShadow: '0 6px 24px rgba(245, 87, 108, 0.35)',
      fontStyle: 'italic' as const,
      border: '2px solid rgba(255, 255, 255, 0.2)',
    };
  }

  // Quote style - elegant serif, light background
  if (isQuote) {
    return {
      fontSize: baseStyle.fontSize * 1.05,
      fontWeight: '500',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255, 255, 255, 0.95)',
      color: '#2d3748',
      padding: '16px 28px',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      borderLeft: '4px solid #f6ad55',
      fontStyle: 'italic' as const,
    };
  }

  // List style - structured, clean
  if (isList) {
    return {
      fontSize: baseStyle.fontSize * 0.95,
      fontWeight: '500',
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#ffffff',
      padding: '16px 24px',
      borderRadius: '14px',
      boxShadow: '0 6px 24px rgba(79, 172, 254, 0.35)',
      textAlign: 'left' as const,
      border: '2px solid rgba(255, 255, 255, 0.25)',
      lineHeight: '1.6',
    };
  }

  // Default live caption style - simple, unobtrusive
  return {
    fontSize: baseStyle.fontSize,
    fontWeight: baseStyle.bold ? '600' : '400',
    background: baseStyle.backgroundColor,
    color: baseStyle.color,
    padding: '12px 20px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    fontStyle: baseStyle.italic ? 'italic' as const : 'normal' as const,
  };
};

interface DraggableCaptionProps {
  caption: AIDecision;
  style: CaptionStyle;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDragChange: (isDragging: boolean) => void;
  onDragStart: (cellIndex: number | undefined) => void;
  onDelete: (id: string) => void;
}

const DraggableCaption = ({ 
  style, 
  caption, 
  onPositionChange, 
  onDragChange, 
  onDragStart,
  onDelete
}: DraggableCaptionProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.delete-btn')) return;
    
    if (!dragRef.current || !caption.id) return;
    onDragStart(caption.cellIndex);
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

  // Get dynamic styles based on caption content/type
  const dynamicStyles = getCaptionStyleOverrides(caption, style);

  const captionStyles: React.CSSProperties = {
    ...dynamicStyles,
    left: `${caption.position?.x ?? 50}%`,
    top: `${caption.position?.y ?? 85}%`,
    transform: "translate(-50%, -50%)",
    textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.7)" : "none",
    transition: "all 0.2s ease",
  };

  return (
    <div
      ref={dragRef}
      className="absolute cursor-move select-none group"
      style={{
        ...captionStyles,
        ...(isHovered && { transform: "translate(-50%, -50%) scale(1.02)" })
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Move className="absolute top-2 right-10 h-4 w-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        className="delete-btn absolute top-2 right-2 h-6 w-6 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          if (caption.id) onDelete(caption.id);
        }}
        title="Delete caption"
      >
        <X className="h-3.5 w-3.5 text-white" />
      </button>
      <div className="whitespace-pre-wrap">{caption.formattedText}</div>
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
  
  const [occupiedCells, setOccupiedCells] = useState<Set<number>>(new Set());
  const GRID_COLS = 3;
  const GRID_ROWS = 3;
  const PLACEMENT_ORDER = [1, 0, 2, 4, 3, 5, 6, 8, 7]; 

  const getPositionForCell = (cellIndex: number): { x: number; y: number } => {
    const row = Math.floor(cellIndex / GRID_COLS);
    const col = cellIndex % GRID_COLS;
    const x = (col / (GRID_COLS - 1)) * 80 + 10;
    const y = (row / (GRID_ROWS - 1)) * 80 + 10;
    return { x, y };
  };
  
  const liveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setDebugInfo } = useDebug();

  const { removeCaption } = useCaptionManagement(
    setPermanentCaptions,
    setOccupiedCells
  );

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

            // CRITICAL FIX: Keep bullet points together as ONE caption
            const text = aiDecision.formattedText;
            
            // Check if this is a multi-line list/content that should stay together
            const isList = text.includes('•') || text.includes('\n');
            
            if (isList) {
              // Keep entire list as ONE caption
              const availableCells = PLACEMENT_ORDER.filter(cell => !occupiedCells.has(cell));
              
              if (availableCells.length === 0) {
                toast.warning("Screen is full", { description: "No space for new caption." });
                return;
              }

              const cellToOccupy = availableCells[0];
              const newCaption: AIDecision = {
                ...aiDecision,
                id: `${Date.now()}`,
                formattedText: text, // Keep all content together
                position: getPositionForCell(cellToOccupy),
                cellIndex: cellToOccupy,
                captionIntent: 'list', // Mark as list for styling
              };

              setPermanentCaptions(prev => [...prev, newCaption]);
              setOccupiedCells(prev => new Set(prev).add(cellToOccupy));
              
            } else {
              // For non-list highlights (titles, questions, quotes), keep as single caption
              const availableCells = PLACEMENT_ORDER.filter(cell => !occupiedCells.has(cell));
              
              if (availableCells.length === 0) {
                toast.warning("Screen is full", { description: "No space for new caption." });
                return;
              }

              const cellToOccupy = availableCells[0];
              
              // Detect intent for styling
              let intent: string = 'default';
              if (text.includes('?')) intent = 'question';
              else if (text.startsWith('"') || text.startsWith("'")) intent = 'quote';
              else if (text === text.toUpperCase() && text.length < 30) intent = 'title';
              
              const newCaption: AIDecision = {
                ...aiDecision,
                id: `${Date.now()}`,
                formattedText: text,
                position: getPositionForCell(cellToOccupy),
                cellIndex: cellToOccupy,
                captionIntent: intent,
              };

              setPermanentCaptions(prev => [...prev, newCaption]);
              setOccupiedCells(prev => new Set(prev).add(cellToOccupy));
            }

        } else { // 'live' caption
            setLiveCaption({ 
              ...aiDecision, 
              id: Date.now().toString(), 
              position: captionStyle.position,
              captionIntent: 'live'
            });

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
    [setDebugInfo, captionStyle, occupiedCells],
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
      captions.map(c => c.id === id ? { ...c, position, cellIndex: undefined } : c)
    );
  };
  
  const handleDragStart = (cellIndex: number | undefined) => {
    if (cellIndex !== undefined) {
      setOccupiedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellIndex);
        return newSet;
      });
    }
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
    setOccupiedCells(new Set());
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Get dynamic styles for live/partial captions
  const getLiveCaptionStyles = () => {
    const baseStyles = getCaptionStyleOverrides(
      liveCaption || { formattedText: partialTranscript, decision: 'SHOW', type: 'live', duration: 4, captionIntent: 'live' } as AIDecision, 
      captionStyle
    );
    
    return {
      ...baseStyles,
      left: `${captionStyle.position.x}%`,
      top: `${captionStyle.position.y}%`,
      transform: "translate(-50%, -50%)",
      opacity: liveCaption ? 1 : 0.7,
    };
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
                onDragStart={handleDragStart}
                onDelete={removeCaption}
              />
            ))}
            {(liveCaption || partialTranscript) && (
              <div 
                className="absolute select-none text-center"
                style={getLiveCaptionStyles()}
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