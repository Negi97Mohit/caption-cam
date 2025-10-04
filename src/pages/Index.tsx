// src/pages/Index.tsx

import { useState, useCallback, useEffect, useRef } from "react";
import { VideoCanvas } from "@/components/VideoCanvas";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopToolbar } from "@/components/TopToolbar";
import { CaptionStyle, CaptionTemplate, AIDecision, GraphObject } from "@/types/caption";
import { formatCaptionWithAI, autocorrectTranscript, processEditCommand, processGraphCommand } from "@/lib/ai";
import { toast } from "sonner";
import { useLog } from "@/context/LogContext";
import { useDebug } from "@/context/DebugContext";

const Index = () => {
  // --- Default caption style state ---
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
    fontFamily: "Inter", fontSize: 24, color: "#FFFFFF", backgroundColor: "rgba(0, 0, 0, 0.8)",
    position: { x: 50, y: 85 }, shape: "rounded", animation: "fade", outline: false, shadow: true,
    bold: false, italic: false, underline: false,
  });

  // --- State for individual captions ---
  const [permanentCaptions, setPermanentCaptions] = useState<AIDecision[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // --- State for graphs (lifted from VideoCanvas) ---
  const [graphs, setGraphs] = useState<GraphObject[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);

  // --- State for video effects ---
  const [backgroundEffect, setBackgroundEffect] = useState<'none' | 'blur' | 'image'>('none');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isAutoFramingEnabled, setIsAutoFramingEnabled] = useState(false);

  // --- State for resizable and collapsible sidebar ---
  const [sidebarWidth, setSidebarWidth] = useState(384); // Default width (w-96)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  // --- Other UI state ---
  const [selectedTemplate, setSelectedTemplate] = useState<CaptionTemplate | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen" | "both">("webcam");
  const [isAiModeEnabled, setIsAiModeEnabled] = useState(true);

  // --- Context and Refs for AI Logic ---
  const { log } = useLog();
  const { setDebugInfo } = useDebug();
  const listBufferRef = useRef<string[]>([]);
  const listTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWaitingForListRef = useRef(false);
  const captionQueueRef = useRef<AIDecision[]>([]);
  const isProcessingQueueRef = useRef(false);
  const questionPositionToggleRef = useRef(false);
  const overlayNameCounters = useRef<{ [key: string]: number }>({ title: 0, list: 0, question: 0, quote: 0, stat: 0, graph: 0 });

  // --- Central AI Processing Logic ---
  const processTranscript = useCallback(async (transcript: string) => {
    if (!isAiModeEnabled) {
        toast.info("AI Mode is off. Only temporary captions will be shown.");
        return;
    }

    log('TRANSCRIPT', 'Raw transcript received', transcript);
    setDebugInfo((prev) => ({ ...prev, rawTranscript: transcript, correctedTranscript: "...", aiResponse: null, error: null }));

    try {
        const correctedTranscript = await autocorrectTranscript(transcript);
        log('INFO', 'Autocorrected transcript', correctedTranscript);
        setDebugInfo(prev => ({ ...prev, correctedTranscript }));
        const lowerTranscript = correctedTranscript.toLowerCase();

        const processCaptionQueue = () => {
          if (isProcessingQueueRef.current || captionQueueRef.current.length === 0) return;
          isProcessingQueueRef.current = true;
          const caption = captionQueueRef.current.shift()!;
          const intent = caption.captionIntent || 'live';
      
          const counter = (overlayNameCounters.current[intent] || 0) + 1;
          overlayNameCounters.current[intent] = counter;
          const name = `${intent.charAt(0).toUpperCase() + intent.slice(1)} ${counter}`;
      
          const newCaption: AIDecision = {
            ...caption,
            id: `${Date.now()}-${Math.random()}`,
            name,
            position: caption.position || { x: 50, y: 50 },
            style: captionStyle,
          };
          setPermanentCaptions(prev => [...prev, newCaption]);
          setTimeout(() => { isProcessingQueueRef.current = false; processCaptionQueue(); }, 100);
        };

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
            const graphAiResponse = await processGraphCommand(correctedTranscript, targetGraph);
            log('AI_RESPONSE', 'Graph UPDATE response received', graphAiResponse);
            if (graphAiResponse) {
                setGraphs(prev => prev.map(g => (g.id === activeGraphId ? { ...targetGraph, ...graphAiResponse, data: (graphAiResponse.data || targetGraph.data)} : g)));
                toast.info("Graph updated.");
            }
            return;
        }

        const isGraphRelated = ["graph", "chart", "plot"].some(word => lowerTranscript.includes(word));
        if (isGraphRelated) {
            const graphAiResponse = await processGraphCommand(correctedTranscript);
            log('AI_RESPONSE', 'Graph CREATE response received', graphAiResponse);
            if (graphAiResponse && graphAiResponse.graphType && graphAiResponse.config) {
                 const counter = (overlayNameCounters.current['graph'] || 0) + 1;
                 overlayNameCounters.current['graph'] = counter;
                 const name = `Graph ${counter}`;

                const newGraph: GraphObject = {
                    id: `graph-${Date.now()}`,
                    name,
                    type: 'graph',
                    graphType: graphAiResponse.graphType,
                    data: graphAiResponse.data || [],
                    config: graphAiResponse.config,
                    position: { x: 50, y: 50 },
                    size: { width: 550, height: 400 },
                };
                setGraphs(prev => [...prev, newGraph]);
                setActiveGraphId(newGraph.id);
                toast.success("Graph created! It is now in focus for editing.");
            }
            return;
        }

        const isEditCommand = ["edit", "change", "update", "add to"].some(word => lowerTranscript.startsWith(word));
        if (isEditCommand && (permanentCaptions.length > 0 || graphs.length > 0)) {
            const allOverlays = [...permanentCaptions, ...graphs];
            const editAction = await processEditCommand(correctedTranscript, allOverlays);
            if (editAction?.targetCaptionId) {
                 const targetIsCaption = permanentCaptions.some(c => c.id === editAction.targetCaptionId);
                 if (targetIsCaption) {
                    setPermanentCaptions(prev => prev.map(cap => {
                      if (cap.id === editAction.targetCaptionId) {
                        return {...cap, formattedText: editAction.newText || cap.formattedText};
                      }
                      return cap;
                    }));
                    toast.success("Caption updated!");
                 } else {
                    setActiveGraphId(editAction.targetCaptionId);
                    toast.info(`Graph in focus for editing.`);
                 }
            }
            return;
        }
        
        const aiDecision = await formatCaptionWithAI(correctedTranscript);
        log('AI_RESPONSE', 'Caption response received', aiDecision);
        setDebugInfo((prev) => ({ ...prev, aiResponse: aiDecision, error: null }));

        if (aiDecision.decision === "HIDE") return;

        if (aiDecision.captionIntent === 'list') {
          listBufferRef.current.push(aiDecision.formattedText);
          isWaitingForListRef.current = true;
          if (listTimeoutRef.current) clearTimeout(listTimeoutRef.current);
          listTimeoutRef.current = setTimeout(() => {
            const formattedList = listBufferRef.current.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
            const listCaption: AIDecision = { ...aiDecision, formattedText: formattedList, captionIntent: 'list' };
            captionQueueRef.current.push(listCaption);
            processCaptionQueue();
            listBufferRef.current = [];
            isWaitingForListRef.current = false;
          }, 1500);
          return;
        }
        
        if (aiDecision.type === 'highlight') {
            captionQueueRef.current.push(aiDecision);
            processCaptionQueue();
        }
    } catch (error) {
        log('ERROR', 'Error in processTranscript', error);
        console.error("AI processing failed:", error);
        setDebugInfo((prev) => ({ ...prev, error: "AI processing failed." }));
        toast.error("Failed to process speech");
    }
  }, [isAiModeEnabled, permanentCaptions, graphs, activeGraphId, captionStyle, log, setDebugInfo, setPermanentCaptions, setGraphs, setActiveGraphId]);

  const handleTemplateSelect = (template: CaptionTemplate) => {
    setSelectedTemplate(template);
    const { position: _, ...stylesToApply } = template.style;
    setCaptionStyle(prev => ({ ...stylesToApply, position: prev.position }));
    if (selectedCaptionId) {
      setPermanentCaptions(caps =>
        caps.map(c => {
          if (c.id === selectedCaptionId) {
            return {
              ...c,
              style: { ...c.style!, ...stylesToApply },
            };
          }
          return c;
        })
      );
    }
  };

  const handleStyleChange = useCallback((newStyle: CaptionStyle) => {
    if (selectedCaptionId) {
      setPermanentCaptions(caps =>
        caps.map(c => c.id === selectedCaptionId ? { ...c, style: newStyle } : c)
      );
    } else {
      setCaptionStyle(newStyle);
    }
  }, [selectedCaptionId, setPermanentCaptions]);
  
  const handleCustomStyleSelect = (customStyle: Partial<CaptionStyle>) => {
    if (!selectedCaptionId) {
      toast.info("Please select an overlay on the canvas first to apply a style.");
      return;
    }

    setPermanentCaptions(caps =>
      caps.map(c => {
        if (c.id === selectedCaptionId) {
          return {
            ...c,
            style: {
              ...c.style!,
              ...customStyle,
            },
          };
        }
        return c;
      })
    );
    toast.success("Style applied to selected overlay!");
  };

  const selectedCaption = permanentCaptions.find(c => c.id === selectedCaptionId);
  const styleForSidebar = selectedCaption?.style || captionStyle;

  const isMinimized = isSidebarCollapsed && !isHoveringSidebar;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopToolbar
        captionsEnabled={captionsEnabled}
        onCaptionsToggle={setCaptionsEnabled}
        isSidebarVisible={!isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed(prev => !prev)}
        isAiModeEnabled={isAiModeEnabled}
        onAiModeToggle={setIsAiModeEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
          style={styleForSidebar}
          onStyleChange={handleStyleChange}
          width={isMinimized ? 64 : sidebarWidth}
          isCollapsed={isMinimized}
          onResize={setSidebarWidth}
          onMouseEnter={() => setIsHoveringSidebar(true)}
          onMouseLeave={() => setIsHoveringSidebar(false)}
          backgroundEffect={backgroundEffect}
          onBackgroundEffectChange={setBackgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          onBackgroundImageUrlChange={setBackgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          onAutoFramingChange={setIsAutoFramingEnabled}
          onTextSubmit={processTranscript}
          permanentCaptions={permanentCaptions}
          graphs={graphs}
          selectedCaptionId={selectedCaptionId}
          onCustomStyleSelect={handleCustomStyleSelect}
        />

        <VideoCanvas
          captionStyle={captionStyle}
          captionsEnabled={captionsEnabled}
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          permanentCaptions={permanentCaptions}
          setPermanentCaptions={setPermanentCaptions}
          selectedCaptionId={selectedCaptionId}
          setSelectedCaptionId={setSelectedCaptionId}
          backgroundEffect={backgroundEffect}
          backgroundImageUrl={backgroundImageUrl}
          isAutoFramingEnabled={isAutoFramingEnabled}
          isAiModeEnabled={isAiModeEnabled}
          graphs={graphs}
          setGraphs={setGraphs}
          activeGraphId={activeGraphId}
          setActiveGraphId={setActiveGraphId}
          onProcessTranscript={processTranscript}
        />
      </div>
    </div>
  );
};

export default Index;