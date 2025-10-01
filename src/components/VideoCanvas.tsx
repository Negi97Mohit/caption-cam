import { useState, useRef, useEffect, useCallback } from "react";
import { Maximize, Mic, Move, ScreenShare, Square, Webcam, X } from "lucide-react";
import { CaptionStyle, AIDecision } from "@/types/caption";
import { Button } from "@/components/ui/button";
import { useVosk } from "@/hooks/useVosk";
import { useDebug } from "@/context/DebugContext";
import { formatCaptionWithAI } from "@/lib/ai";
import { toast } from "sonner";

// Modern TikTok/Reels inspired caption designs
const getCaptionStyleOverrides = (caption: AIDecision, baseStyle: CaptionStyle) => {
  const intent = caption.captionIntent || 'default';

  switch (intent) {
    case 'title':
      return {
        fontSize: baseStyle.fontSize * 2.4,
        fontWeight: 800 as const,
        background: 'linear-gradient(90deg, #6366F1, #EC4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        padding: '12px 32px',
        textTransform: 'uppercase' as const,
        letterSpacing: '4px',
        fontFamily: 'Inter, sans-serif',
        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: '90%',
      };

    case 'question':
      return {
        fontSize: baseStyle.fontSize * 1.4,
        fontWeight: 700 as const,
        color: '#111',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '18px 28px',
        borderRadius: '18px',
        border: 'none',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.5px',
        maxWidth: '500px',
      };

    case 'list':
      return {
        fontSize: baseStyle.fontSize * 1.15,
        fontWeight: 600 as const,
        color: '#F9FAFB',
        background: 'rgba(17, 24, 39, 0.8)',
        padding: '20px 28px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        textAlign: 'left' as const,
        lineHeight: '1.7',
        fontFamily: 'Inter, sans-serif',
        backdropFilter: 'blur(16px)',
        maxWidth: '420px',
      };

    case 'quote':
      return {
        fontSize: baseStyle.fontSize * 1.5,
        fontWeight: 700 as const,
        color: '#111827',
        background: 'linear-gradient(135deg, #FDE68A, #FCA5A5)',
        padding: '24px 32px',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        maxWidth: '70%',
      };

    case 'stat':
      return {
        fontSize: baseStyle.fontSize * 2,
        fontWeight: 800 as const,
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
        padding: '28px 36px',
        borderRadius: '24px',
        boxShadow: '0 8px 40px rgba(59,130,246,0.5)',
        textAlign: 'center' as const,
        fontFamily: 'Inter, sans-serif',
        minWidth: '200px',
        lineHeight: '1.2',
      };

    case 'live':
    default:
      return {
        fontSize: baseStyle.fontSize * 1.1,
        fontWeight: 600 as const,
        color: '#F9FAFB',
        background: 'rgba(31, 41, 55, 0.85)',
        padding: '14px 24px',
        borderRadius: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '85%',
      };
  }
};


interface DraggableCaptionProps {
  caption: AIDecision;
  style: CaptionStyle;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDragChange: (isDragging: boolean) => void;
  onDelete: (id: string) => void;
}

const DraggableCaption = ({ 
  style, 
  caption, 
  onPositionChange, 
  onDragChange,
  onDelete
}: DraggableCaptionProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.delete-btn')) return;
    
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

  const dynamicStyles = getCaptionStyleOverrides(caption, style);
  const isStat = caption.captionIntent === 'stat';

  const captionStyles: React.CSSProperties = {
    ...dynamicStyles,
    left: `${caption.position?.x ?? 50}%`,
    top: `${caption.position?.y ?? 85}%`,
    transform: isStat 
      ? "translate(-50%, -50%)" 
      : dynamicStyles.transform 
        ? `translate(-50%, -50%) ${dynamicStyles.transform}` 
        : "translate(-50%, -50%)",
    textShadow: style.shadow && !dynamicStyles.textShadow ? "3px 3px 6px rgba(0,0,0,0.8)" : dynamicStyles.textShadow,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  return (
    <div
      ref={dragRef}
      className="absolute cursor-move select-none group"
      style={{
        ...captionStyles,
        ...(isHovered && { 
          transform: `${captionStyles.transform} scale(1.05)`,
          filter: 'brightness(1.1)',
        })
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Move className="absolute -top-6 right-1/2 translate-x-1/2 h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
      <button
        className="delete-btn absolute -top-3 -right-3 h-8 w-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
        onClick={(e) => {
          e.stopPropagation();
          if (caption.id) onDelete(caption.id);
        }}
        title="Delete caption"
      >
        <X className="h-4 w-4 text-white" />
      </button>
      <div className="whitespace-pre-wrap" style={isStat ? {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'} : {}}>
        {caption.formattedText}
      </div>
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
  
  // List buffering
  const listBufferRef = useRef<string[]>([]);
  const listTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWaitingForListRef = useRef(false);
  
  // Caption queue
  const captionQueueRef = useRef<AIDecision[]>([]);
  const isProcessingQueueRef = useRef(false);
  
  // Position alternation for questions
  const questionPositionToggleRef = useRef(false);
  
  const liveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setDebugInfo } = useDebug();

  const processCaptionQueue = useCallback(() => {
    if (isProcessingQueueRef.current || captionQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const caption = captionQueueRef.current.shift()!;

    // AI has already decided position, use it directly
    const newCaption: AIDecision = {
      ...caption,
      id: `${Date.now()}-${Math.random()}`,
      position: caption.position || { x: 50, y: 50 },
    };

    setPermanentCaptions(prev => [...prev, newCaption]);

    setTimeout(() => {
      isProcessingQueueRef.current = false;
      processCaptionQueue();
    }, 100);
  }, []);

  const removeCaption = useCallback((id: string) => {
    setPermanentCaptions(prev => prev.filter(c => c.id !== id));
  }, []);

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

        // Handle LIST with buffering
        if (aiDecision.captionIntent === 'list') {
          setLiveCaption(null);
          
          listBufferRef.current.push(aiDecision.formattedText);
          isWaitingForListRef.current = true;

          if (listTimeoutRef.current) {
            clearTimeout(listTimeoutRef.current);
          }

          listTimeoutRef.current = setTimeout(() => {
            // Format list with numbers or bullets
            const formattedList = listBufferRef.current
              .map((item, idx) => {
                // If item already has bullet/number, keep it
                if (item.trim().match(/^[•\-\d+\.]/)) {
                  return item;
                }
                // Otherwise add number
                return `${idx + 1}. ${item}`;
              })
              .join('\n');
            
            const listCaption: AIDecision = {
              ...aiDecision,
              formattedText: formattedList,
              captionIntent: 'list',
              position: aiDecision.position || { x: 15, y: 50 }, // AI decides, default left
            };

            captionQueueRef.current.push(listCaption);
            processCaptionQueue();

            listBufferRef.current = [];
            isWaitingForListRef.current = false;
          }, 1500);

          return;
        }

        // Flush pending list if non-list content arrives
        if (isWaitingForListRef.current && listBufferRef.current.length > 0) {
          if (listTimeoutRef.current) {
            clearTimeout(listTimeoutRef.current);
          }

          const formattedList = listBufferRef.current
            .map((item, idx) => item.trim().match(/^[•\-\d+\.]/) ? item : `${idx + 1}. ${item}`)
            .join('\n');
          
          const listCaption: AIDecision = {
            decision: 'SHOW',
            type: 'highlight',
            duration: 'permanent',
            formattedText: formattedList,
            captionIntent: 'list',
            position: { x: 15, y: 50 },
          };

          captionQueueRef.current.push(listCaption);
          listBufferRef.current = [];
          isWaitingForListRef.current = false;
        }

        // Handle QUESTION alternation if AI didn't specify position
        if (aiDecision.captionIntent === 'question' && !aiDecision.position) {
          questionPositionToggleRef.current = !questionPositionToggleRef.current;
          aiDecision.position = questionPositionToggleRef.current 
            ? { x: 75, y: 20 } 
            : { x: 25, y: 20 };
        }

        // Handle HIGHLIGHT (permanent) captions
        if (aiDecision.type === 'highlight') {
          setLiveCaption(null);
          captionQueueRef.current.push(aiDecision);
          processCaptionQueue();
        } 
        // Handle LIVE (temporary) captions
        else {
          setLiveCaption({ 
            ...aiDecision, 
            id: Date.now().toString(), 
            position: aiDecision.position || captionStyle.position,
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
    [setDebugInfo, captionStyle, processCaptionQueue],
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
    listBufferRef.current = [];
    captionQueueRef.current = [];
    isWaitingForListRef.current = false;
    isProcessingQueueRef.current = false;
    
    if (listTimeoutRef.current) clearTimeout(listTimeoutRef.current);
    if (liveCaptionTimeoutRef.current) clearTimeout(liveCaptionTimeoutRef.current);
    
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const getLiveCaptionStyles = () => {
    const baseStyles = getCaptionStyleOverrides(
      liveCaption || { 
        formattedText: partialTranscript, 
        decision: 'SHOW', 
        type: 'live', 
        duration: 4, 
        captionIntent: 'live' 
      } as AIDecision, 
      captionStyle
    );
    
    return {
      ...baseStyles,
      left: `${(liveCaption?.position?.x || captionStyle.position.x)}%`,
      top: `${(liveCaption?.position?.y || captionStyle.position.y)}%`,
      transform: "translate(-50%, -50%)",
      opacity: liveCaption ? 1 : 0.7,
      animation: liveCaption ? "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "pulse 1.5s ease-in-out infinite",
    };
  };
  
  return (
    <div className="flex-1 bg-gray-900 flex justify-center items-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes zoomIn {
          from { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.5); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
          }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translate(-50%, -30%); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, -50%); 
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.95; }
        }
      `}</style>
      
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