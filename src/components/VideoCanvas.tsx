// src/components/VideoCanvas.tsx

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Maximize, Mic, Move, ScreenShare, Square, Webcam, X } from "lucide-react";
import { CaptionStyle, AIDecision, GraphObject } from "@/types/caption";
import { Button } from "@/components/ui/button";
import { useDebug } from "@/context/DebugContext";
import { useLog } from "@/context/LogContext";
import { formatCaptionWithAI, autocorrectTranscript, processEditCommand, processGraphCommand } from "@/lib/ai";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DraggableGraph } from './DraggableGraph';
import { CommandHintOverlay } from './CommandHintOverlay'; 
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech"; // UPDATED: Import the new hook

const getCaptionStyleOverrides = (caption: AIDecision, baseStyle: CaptionStyle): React.CSSProperties => {
  const intent = caption.captionIntent || 'default';
  let intentOverrides: Partial<React.CSSProperties> = {};

  switch (intent) {
    case 'title':
      intentOverrides = {
        fontSize: baseStyle.fontSize * 2.0,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '3px',
        textShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        backgroundColor: 'transparent',
      };
      break;
    case 'question':
      intentOverrides = {
        fontSize: baseStyle.fontSize * 1.2,
        fontWeight: '600',
        padding: '12px 20px',
        border: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--background) / 0.5)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transform: 'rotate(-2deg) scale(1.02)',
        maxWidth: '500px',
      };
      break;
    case 'list':
      intentOverrides = {
        fontSize: baseStyle.fontSize,
        fontWeight: '500',
        padding: '16px 24px',
        borderLeft: '3px solid hsl(var(--primary))',
        backgroundColor: 'hsl(var(--background) / 0.5)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'left',
        lineHeight: '1.7',
        maxWidth: '400px',
      };
      break;
    case 'quote':
      intentOverrides = {
        fontSize: baseStyle.fontSize * 1.4,
        fontWeight: '500',
        backgroundColor: 'transparent',
        fontStyle: 'italic',
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        maxWidth: '60%',
        '--quote-color': 'hsl(var(--primary) / 0.5)',
      };
      break;
    case 'stat':
      intentOverrides = {
        fontSize: baseStyle.fontSize * 1.8,
        fontWeight: '800',
        background: 'hsl(var(--primary) / 0.1)',
        color: 'hsl(var(--primary))',
        padding: '24px',
        borderRadius: '50%',
        boxShadow: `0 0 0 2px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.5)`,
        textAlign: 'center',
        border: '2px solid transparent',
        minWidth: '150px',
        minHeight: '150px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '1.1',
      };
      break;
    case 'live':
    default:
      intentOverrides = {
        fontWeight: '600',
        padding: '8px 16px',
        backgroundColor: 'hsl(var(--background) / 0.5)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius)',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maxWidth: '90%',
        wordWrap: 'break-word',
      };
      break;
  }
  return {
    ...baseStyle,
    ...intentOverrides,
  };
};

interface DraggableCaptionProps {
  caption: AIDecision;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onDragChange: (isDragging: boolean) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, newText: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const DraggableCaption = ({ caption, onPositionChange, onDragChange, onDelete, onTextChange, isSelected, onSelect }: DraggableCaptionProps) => {
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
    if (isEditing || (e.target as HTMLElement).closest('.delete-btn')) return;
    if (!dragRef.current || !caption.id) return;
    onDragChange(true);
    const rect = dragRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragRef.current || !caption.id) return;
    const parentRect = dragRef.current.parentElement!.getBoundingClientRect();
    const x = ((e.clientX - parentRect.left - offset.current.x) / parentRect.width) * 100;
    const y = ((e.clientY - parentRect.top - offset.current.y) / parentRect.height) * 100;
    onPositionChange(caption.id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const onMouseUp = () => {
    onDragChange(false);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
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

  const captionStyles: React.CSSProperties = {
    ...dynamicStyles,
    left: `${caption.position?.x ?? 50}%`,
    top: `${caption.position?.y ?? 85}%`,
    transform: `translate(-50%, -50%) ${dynamicStyles.transform || ''}`.trim(),
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: "zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
    position: 'absolute',
    cursor: 'move',
    userSelect: 'none',
  };

  return (
    <div 
      ref={dragRef} 
      className={cn( "group", isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background")} 
      style={{...captionStyles, ...(isHovered && { transform: `${captionStyles.transform} scale(1.02)`, filter: 'brightness(1.1)'})}} 
      onMouseDown={onMouseDown} 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)} 
      onDoubleClick={() => setIsEditing(true)}
      onClick={(e) => { e.stopPropagation(); onSelect(caption.id!); }}
    >
      {caption.captionIntent === 'quote' && <span className="quote-before pointer-events-none">"</span>}
      <Move className="absolute -top-6 right-1/2 translate-x-1/2 h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
      <button className="delete-btn absolute -top-3 -right-3 z-10 h-7 w-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110" onClick={(e) => { e.stopPropagation(); if (caption.id) onDelete(caption.id); }} title="Delete caption"><X className="h-4 w-4 text-white" /></button>
      <div className="whitespace-pre-wrap" style={isStat ? {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'} : {}}>
        {isEditing ? (<textarea ref={textareaRef} defaultValue={caption.formattedText} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus className="w-full h-auto bg-transparent border-none outline-none resize-none" style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit', textAlign: 'inherit', textTransform: 'inherit', minWidth: '200px' }} />) : (caption.formattedText)}
      </div>
      {caption.captionIntent === 'quote' && <span className="quote-after pointer-events-none">"</span>}
    </div>
  );
};


interface VideoCanvasProps {
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  recordingMode: "webcam" | "screen" | "both";
  onRecordingModeChange: (mode: "webcam" | "screen" | "both") => void;
  onCaptionPositionChange: (position: { x: number; y: number }) => void;
  permanentCaptions: AIDecision[];
  setPermanentCaptions: React.Dispatch<React.SetStateAction<AIDecision[]>>;
  selectedCaptionId: string | null;
  setSelectedCaptionId: (id: string | null) => void;
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
}: VideoCanvasProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const listBufferRef = useRef<string[]>([]);
  const listTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWaitingForListRef = useRef(false);
  const captionQueueRef = useRef<AIDecision[]>([]);
  const isProcessingQueueRef = useRef(false);
  const questionPositionToggleRef = useRef(false);
  const liveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [liveCaption, setLiveCaption] = useState<AIDecision | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [graphs, setGraphs] = useState<GraphObject[]>([]);
  
  const [liveCaptionPosition, setLiveCaptionPosition] = useState(captionStyle.position);
  const [isDraggingLive, setIsDraggingLive] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const liveCaptionRef = useRef<HTMLDivElement>(null);

  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { setDebugInfo } = useDebug();
  const { log } = useLog();

  const EDIT_TRIGGER_WORDS = ["edit", "change", "update", "add to", "append", "remove", "delete"];
  const GRAPH_TRIGGER_WORDS = ["graph", "chart", "plot", "bar chart", "line chart", "pie chart", "add", "set"];
  const GRAPH_EDIT_COMMANDS = ["add [label] with [value] percent", "change the title to [new title]", "set x-axis to [label]", "done (to exit editing)"];
  const GENERAL_COMMANDS = ["create a bar chart", "create a line chart", "edit the [caption text or type]", "select the graph (to edit)"];
  
  useEffect(() => {
    if (!isDraggingLive) {
      setLiveCaptionPosition(captionStyle.position);
    }
  }, [captionStyle.position, isDraggingLive]);

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
    const newCaption: AIDecision = { 
      ...caption, 
      id: `${Date.now()}-${Math.random()}`, 
      position: caption.position || { x: 50, y: 50 },
      style: captionStyle,
    };
    setPermanentCaptions(prev => [...prev, newCaption]);
    setTimeout(() => { isProcessingQueueRef.current = false; processCaptionQueue(); }, 100);
  }, [captionStyle, setPermanentCaptions]);

  const handleNewTranscript = useCallback(
    async (transcript: string) => {
      log('TRANSCRIPT', 'Raw transcript received', transcript);
      setPartialTranscript("");
      setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, correctedTranscript: "...", aiResponse: null, error: null }));

      try {
        const correctedTranscript = await autocorrectTranscript(transcript);
        log('INFO', 'Autocorrected transcript', correctedTranscript);
        setDebugInfo(prev => ({ ...prev, correctedTranscript }));
        const lowerTranscript = correctedTranscript.toLowerCase();

        if (activeGraphId) {
          if (lowerTranscript.includes('done') || lowerTranscript.includes('stop editing') || lowerTranscript.includes('exit')) {
            toast.info("Graph editing finished.");
            setActiveGraphId(null);
            return;
          }

          const targetGraph = graphs.find(g => g.id === activeGraphId);
          if (!targetGraph) {
            setActiveGraphId(null);
            return; 
          }

          console.log(`Updating active graph ${activeGraphId} with: "${correctedTranscript}"`);
          const graphAiResponse = await processGraphCommand(correctedTranscript, targetGraph);
          log('AI_RESPONSE', 'Graph UPDATE response received', graphAiResponse);
          
          if (!graphAiResponse) {
            toast.error("Didn't understand that graph command. Try 'add [label] with [value]' or 'change title to [new title]'.");
            return;
          }
          
          setDebugInfo((prev) => ({ ...prev, aiResponse: graphAiResponse as any }));

          const existingDataMap = new Map(targetGraph.data.map(d => [d.label.toLowerCase(), d.value]));
          if (graphAiResponse.data) {
            (graphAiResponse.data as any).forEach((newDataPoint: { label: string; value: number }) => {
              existingDataMap.set(newDataPoint.label.toLowerCase(), newDataPoint.value);
            });
          }
          const mergedData = Array.from(existingDataMap, ([label, value]) => ({ label, value }));

          const updatedGraph: GraphObject = { 
            ...targetGraph,
            data: mergedData,
            config: {
              title: graphAiResponse.config?.title || targetGraph.config.title,
              xAxisLabel: graphAiResponse.config?.xAxisLabel || targetGraph.config.xAxisLabel,
              yAxisLabel: graphAiResponse.config?.yAxisLabel || targetGraph.config.yAxisLabel,
            }
          };
          
          setGraphs(prev => prev.map(g => (g.id === activeGraphId ? updatedGraph : g)));

          if ((graphAiResponse as any).status === 'COMPLETE' && mergedData.length >= 2) {
            toast.success("Graph completed!");
            setActiveGraphId(null);
          } else {
            toast.info("Graph updated. Still in focus.");
          }
          return;
        }

        const isGraphRelated = GRAPH_TRIGGER_WORDS.some(word => lowerTranscript.includes(word));
        const isEditCommand = EDIT_TRIGGER_WORDS.some(word => lowerTranscript.startsWith(word));

        if (isGraphRelated) {
          console.log("✅ Matched 'isGraphRelated'. Entering CREATE logic.");
          const graphAiResponse = await processGraphCommand(correctedTranscript);
          log('AI_RESPONSE', 'Graph CREATE response received', graphAiResponse);
          
          if (!graphAiResponse) {
            toast.error("Couldn't create graph. Try: 'Create a bar graph'");
            return;
          }

          setDebugInfo((prev) => ({ ...prev, aiResponse: graphAiResponse as any }));
          
          const newGraph: GraphObject = {
            id: `graph-${Date.now()}`,
            type: 'graph',
            graphType: (graphAiResponse as any).graphType || 'bar',
            data: (graphAiResponse as any).data || [],
            config: {
              title: graphAiResponse.config?.title || 'New Graph',
              xAxisLabel: graphAiResponse.config?.xAxisLabel || '',
              yAxisLabel: graphAiResponse.config?.yAxisLabel || '',
            },
            position: { x: 50, y: 50 },
            size: { width: 550, height: 400 },
          };

          setGraphs(prev => [...prev, newGraph]);
          
          setActiveGraphId(newGraph.id);
          console.log(`✅ FOCUS SET. activeGraphId is now: ${newGraph.id}`);
          toast.success("Graph created! It is now in focus.");
          
          return;
        }

        if (isEditCommand && permanentCaptions.length > 0) {
          const editAction = await processEditCommand(correctedTranscript, permanentCaptions);
          if (!editAction || !editAction.targetCaptionId) {
            toast.error("Couldn't find the caption to edit");
            return;
          }
          setPermanentCaptions(prevCaptions => 
            prevCaptions.map(caption => {
              if (caption.id !== editAction.targetCaptionId) return caption;
              let newText = caption.formattedText;
              switch (editAction.command) {
                case "EDIT": newText = editAction.newText || ""; break;
                case "APPEND": newText = caption.formattedText + (editAction.newText || ""); break;
                case "DELETE_LINE":
                  if (editAction.lineToDelete) {
                    const lines = caption.formattedText.split('\n');
                    lines.splice(editAction.lineToDelete - 1, 1);
                    newText = lines.join('\n');
                  }
                  break;
              }
              return { ...caption, formattedText: newText };
            })
          );
          toast.success("Caption updated!");
          return;
        }
        
        const aiDecision = await formatCaptionWithAI(correctedTranscript);
        log('AI_RESPONSE', 'Caption response received', aiDecision);
        setDebugInfo((prev) => ({ ...prev, aiResponse: aiDecision, error: null }));

        if (aiDecision.decision === "HIDE") {
          setLiveCaption(null);
          return;
        }

        if (aiDecision.captionIntent === 'list') {
          setLiveCaption(null);
          listBufferRef.current.push(aiDecision.formattedText);
          isWaitingForListRef.current = true;
          if (listTimeoutRef.current) clearTimeout(listTimeoutRef.current);
          listTimeoutRef.current = setTimeout(() => {
            const formattedList = listBufferRef.current.map((item, idx) => item.trim().match(/^[•\-\d+\.]/) ? item : `${idx + 1}. ${item}`).join('\n');
            const listCaption: AIDecision = { ...aiDecision, formattedText: formattedList, captionIntent: 'list', position: aiDecision.position || { x: 15, y: 50 } };
            captionQueueRef.current.push(listCaption);
            processCaptionQueue();
            listBufferRef.current = [];
            isWaitingForListRef.current = false;
          }, 1500);
          return;
        }

        if (isWaitingForListRef.current && listBufferRef.current.length > 0) {
          if (listTimeoutRef.current) clearTimeout(listTimeoutRef.current);
          const formattedList = listBufferRef.current.map((item, idx) => item.trim().match(/^[•\-\d+\.]/) ? item : `${idx + 1}. ${item}`).join('\n');
          const listCaption: AIDecision = { decision: 'SHOW', type: 'highlight', duration: 'permanent', formattedText: formattedList, captionIntent: 'list', position: { x: 15, y: 50 } };
          captionQueueRef.current.push(listCaption);
          listBufferRef.current = [];
          isWaitingForListRef.current = false;
        }

        if (aiDecision.captionIntent === 'question' && !aiDecision.position) {
          questionPositionToggleRef.current = !questionPositionToggleRef.current;
          aiDecision.position = questionPositionToggleRef.current ? { x: 75, y: 20 } : { x: 25, y: 20 };
        }

        if (aiDecision.type === 'highlight') {
          setLiveCaption(null);
          captionQueueRef.current.push(aiDecision);
          processCaptionQueue();
        } else {
          setLiveCaption({ ...aiDecision, id: Date.now().toString(), position: aiDecision.position || captionStyle.position });
          if (liveCaptionTimeoutRef.current) clearTimeout(liveCaptionTimeoutRef.current);
          liveCaptionTimeoutRef.current = setTimeout(() => { setLiveCaption(null); }, (aiDecision.duration as number) * 1000);
        }
      } catch (error) {
          log('ERROR', 'Error in handleNewTranscript', error);
          console.error("AI processing failed:", error);
          setDebugInfo((prev) => ({ ...prev, error: "AI processing failed." }));
          toast.error("Failed to process speech");
      }
    },
    [setDebugInfo, captionStyle, processCaptionQueue, permanentCaptions, graphs, activeGraphId, log, setPermanentCaptions],
  );
  
  const handleNewTranscriptRef = useRef(handleNewTranscript);
  useEffect(() => {
    handleNewTranscriptRef.current = handleNewTranscript;
  }, [handleNewTranscript]);

  const removeCaption = useCallback((id: string) => {
    setPermanentCaptions(prev => prev.filter(c => c.id !== id));
    if(selectedCaptionId === id) {
      setSelectedCaptionId(null);
    }
  }, [setPermanentCaptions, selectedCaptionId, setSelectedCaptionId]);

  const removeGraph = (id: string) => {
    setGraphs(prev => prev.filter(g => g.id !== id));
    if (activeGraphId === id) {
      setActiveGraphId(null);
    }
  };

  const handleGraphPositionChange = (id: string, position: { x: number; y: number }) => {
    setGraphs(graphs => graphs.map(g => (g.id === id ? { ...g, position } : g)));
  };
  
  const handlePermanentCaptionTextChange = (id: string, newText: string) => {
    setPermanentCaptions(captions => captions.map(c => (c.id === id ? { ...c, formattedText: newText } : c)));
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

  // UPDATED: Use the new browser speech hook
  const { isRecording, startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: useCallback((transcript: string) => {
      // Feed the final transcript from the browser into our AI pipeline
      handleNewTranscriptRef.current(transcript);
    }, []),
    onPartialTranscript: (partial) => {
      setPartialTranscript(partial);
    },
  });

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
    stopRecognition(); // UPDATED
    setPermanentCaptions([]);
    setLiveCaption(null);
    setPartialTranscript("");
    setGraphs([]);
    setActiveGraphId(null);
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
      left: `${liveCaptionPosition.x}%`,
      top: `${liveCaptionPosition.y}%`,
      transform: "translate(-50%, -50%)",
      opacity: liveCaption ? 1 : 0.7,
      cursor: isDraggingLive ? 'grabbing' : 'grab',
      animation: liveCaption ? "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "pulse 1.s ease-in-out infinite",
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
        className="absolute inset-0 w-full h-full object-cover" 
        autoPlay 
        muted 
      />
      
      <div 
        className="absolute inset-0"
        onClick={(e) => e.stopPropagation()}
      >
        {captionsEnabled && (
          <>
            {permanentCaptions.map((caption) => (
              <DraggableCaption
                key={caption.id}
                caption={caption}
                onPositionChange={handlePermanentCaptionPositionChange}
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
                className="absolute select-none text-center"
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
            onDelete={removeGraph}
            isFocused={graph.id === activeGraphId}
          />
        ))}

        <CommandHintOverlay
          title={activeGraphId ? "Editing Graph..." : "Voice Commands"}
          commands={activeGraphId ? GRAPH_EDIT_COMMANDS : GENERAL_COMMANDS}
          isVisible={isRecording}
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