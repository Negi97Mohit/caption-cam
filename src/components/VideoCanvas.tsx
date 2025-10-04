import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Maximize, Mic, Move, ScreenShare, Square, Webcam, X, Maximize2 } from "lucide-react";
import { CaptionStyle, AIDecision, GraphObject } from "@/types/caption";
import { Button } from "@/components/ui/button";
import { useDebug } from "@/context/DebugContext";
import { useLog } from "@/context/LogContext";
import { formatCaptionWithAI, autocorrectTranscript, processEditCommand, processGraphCommand } from "@/lib/ai";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DraggableGraph } from './DraggableGraph';
import { CommandHintOverlay } from './CommandHintOverlay';
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { FaceDetection } from "@mediapipe/face_detection";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";

// (This helper function remains unchanged)
const getCaptionStyleOverrides = (caption: AIDecision, baseStyle: CaptionStyle): React.CSSProperties => {
  const intent = caption.captionIntent || 'default';
  let intentOverrides: Partial<React.CSSProperties> = {};

  switch (intent) {
    case 'title':
      intentOverrides = { fontSize: baseStyle.fontSize * 2.0, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '3px', textShadow: '0 4px 20px rgba(0, 0, 0, 0.4)', backgroundColor: 'transparent' };
      break;
    case 'question':
      intentOverrides = { fontSize: baseStyle.fontSize * 1.2, fontWeight: '600', padding: '12px 20px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background) / 0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', transform: 'rotate(-2deg) scale(1.02)', maxWidth: '500px' };
      break;
    case 'list':
      intentOverrides = { fontSize: baseStyle.fontSize, fontWeight: '500', padding: '16px 24px', borderLeft: '3px solid hsl(var(--primary))', backgroundColor: 'hsl(var(--background) / 0.5)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', textAlign: 'left', lineHeight: '1.7', maxWidth: '400px' };
      break;
    case 'quote':
      intentOverrides = { fontSize: baseStyle.fontSize * 1.4, fontWeight: '500', backgroundColor: 'transparent', fontStyle: 'italic', textAlign: 'center', textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)', maxWidth: '60%', '--quote-color': 'hsl(var(--primary) / 0.5)' };
      break;
    case 'stat':
      intentOverrides = { fontSize: baseStyle.fontSize * 1.8, fontWeight: '800', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '24px', borderRadius: '50%', boxShadow: `0 0 0 2px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.5)`, textAlign: 'center', border: '2px solid transparent', minWidth: '150px', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1' };
      break;
    default:
      intentOverrides = { fontWeight: '600', padding: '8px 16px', backgroundColor: 'hsl(var(--background) / 0.5)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', maxWidth: '90%', wordWrap: 'break-word' };
      break;
  }
  return { ...baseStyle, ...intentOverrides };
};

const getAnimationClasses = (animation: CaptionAnimation | undefined) => {
  switch (animation) {
    case "bounce":
      return "animate-bounce";
    case "fade":
      return "animate-fade-in";
    case "slide-up":
      return "animate-slide-up";
    case "karaoke": // The karaoke style also uses a slide-up entrance
      return "animate-slide-up";
    default:
      return "";
  }
};

interface DraggableCaptionProps {
  caption: AIDecision;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onResize: (id: string, size: { width: number; height: number }) => void;
  onDragChange: (isDragging: boolean) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, newText: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const DraggableCaption = ({ caption, onPositionChange, onResize, onDragChange, onDelete, onTextChange, isSelected, onSelect }: DraggableCaptionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const style = caption.style || {} as CaptionStyle;

  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
      el.focus();
    }
  }, [isEditing, caption.formattedText]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing || (e.target as HTMLElement).closest('.delete-btn, .resize-handle')) return;
    if (!dragRef.current || !caption.id) return;
    onDragChange(true);
    const rect = dragRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

// Find this function within DraggableCaption and replace it

  const onMouseMove = (e: MouseEvent) => {
    if (!dragRef.current || !caption.id) return;
    const parentRect = dragRef.current.parentElement!.getBoundingClientRect();
    const elementRect = dragRef.current.getBoundingClientRect(); // Get element's own size

    // Calculate the new top-left position relative to the parent
    const newLeft = e.clientX - parentRect.left - offset.current.x;
    const newTop = e.clientY - parentRect.top - offset.current.y;

    // CORRECTED: Calculate the new CENTER of the element
    const newCenterX = newLeft + elementRect.width / 2;
    const newCenterY = newTop + elementRect.height / 2;

    // Convert the center coordinates to percentages
    const x = (newCenterX / parentRect.width) * 100;
    const y = (newCenterY / parentRect.height) * 100;

    onPositionChange(caption.id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };
  
  const onMouseUp = () => {
    onDragChange(false);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragRef.current || !caption.id) return;
    const startRect = dragRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const onResizeMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startRect.width + (moveEvent.clientX - startX);
      const newHeight = startRect.height + (moveEvent.clientY - startY);
      onResize(caption.id!, { width: Math.max(newWidth, 100), height: Math.max(newHeight, 50) });
    };

    const onResizeMouseUp = () => {
      document.removeEventListener("mousemove", onResizeMouseMove);
      document.removeEventListener("mouseup", onResizeMouseUp);
    };

    document.addEventListener("mousemove", onResizeMouseMove);
    document.addEventListener("mouseup", onResizeMouseUp);
  };

  const handleSave = () => {
    if (textareaRef.current && caption.id) {
      onTextChange(caption.id, textareaRef.current.value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { setIsEditing(false); }
  };

  const dynamicStyles = getCaptionStyleOverrides(caption, style);
  const isStat = caption.captionIntent === 'stat';

  // NEW: Calculate dynamic font size if the caption has been resized
  const dynamicFontSize = caption.size
    ? { fontSize: `${Math.max(12, caption.size.height / 3)}px` }
    : {};


  const captionStyles: React.CSSProperties = {
    ...dynamicStyles,
    ...dynamicFontSize, // Apply dynamic font size
    left: `${caption.position?.x ?? 50}%`,
    top: `${caption.position?.y ?? 85}%`,
    width: caption.size ? `${caption.size.width}px` : 'auto',
    height: caption.size ? `${caption.size.height}px` : 'auto',
    transform: `translate(-50%, -50%) ${dynamicStyles.transform || ''}`.trim(),
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: 'absolute',
    cursor: 'move',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // NEW: Separate styles for the textarea to ensure it inherits dynamic font size
  const textAreaStyle: React.CSSProperties = {
    ...dynamicFontSize,
    fontFamily: 'inherit',
    fontWeight: 'inherit',
    color: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    textTransform: 'inherit',
    minWidth: '200px'
  }

  return (
    <div
      ref={dragRef}
      className={cn(
        "group",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        getAnimationClasses(caption.style?.animation)
      )}
        style={{ ...captionStyles, ...(isHovered && { transform: `${captionStyles.transform} scale(1.02)`, filter: 'brightness(1.1)' }) }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => { e.stopPropagation(); onSelect(caption.id!); }}
    >
      {caption.name && <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">{caption.name}</span>}
      {caption.captionIntent === 'quote' && <span className="quote-before pointer-events-none">"</span>}
      <button className="delete-btn absolute -top-3 -right-3 z-10 h-7 w-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110" onClick={(e) => { e.stopPropagation(); if (caption.id) onDelete(caption.id); }} title="Delete caption"><X className="h-4 w-4 text-white" /></button>
      <div className="whitespace-pre-wrap" style={isStat ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } : {}}>
        {isEditing ? (<textarea ref={textareaRef} defaultValue={caption.formattedText} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus className="w-full h-auto bg-transparent border-none outline-none resize-none text-center" style={textAreaStyle} />) : (caption.formattedText)}
      </div>
      {caption.captionIntent === 'quote' && <span className="quote-after pointer-events-none">"</span>}

      <div
        className="resize-handle absolute -bottom-2 -right-2 h-5 w-5 bg-primary rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        onMouseDown={onResizeMouseDown}
      >
        <Maximize2 className="h-3 w-3 text-primary-foreground" />
      </div>
    </div>
  );
};


interface VideoCanvasProps {
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  recordingMode: "webcam" | "screen" | "both";
  onRecordingModeChange: (mode: "webcam" | "screen" | "both") => void;
  permanentCaptions: AIDecision[];
  setPermanentCaptions: React.Dispatch<React.SetStateAction<AIDecision[]>>;
  selectedCaptionId: string | null;
  setSelectedCaptionId: (id: string | null) => void;
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImageUrl: string | null;
  isAutoFramingEnabled: boolean;
  isAiModeEnabled: boolean;
  graphs: GraphObject[];
  activeGraphId: string | null;
  onProcessTranscript: (transcript: string) => void;
  setGraphs: React.Dispatch<React.SetStateAction<GraphObject[]>>;
  setActiveGraphId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const VideoCanvas = ({
  captionStyle,
  captionsEnabled,
  recordingMode,
  onRecordingModeChange,
  permanentCaptions,
  setPermanentCaptions,
  selectedCaptionId,
  setSelectedCaptionId,
  backgroundEffect,
  backgroundImageUrl,
  isAutoFramingEnabled,
  isAiModeEnabled,
  graphs,
  activeGraphId,
  onProcessTranscript,
  setGraphs,
  setActiveGraphId,
}: VideoCanvasProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const selfieSegmentation = useRef<SelfieSegmentation | null>(null);
  const faceDetection = useRef<FaceDetection | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const listBufferRef = useRef<string[]>([]);
  const listTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWaitingForListRef = useRef(false);
  const captionQueueRef = useRef<AIDecision[]>([]);
  const isProcessingQueueRef = useRef(false);
  const questionPositionToggleRef = useRef(false);
  const liveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overlayNameCounters = useRef<{ [key: string]: number }>({ title: 0, list: 0, question: 0, quote: 0, stat: 0, graph: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [liveCaption, setLiveCaption] = useState<AIDecision | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");

  const [liveCaptionPosition, setLiveCaptionPosition] = useState(captionStyle.position);
  const [isDraggingLive, setIsDraggingLive] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const liveCaptionRef = useRef<HTMLDivElement>(null);

  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setDebugInfo } = useDebug();
  const { log } = useLog();

  // Load background image when URL changes
  useEffect(() => {
    if (backgroundEffect === 'image' && backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = backgroundImageUrl;
      img.onload = () => {
        backgroundImageRef.current = img;
      };
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundEffect, backgroundImageUrl]);

  // --- Initialize MediaPipe Models ---
  useEffect(() => {
    // Initialize Selfie Segmentation for background effects
    const segmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.current = segmentation;

    // Initialize Face Detection for auto-framing
    const detection = new FaceDetection({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    detection.setOptions({ minDetectionConfidence: 0.5, model: 'short' });
    faceDetection.current = detection;

    return () => {
      segmentation.close();
      detection.close();
    }
  }, []);

  // --- Main Video Processing Loop ---
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!videoElement || !canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    let lastFacePosition = { x: 0.5, y: 0.5, width: 0.5 };

    const processFrame = async () => {
      if (videoElement.readyState < 2 || videoElement.videoWidth === 0) {
        animationFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      if (isAutoFramingEnabled && faceDetection.current) {
        await faceDetection.current.send({ image: videoElement });
        // The transform is now applied within the onResults callback to ensure timing
      }

      if (backgroundEffect !== 'none' && selfieSegmentation.current) {
        await selfieSegmentation.current.send({ image: videoElement });
      } else {
        ctx.save();
        if (isAutoFramingEnabled) {
          // Apply a smoothed transform if no other effects are running
          const scale = 1 / lastFacePosition.width;
          const x = (-lastFacePosition.x * canvasElement.width * scale) + (canvasElement.width / 2);
          const y = (-lastFacePosition.y * canvasElement.height * scale) + (canvasElement.height / 2);
          ctx.setTransform(scale, 0, 0, scale, x, y);
        }
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(processFrame);
    };

    // UPDATED AND FIXED: MediaPipe onResults listeners
    if (selfieSegmentation.current) {
      selfieSegmentation.current.onResults((results) => {
        if (!ctx || !canvasElement) return;
        ctx.save();
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Apply shared auto-framing transform first
        if (isAutoFramingEnabled) {
          const scale = 1 / lastFacePosition.width;
          const x = (-lastFacePosition.x * canvasElement.width * scale) + (canvasElement.width / 2);
          const y = (-lastFacePosition.y * canvasElement.height * scale) + (canvasElement.height / 2);
          ctx.setTransform(scale, 0, 0, scale, x, y);
        }

        // Draw the person segmentation mask first to isolate the person.
        ctx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);

        // Use 'source-in' to draw the original video, but only where the mask is.
        // This effectively puts ONLY the person on the canvas.
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        // Use 'destination-over' to draw the background BEHIND the person.
        ctx.globalCompositeOperation = 'destination-over';

        // Logic for different background effects
        if (backgroundEffect === 'blur') {
          ctx.filter = 'blur(8px)';
          ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        } else if (backgroundEffect === 'image' && backgroundImageRef.current) {
          ctx.drawImage(backgroundImageRef.current, 0, 0, canvasElement.width, canvasElement.height);
        } else {
          // If 'none' or image not loaded, create a simple black background.
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }

        ctx.restore();
      });
    }
    if (faceDetection.current) {
      faceDetection.current.onResults((results) => {
        if (!isAutoFramingEnabled || !results.detections.length) {
          lastFacePosition = { x: 0.5, y: 0.5, width: 0.5 }; // Reset if no face
          return;
        }

        const detection = results.detections[0].boundingBox;
        const target = {
          x: detection.xCenter,
          y: detection.yCenter,
          width: Math.max(detection.width, detection.height) * 2.5, // Zoom out a bit
        };

        // Smooth transition to the new position (lerp)
        lastFacePosition.x += (target.x - lastFacePosition.x) * 0.1;
        lastFacePosition.y += (target.y - lastFacePosition.y) * 0.1;
        lastFacePosition.width += (target.width - lastFacePosition.width) * 0.1;
      });
    }

    const startStream = async () => {
      try {
        let stream;
        if (recordingMode === "screen" || recordingMode === "both") {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1920, height: 1080 }, audio: true });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: true });
        }
        videoElement.srcObject = stream;
        videoElement.play();
        animationFrameId.current = requestAnimationFrame(processFrame);
      } catch (error) {
        toast.error("Could not access camera/screen.");
      }
    };
    startStream();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (videoElement.srcObject) {
        (videoElement.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, [recordingMode, backgroundEffect, isAutoFramingEnabled, backgroundImageUrl]);

  const EDIT_TRIGGER_WORDS = ["edit", "change", "update", "add to", "append", "remove", "delete"];
  const GRAPH_TRIGGER_WORDS = ["graph", "chart", "plot", "bar chart", "line chart", "pie chart", "add", "set"];
  const GRAPH_EDIT_COMMANDS = ["add [label] with [value] percent", "change title to [new title]", "done (to exit editing)"];

  // UPDATED: This will now be generated dynamically
  const [generalCommands, setGeneralCommands] = useState<string[]>(["create a bar chart", "create a line chart"]);

  useEffect(() => {
    // This effect now only runs when the global captionStyle.position changes from the sidebar.
    setLiveCaptionPosition(captionStyle.position);
  }, [captionStyle.position]);

  // UPDATED: Dynamically generate command hints based on on-screen overlays
  useEffect(() => {
    const creationCommands = ["create a bar chart", "create a line chart"];
    const editCommands = [...permanentCaptions, ...graphs].map(overlay => `edit "${overlay.name}"`);
    setGeneralCommands([...creationCommands, ...editCommands]);
  }, [permanentCaptions, graphs]);

  const handleMouseMove = () => {
    setAreControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (!isRecording) return;
      setAreControlsVisible(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  const handleLiveCaptionMouseMove = useCallback((e: MouseEvent) => {
    if (!liveCaptionRef.current) return;
    const parent = liveCaptionRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const x = ((e.clientX - parentRect.left - dragOffsetRef.current.x) / parentRect.width) * 100;
    const y = ((e.clientY - parentRect.top - dragOffsetRef.current.y) / parentRect.height) * 100;

    setLiveCaptionPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }, []);

  const handleLiveCaptionMouseUp = useCallback(() => {
    setIsDraggingLive(false);
    document.removeEventListener("mousemove", handleLiveCaptionMouseMove);
    document.removeEventListener("mouseup", handleLiveCaptionMouseUp);
  }, [handleLiveCaptionMouseMove]);

  const handleLiveCaptionMouseDown = (e: React.MouseEvent) => {
    if (!liveCaptionRef.current) return;
    e.stopPropagation();
    setIsDraggingLive(true);
    const rect = liveCaptionRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener("mousemove", handleLiveCaptionMouseMove);
    document.addEventListener("mouseup", handleLiveCaptionMouseUp);
  };

  const processCaptionQueue = useCallback(() => {
    if (isProcessingQueueRef.current || captionQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    const caption = captionQueueRef.current.shift()!;
    const intent = caption.captionIntent || 'live';

    // UPDATED: Assign a name when creating the caption
    const counter = (overlayNameCounters.current[intent] || 0) + 1;
    overlayNameCounters.current[intent] = counter;
    const name = `${intent.charAt(0).toUpperCase() + intent.slice(1)} ${counter}`;

    const newCaption: AIDecision = {
      ...caption,
      id: `${Date.now()}-${Math.random()}`,
      name, // Assign the generated name
      position: caption.position || { x: 50, y: 50 },
      style: captionStyle,
    };
    setPermanentCaptions(prev => [...prev, newCaption]);
    setTimeout(() => { isProcessingQueueRef.current = false; processCaptionQueue(); }, 100);
  }, [captionStyle, setPermanentCaptions]);

  const handleNewTranscript = useCallback(
    async (transcript: string) => {
       onProcessTranscript(transcript);
    },
    [
      onProcessTranscript
    ],
  );

  const handleNewTranscriptRef = useRef(handleNewTranscript);
  useEffect(() => {
    handleNewTranscriptRef.current = handleNewTranscript;
  }, [handleNewTranscript]);

  const removeCaption = useCallback((id: string) => {
    setPermanentCaptions(prev => prev.filter(c => c.id !== id));
    if (selectedCaptionId === id) {
      setSelectedCaptionId(null);
    }
  }, [setPermanentCaptions, selectedCaptionId, setSelectedCaptionId]);

  const removeGraph = (id: string) => {
    setGraphs(prev => prev.filter(g => g.id !== id));
    if (activeGraphId === id) {
      setActiveGraphId(null);
    }
  };

  const handleGraphResize = (id: string, size: { width: number; height: number }) => {
    setGraphs(graphs => graphs.map(g => (g.id === id ? { ...g, size } : g)));
  };


  const handleGraphPositionChange = (id: string, position: { x: number; y: number }) => {
    setGraphs(graphs => graphs.map(g => (g.id === id ? { ...g, position } : g)));
  };

  const handlePermanentCaptionTextChange = (id: string, newText: string) => {
    setPermanentCaptions(captions => captions.map(c => (c.id === id ? { ...c, formattedText: newText } : c)));
  };

  const handlePermanentCaptionResize = (id: string, size: { width: number; height: number }) => {
    setPermanentCaptions(captions => captions.map(c => (c.id === id ? { ...c, size } : c)));
  };

  const handlePermanentCaptionPositionChange = (id: string, position: { x: number; y: number }) => {
    setPermanentCaptions(captions =>
      captions.map(c =>
        c.id === id
          ? { ...c, position, style: { ...c.style!, position } }
          : c
      )
    );
  };

  const handleFinalTranscript = useCallback((transcript: string) => {
    handleNewTranscriptRef.current(transcript);
  }, []); // Empty deps - uses ref which never changes

  const handlePartialTranscript = useCallback((partial: string) => {
    setPartialTranscript(partial);
  }, []); // Empty deps - setPartialTranscript is stable

  const { isRecording, startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: handleFinalTranscript,
    onPartialTranscript: handlePartialTranscript,
  });

  const handleStopRecording = () => {
    stopRecognition();
    setPermanentCaptions([]);
    setLiveCaption(null);
    setPartialTranscript("");
    setGraphs([]);
    setActiveGraphId(null);
    listBufferRef.current = [];
    captionQueueRef.current = [];
    overlayNameCounters.current = { title: 0, list: 0, question: 0, quote: 0, stat: 0, graph: 0 };
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
      left: `${liveCaptionPosition.x}%`,
      top: `${liveCaptionPosition.y}%`,
      transform: "translate(-50%, -50%)",
      opacity: liveCaption ? 1 : 0.7,
      cursor: isDraggingLive ? 'grabbing' : 'grab',
    };
  };

  return (
    <div
      className="flex-1 relative bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
      onClick={() => setSelectedCaptionId(null)}
    >
      <style>{`
        @keyframes zoomIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -30%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.95; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 30px hsl(var(--primary)), 0 0 50px hsl(var(--primary)), inset 0 0 15px rgba(255,255,255,0.4); } 50% { box-shadow: 0 0 45px hsl(var(--primary)), 0 0 70px hsl(var(--primary)), inset 0 0 15px rgba(255,255,255,0.4); } }
        .quote-before, .quote-after { position: absolute; font-size: 4em; color: var(--quote-color); font-family: 'Times New Roman', serif; }
        .quote-before { top: -0.2em; left: -0.4em; }
        .quote-after { bottom: -0.5em; right: -0.4em; }
      `}</style>

      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div
        className="absolute inset-0"
        // CHANGED: Removed the onClick handler that was stopping propagation
      >
        {captionsEnabled && (
          <>
            {permanentCaptions.map((caption) => (
              <DraggableCaption
                key={caption.id}
                caption={caption}
                onPositionChange={handlePermanentCaptionPositionChange}
                onResize={handlePermanentCaptionResize}
                onDragChange={setIsDragging}
                onDelete={removeCaption}
                onTextChange={handlePermanentCaptionTextChange}
                isSelected={selectedCaptionId === caption.id}
                onSelect={setSelectedCaptionId}
              />
            ))}

            {(liveCaption || partialTranscript) && (
            <div
              ref={liveCaptionRef}
              className={cn(
                "absolute select-none text-center",
                liveCaption
                  ? getAnimationClasses(liveCaption.style?.animation || captionStyle.animation)
                  : "animate-pulse"
              )}
              style={getLiveCaptionStyles()}
              onMouseDown={handleLiveCaptionMouseDown}
            >
                {liveCaption?.formattedText || partialTranscript}
              </div>
            )}
          </>
        )}

        {graphs.map((graph) => (
          <DraggableGraph
            key={graph.id}
            graph={graph}
            onPositionChange={handleGraphPositionChange}
            onResize={handleGraphResize}
            onDelete={removeGraph}
            isFocused={graph.id === activeGraphId}
          />
        ))}

        <CommandHintOverlay
          title={activeGraphId ? "Editing Graph..." : "Voice Commands"}
          commands={activeGraphId ? GRAPH_EDIT_COMMANDS : generalCommands}
          isVisible={isRecording && (permanentCaptions.length > 0 || graphs.length > 0)}
        />

        <div className={cn(
          "absolute bottom-6 w-full flex items-center justify-center gap-3 transition-all duration-300",
          areControlsVisible || !isRecording ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm" onClick={() => onRecordingModeChange("webcam")} disabled={isRecording || recordingMode === "webcam"}>
            <Webcam />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm" onClick={() => onRecordingModeChange("screen")} disabled={isRecording || recordingMode === "screen"}>
            <ScreenShare />
          </Button>
          {!isRecording ? (
            <Button size="icon" className="bg-red-600 hover:bg-red-700 rounded-full h-16 w-16 shadow-lg" onClick={startRecognition}>
              <Mic />
            </Button>
          ) : (
            <Button size="icon" className="bg-primary hover:bg-primary/90 rounded-full h-16 w-16 shadow-lg" onClick={handleStopRecording}>
              <Square />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm">
            <Maximize />
          </Button>
        </div>
      </div>
    </div>
  );
};