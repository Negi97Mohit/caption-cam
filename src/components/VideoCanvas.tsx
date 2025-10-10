import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Webcam, VideoOff, ScreenShare, Square, ChevronUp, Check, Circle, RotateCcw, Sparkles, Timer, Users, Heart, ThumbsUp, CloudSun, Thermometer, Wind } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useBrowserSpeech } from "../hooks/useBrowserSpeech";
import { useVideoStreams } from "../hooks/useVideoStreams";
import { Rnd } from 'react-rnd';
import * as Babel from '@babel/standalone';
import { GeneratedOverlay, LayoutMode, CameraShape, CaptionStyle } from "../types/caption";
import { LayoutControls } from "./LayoutControls";
import { CameraRenderer } from "./CameraRenderer";
import { AICommandPopover } from "./AICommandPopover";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const DynamicCaptionRenderer = ({
  style,
  dynamicStyle,
  fullTranscript,
  interimTranscript,
}: {
  style: CaptionStyle;
  dynamicStyle: string;
  fullTranscript: string;
  interimTranscript: string;
}) => {
  const getShapeClasses = () => {
    switch (style.shape) {
      case "pill": return "rounded-full";
      case "rectangular": return "rounded-none";
      case "speech-bubble": return "rounded-2xl relative after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-full after:border-8 after:border-transparent after:border-t-current";
      case "banner": return "rounded-none w-full text-center";
      default: return "rounded-xl";
    }
  };

  const baseStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    color: style.color,
    backgroundColor: style.backgroundColor,
    textShadow: style.shadow ? "2px 2px 4px rgba(0,0,0,0.5)" : "none",
    fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
  };

  const renderContent = () => {
    const text = (fullTranscript + " " + interimTranscript).trim();
    if (!text) return null;
    const words = text.split(/\s+/);

    switch (dynamicStyle) {
      case "karaoke": {
        const finalWordCount = fullTranscript.split(/\s+/).filter(Boolean).length;
        return (
          <div style={{...baseStyle, background: 'transparent', textShadow: 'none'}}>
            {words.map((word, index) => (
              <span
                key={index}
                className="transition-colors duration-200"
                style={{
                  color: index < finalWordCount ? style.color : 'rgba(255,255,255,0.4)',
                  textShadow: index < finalWordCount ? `0 0 8px ${style.color}` : 'none'
                }}
              >
                {word}{' '}
              </span>
            ))}
          </div>
        );
      }
      case "rainbow": {
        return (
          <div>
            {text.split('').map((char, index) => (
              <span
                key={index}
                className="animate-rainbow"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {char}
              </span>
            ))}
            <style>{`
              @keyframes rainbow {
                0%, 100% { color: #ff2a2a; } 20% { color: #ff7a2a; } 40% { color: #fff52a; } 60% { color: #2aff47; } 80% { color: #2a89ff; }
              }
              .animate-rainbow { display: inline-block; animation: rainbow 3s linear infinite; }
            `}</style>
          </div>
        );
      }
      case 'pop-up': {
        return (
          <div>
            {words.map((word, index) => (
              <span key={index} className="inline-block animate-pop-up" style={{ animationDelay: `${index * 80}ms`}}>
                {word}{' '}
              </span>
            ))}
            <style>{`
              @keyframes pop-up {
                0% { opacity: 0; transform: translateY(10px) scale(0.9); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              .animate-pop-up { animation: pop-up 0.5s ease-out forwards; opacity: 0; }
            `}</style>
          </div>
        );
      }
      default: // 'none' or static
        return <span>{text}</span>;
    }
  };

  if (!fullTranscript && !interimTranscript) return null;

  return (
    <div
      className={cn("absolute px-6 py-3 max-w-[90%] transition-all duration-200", getShapeClasses())}
      style={{
        ...baseStyle,
        left: style.shape === 'banner' ? '50%' : `${style.position.x}%`,
        top: `${style.position.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {renderContent()}
    </div>
  );
};

const useFetchedData = (fetchConfig: { url: string, interval?: number } | undefined) => {
    const [jsonData, setJsonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!fetchConfig?.url) {
            setJsonData(null);
            return;
        }

        let isCancelled = false;
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(fetchConfig.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (!isCancelled) setJsonData(data);
            } catch (e) {
                if (!isCancelled) setError((e as Error).message);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        fetchData();
        const intervalId = fetchConfig.interval ? setInterval(fetchData, fetchConfig.interval * 1000) : null;

        return () => {
            isCancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [fetchConfig?.url, fetchConfig?.interval]);

    return { jsonData, isLoading, error };
};

const DynamicCodeRenderer: React.FC<{
    overlay: GeneratedOverlay;
    onLayoutChange: (id: string, key: 'position' | 'size', value: any) => void;
    onRemove: (id: string) => void;
    containerSize: { width: number; height: number };
    onStateChange: (id: string, state: any) => void;
}> = ({ overlay, onLayoutChange, onRemove, containerSize, onStateChange }) => {
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const data = useFetchedData(overlay.fetch);

    useEffect(() => {
        try {
            setError(null);
            const transformedCode = Babel.transform(overlay.componentCode, { presets: ['react'] }).code;
            const executableCode = transformedCode.trim().startsWith('()') || transformedCode.trim().startsWith('({')
                ? transformedCode
                : `({ data, onStateChange }) => { return ${transformedCode} }`;

            const componentScope = {
                React, Card, CardHeader, CardTitle, CardContent, CardFooter,
                Badge, Progress, Button,
                Timer, Mic, MicOff, Users, Heart, ThumbsUp, CloudSun, Thermometer, Wind
            };

            const componentFunction = new Function(...Object.keys(componentScope), `return ${executableCode}`);
            setComponent(() => componentFunction(...Object.values(componentScope)));
        } catch (e) {
            console.error("Component generation error:", e);
            setError((e as Error).message);
            setComponent(null);
        }
    }, [overlay.componentCode]);

    if (!containerSize.width || !containerSize.height) return null;

    const position = {
      x: (overlay.layout.position.x / 100) * containerSize.width,
      y: (overlay.layout.position.y / 100) * containerSize.height,
    };
    const size = {
      width: (overlay.layout.size.width / 100) * containerSize.width,
      height: (overlay.layout.size.height / 100) * containerSize.height,
    };

    const content = error ? (
        <div className="w-full h-full p-2 bg-red-900 text-white overflow-auto"><h4 className="font-bold">Render Error</h4><pre className="text-xs whitespace-pre-wrap">{error}</pre></div>
    ) : Component ? <Component data={data} onStateChange={(value: any) => onStateChange(overlay.id, value)} /> : <div>Loading...</div>;

    return (
        <Rnd
            size={size} position={position} minWidth={50} minHeight={50} bounds="parent"
            onDragStop={(e, d) => onLayoutChange(overlay.id, 'position', { x: (d.x / containerSize.width) * 100, y: (d.y / containerSize.height) * 100 })}
            onResizeStop={(e, direction, ref, delta, pos) => {
                const newWidth = size.width + delta.width;
                const newHeight = size.height + delta.height;
                onLayoutChange(overlay.id, 'size', { width: (newWidth / containerSize.width) * 100, height: (newHeight / containerSize.height) * 100 });
                onLayoutChange(overlay.id, 'position', { x: (pos.x / containerSize.width) * 100, y: (pos.y / containerSize.height) * 100 });
            }}
            style={{ zIndex: overlay.layout.zIndex }}
            className="flex items-center justify-center border-2 border-transparent hover:border-blue-500 hover:border-dashed group pointer-events-auto"
        >
            <div id={overlay.id} className="w-full h-full relative flex items-center justify-center">{content}</div>
            <button onClick={() => onRemove(overlay.id)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50">X</button>
        </Rnd>
    );
};

interface VideoCanvasProps {
  captionsEnabled: boolean;
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImageUrl: string | null;
  isAutoFramingEnabled: boolean;
  onProcessTranscript: (transcript: string) => void;
  generatedOverlays: GeneratedOverlay[];
  onOverlayLayoutChange: (id: string, key: 'position' | 'size', value: any) => void;
  onOverlayStateChange: (id: string, state: any) => void;
  onRemoveOverlay: (id: string) => void;
  liveCaptionStyle: React.CSSProperties;
  dynamicStyle: string;
  videoFilter: string;
  isAudioOn: boolean;
  onAudioToggle: (on: boolean) => void;
  isVideoOn: boolean;
  onVideoToggle: (on: boolean) => void;
  isRecording: boolean;
  onRecordingToggle: (on: boolean) => void;
  selectedAudioDevice: string | undefined;
  onAudioDeviceSelect: (deviceId: string) => void;
  selectedVideoDevice: string | undefined;
  onVideoDeviceSelect: (deviceId: string) => void;
  zoomSensitivity: number;
  trackingSpeed: number;
  isBeautifyEnabled: boolean;
  isLowLightEnabled: boolean;
  layoutMode: LayoutMode;
  cameraShape: CameraShape;
  splitRatio: number;
  pipPosition: { x: number; y: number };
  pipSize: { width: number; height: number };
  onLayoutModeChange: (mode: LayoutMode) => void;
  onCameraShapeChange: (shape: CameraShape) => void;
  onSplitRatioChange: (ratio: number) => void;
  onPipPositionChange: (position: { x: number; y: number }) => void;
  onPipSizeChange: (size: { width: number; height: number }) => void;
  customMaskUrl?: string;
  onCustomMaskUpload?: (file: File) => void;
  aiButtonPosition: { x: number; y: number };
  onAiButtonPositionChange: (position: { x: number; y: number }) => void;
}

const VideoPlayer: React.FC<{
    stream: MediaStream | null;
    className?: string;
    style?: React.CSSProperties;
}> = ({ stream, className, style }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay muted playsInline className={className} style={style} />;
};

const SNAP_THRESHOLD = 5;

export const VideoCanvas = (props: VideoCanvasProps) => {
  const {
    isVideoOn,
    isAudioOn,
    selectedVideoDevice,
    selectedAudioDevice,
    onVideoDeviceSelect,
    onAudioDeviceSelect,
    onVideoToggle,
    onAudioToggle,
    aiButtonPosition,
    onAiButtonPositionChange,
    ...rest
  } = props;
  
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pipContent, setPipContent] = useState<'camera' | 'screen'>('camera');
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { cameraStream, screenStream } = useVideoStreams({
    isCameraOn: isVideoOn,
    isAudioOn: isAudioOn,
    isScreenSharing: isScreenSharing,
    selectedCameraDevice: selectedVideoDevice,
    selectedAudioDevice: selectedAudioDevice,
    onScreenShareEnd: () => setIsScreenSharing(false),
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const splitDividerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [fullTranscript, setFullTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const transcriptTimerRef = useRef<NodeJS.Timeout>();

  const handleFinalTranscript = (text: string) => {
    setFullTranscript(prev => (prev + " " + text).trim());
    setInterimTranscript("");
    rest.onProcessTranscript(text);
    
    clearTimeout(transcriptTimerRef.current);
    transcriptTimerRef.current = setTimeout(() => {
        setFullTranscript("");
    }, 4000);
  };

  const { startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: handleFinalTranscript,
    onPartialTranscript: setInterimTranscript,
  });

  useEffect(() => {
    if (rest.isRecording && isAudioOn) {
      startRecognition();
    } else {
      stopRecognition();
      setFullTranscript("");
      setInterimTranscript("");
    }
  }, [rest.isRecording, isAudioOn, startRecognition, stopRecognition]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      } catch (err) {
        toast.error("Could not access camera or microphone. Please check permissions.");
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
        if (container) {
            setContainerSize({ width: container.clientWidth, height: container.clientHeight });
        }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

    const handleStartRecording = () => {
        const outputStream = new MediaStream();

        if (isScreenSharing && screenStream) {
            const screenVideoTrack = screenStream.getVideoTracks()[0];
            if (screenVideoTrack) outputStream.addTrack(screenVideoTrack.clone());

            const screenAudioTrack = screenStream.getAudioTracks()[0];
            if (screenAudioTrack) {
                outputStream.addTrack(screenAudioTrack.clone());
            } else if (cameraStream) {
                const cameraAudioTrack = cameraStream.getAudioTracks()[0];
                if (cameraAudioTrack) outputStream.addTrack(cameraAudioTrack.clone());
            }
        } else if (cameraStream) {
            const cameraVideoTrack = cameraStream.getVideoTracks()[0];
            if (cameraVideoTrack) outputStream.addTrack(cameraVideoTrack.clone());

            const cameraAudioTrack = cameraStream.getAudioTracks()[0];
            if (cameraAudioTrack) outputStream.addTrack(cameraAudioTrack.clone());
        }

        if (outputStream.getTracks().length === 0) {
            toast.error("No stream available to record.");
            return;
        }

        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(outputStream, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gaki-recording-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Recording downloaded!");
        };
        mediaRecorderRef.current.start();
        rest.onRecordingToggle(true);
        toast.info("Recording started!");
    };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    rest.onRecordingToggle(false);
  };

  const handleScreenShareClick = () => {
    setIsScreenSharing(prev => !prev);
  };

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = canvasContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let ratio: number;
      if (rest.layoutMode === 'split-vertical') {
        ratio = (e.clientY - rect.top) / rect.height;
      } else {
        ratio = (e.clientX - rect.left) / rect.width;
      }
      ratio = Math.max(0.2, Math.min(0.8, ratio));
      rest.onSplitRatioChange(ratio);
    };
    const handleMouseUp = () => setIsDraggingSplitter(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter, rest.layoutMode, rest.onSplitRatioChange]);

  const handlePipDragStop = (e: any, d: { x: number; y: number }) => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let newX = (d.x / rect.width) * 100;
    let newY = (d.y / rect.height) * 100;

    const pipWidthPercent = rest.pipSize.width;
    const pipHeightPercent = rest.pipSize.height;
    if (newX < SNAP_THRESHOLD) newX = 2;
    if (newX > 100 - pipWidthPercent - SNAP_THRESHOLD) newX = 98 - pipWidthPercent;
    if (newY < SNAP_THRESHOLD) newY = 2;
    if (newY > 100 - pipHeightPercent - SNAP_THRESHOLD) newY = 98 - pipHeightPercent;

    rest.onPipPositionChange({ x: newX, y: newY });
};

const handlePipResizeStop = (e: any, direction: any, ref: HTMLElement, delta: any, position: any) => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newWidth = (parseInt(ref.style.width, 10) / rect.width) * 100;
    const newHeight = (parseInt(ref.style.height, 10) / rect.height) * 100;
    const newX = (position.x / rect.width) * 100;
    const newY = (position.y / rect.height) * 100;
    
    rest.onPipSizeChange({ width: Math.max(10, Math.min(50, newWidth)), height: Math.max(10, Math.min(50, newHeight)) });
    rest.onPipPositionChange({ x: newX, y: newY });
};

  const getCameraShapeStyle = () => {
    const baseStyle: React.CSSProperties = { overflow: 'hidden' };
    if (rest.customMaskUrl) {
      return { ...baseStyle, maskImage: `url(${rest.customMaskUrl})`, WebkitMaskImage: `url(${rest.customMaskUrl})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' };
    }
    switch (rest.cameraShape) {
      case 'circle': return { ...baseStyle, borderRadius: '50%'};
      case 'rounded': return { ...baseStyle, borderRadius: '16px' };
      case 'rectangle': default: return { ...baseStyle, borderRadius: '0' };
    }
  };

  const getVideoFilterStyle = (): string => {
    const filters: string[] = [];
    if (rest.videoFilter && rest.videoFilter !== 'none') filters.push(rest.videoFilter);
    if (rest.isBeautifyEnabled) filters.push('blur(0.5px) saturate(1.1) brightness(1.05)');
    if (rest.isLowLightEnabled) filters.push('brightness(1.3) contrast(1.15)');
    return filters.length > 0 ? filters.join(' ') : 'none';
  };

  const videoFilterString = getVideoFilterStyle();

  const renderCamera = (className?: string, style?: React.CSSProperties, isPip: boolean = false) => (
    <div className={cn("w-full h-full", className, isPip && rest.cameraShape === 'circle' && 'aspect-square')} style={getCameraShapeStyle()}>
        {(rest.backgroundEffect !== 'none' || rest.isAutoFramingEnabled) ? (
          <CameraRenderer stream={cameraStream} backgroundEffect={rest.backgroundEffect} backgroundImageUrl={rest.backgroundImageUrl} isAutoFramingEnabled={rest.isAutoFramingEnabled} zoomSensitivity={rest.zoomSensitivity} trackingSpeed={rest.trackingSpeed} className="w-full h-full" style={{ ...style, filter: videoFilterString }} />
        ) : (
          <VideoPlayer stream={cameraStream} className="w-full h-full object-cover" style={{ ...style, filter: videoFilterString }} />
        )}
    </div>
  );

  const renderScreen = (className?: string) => (
      <VideoPlayer stream={screenStream} className={cn("w-full h-full object-cover", className)} style={{ filter: videoFilterString }} />
  );

  const renderContent = () => {
    const mainIsCamera = (pipContent === 'screen' && isScreenSharing && screenStream) || (!isScreenSharing);
    const mainContent = mainIsCamera ? renderCamera() : renderScreen();
    const pipVideo = pipContent === 'camera' ? renderCamera("cursor-move", {}, true) : renderScreen("cursor-move");

    const pipSizePx = { width: (containerSize.width * rest.pipSize.width) / 100, height: (containerSize.height * rest.pipSize.height) / 100 };
    const pipPositionPx = { x: (containerSize.width * rest.pipPosition.x) / 100, y: (containerSize.height * rest.pipPosition.y) / 100 };

    const pipContentEl = isScreenSharing && screenStream && isVideoOn && cameraStream && containerSize.width > 0 && (
        <Rnd size={pipSizePx} position={pipPositionPx} minWidth={containerSize.width * 0.1} minHeight={containerSize.height * 0.1} maxWidth={containerSize.width * 0.5} maxHeight={containerSize.height * 0.5} bounds="parent" onDragStop={handlePipDragStop} onResizeStop={handlePipResizeStop} className="pointer-events-auto" style={{ zIndex: 210 }}>
            <div className="w-full h-full relative group">
                {pipVideo}
                <Button size="icon" variant="secondary" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setPipContent(pipContent === 'camera' ? 'screen' : 'camera')}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
        </Rnd>
    );

    const getBackgroundStyle = (): React.CSSProperties => {
      const style: React.CSSProperties = {};
      if (rest.backgroundEffect === 'blur') { style.backdropFilter = 'blur(10px)'; style.WebkitBackdropFilter = 'blur(10px)'; }
      if (rest.backgroundEffect === 'image' && rest.backgroundImageUrl) { style.backgroundImage = `url(${rest.backgroundImageUrl})`; style.backgroundSize = 'cover'; style.backgroundPosition = 'center'; }
      return style;
    };

    const contentWithBackground = (
      <div className="w-full h-full relative" style={getBackgroundStyle()}>
        {rest.backgroundEffect === 'image' && rest.backgroundImageUrl && (<div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${rest.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', }} />)}
        <div className="relative w-full h-full" style={rest.backgroundEffect === 'blur' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } : {}}>{mainContent}</div>
        {pipContentEl}
      </div>
    );

    switch (rest.layoutMode) {
      case 'pip': return contentWithBackground;
      case 'split-vertical':
      case 'split-horizontal':
        const isVertical = rest.layoutMode === 'split-vertical';
        return (
          <div className={cn("w-full h-full flex", isVertical ? "flex-col" : "flex-row")}>
            <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ [isVertical ? 'height' : 'width']: `${rest.splitRatio * 100}%` }}>
              {isScreenSharing && screenStream ? renderScreen() : (<div className="text-center text-muted-foreground"><ScreenShare className="w-16 h-16 mx-auto mb-2" /><p className="text-sm">Click Share Screen to start</p></div>)}
            </div>
            <div ref={splitDividerRef} className={cn("bg-border hover:bg-primary transition-colors flex items-center justify-center group", isVertical ? "h-2 w-full cursor-row-resize" : "w-2 h-full cursor-col-resize")} onMouseDown={handleSplitterMouseDown}>
              <div className={cn("bg-primary/50 group-hover:bg-primary rounded-full transition-colors", isVertical ? "w-12 h-1" : "w-1 h-12")} />
            </div>
            <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ [isVertical ? 'height' : 'width']: `${(1 - rest.splitRatio) * 100}%` }}>
              {isVideoOn && cameraStream ? (<div className="w-full h-full relative" style={getBackgroundStyle()}>{rest.backgroundEffect === 'image' && rest.backgroundImageUrl && (<div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${rest.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', }} />)}<div className="relative w-full h-full">{renderCamera()}</div></div>) : (<div className="text-center text-muted-foreground"><Webcam className="w-16 h-16 mx-auto mb-2" /><p className="text-sm">Camera Off</p></div>)}
            </div>
          </div>
        );
      default: return contentWithBackground;
    }
  };

  return (
    <div ref={canvasContainerRef} className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
      {renderContent()}
      <div className="absolute top-4 right-4 z-50"> <LayoutControls {...rest} /> </div>
      <div ref={overlayContainerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 220 }}>
        <div className="w-full h-full relative">
          {rest.generatedOverlays.map(overlay => (
            <DynamicCodeRenderer key={overlay.id} overlay={overlay} onLayoutChange={rest.onOverlayLayoutChange} onRemove={rest.onRemoveOverlay} containerSize={containerSize} onStateChange={rest.onOverlayStateChange} />
          ))}
          {rest.captionsEnabled && (
            <DynamicCaptionRenderer
              style={rest.liveCaptionStyle}
              dynamicStyle={rest.dynamicStyle}
              fullTranscript={fullTranscript}
              interimTranscript={interimTranscript}
            />
          )}
        </div>
      </div>
      
      {containerSize.width > 0 && (
        <Rnd style={{ zIndex: 250 }} size={{ width: 64, height: 64 }} position={{ x: (aiButtonPosition.x / 100) * containerSize.width, y: (aiButtonPosition.y / 100) * containerSize.height, }} onDragStop={(e, d) => onAiButtonPositionChange({ x: (d.x / containerSize.width) * 100, y: (d.y / containerSize.height) * 100 })} bounds="parent" enableResizing={false} className="pointer-events-auto">
          <AICommandPopover onSubmit={rest.onProcessTranscript}>
            <Button size="icon" className="rounded-full h-16 w-16 shadow-lg bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-8 w-8" />
            </Button>
          </AICommandPopover>
        </Rnd>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border rounded-full px-4 py-2 shadow-lg">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => onAudioToggle(!isAudioOn)}>
              {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-500"/>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><ChevronUp className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {audioDevices.map((device, i) => (
                  <DropdownMenuItem key={device.deviceId} onClick={() => onAudioDeviceSelect(device.deviceId)}>
                    {device.deviceId === selectedAudioDevice && <Check className="w-4 h-4 mr-2"/>}
                    {device.label || `Microphone ${i + 1}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => onVideoToggle(!isVideoOn)}>
              {isVideoOn ? <Webcam className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-red-500"/>}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><ChevronUp className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {videoDevices.map((device, i) => (
                  <DropdownMenuItem key={device.deviceId} onClick={() => onVideoDeviceSelect(device.deviceId)}>
                    {device.deviceId === selectedVideoDevice && <Check className="w-4 h-4 mr-2"/>}
                    {device.label || `Camera ${i + 1}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="w-px h-8 bg-border" />
          <Button variant="ghost" size="icon" className={cn("rounded-full h-10 w-10 transition-colors", isScreenSharing && "bg-primary/20")} onClick={handleScreenShareClick} title={isScreenSharing ? "Stop screen share" : "Share screen"}>
            <ScreenShare className="h-5 w-5" />
          </Button>
          <div className="w-px h-8 bg-border" />
          <Button size="icon" className={cn("rounded-full h-12 w-12 transition-colors", rest.isRecording ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90")} onClick={rest.isRecording ? handleStopRecording : handleStartRecording} disabled={!cameraStream && !screenStream}>
            {rest.isRecording ? <Square className="h-6 w-6" /> : <Circle className="h-6 w-6 fill-current" />}
          </Button>
        </div>
      </div>
    </div>
  );
};