// src/components/VideoCanvas.tsx
import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Webcam, VideoOff, ScreenShare, Square, ChevronUp, Check, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useBrowserSpeech } from "../hooks/useBrowserSpeech";
import { useVideoStreams } from "../hooks/useVideoStreams";
import { Rnd } from 'react-rnd';
import * as Babel from '@babel/standalone';
import { GeneratedOverlay, LayoutMode, CameraShape } from "../types/caption";
import { LayoutControls } from "./LayoutControls";

const DynamicCodeRenderer = ({ overlay, onLayoutChange, onRemove, containerSize }) => {
    const [Component, setComponent] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            setError(null);
            const transformedCode = Babel.transform(overlay.componentCode, { presets: ['react'] }).code;
            const componentFunction = new Function('React', `return ${transformedCode}`);
            setComponent(() => componentFunction(React));
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
        <div className="w-full h-full p-2 bg-red-900 text-white overflow-auto">
            <h4 className="font-bold">Render Error</h4>
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
        </div>
    ) : Component ? <Component /> : <div>Loading...</div>;

    return (
        <Rnd
            size={size} position={position} minWidth={50} minHeight={50} bounds="parent"
            onDragStop={(e, d) => onLayoutChange(overlay.id, 'position', { x: (d.x / containerSize.width) * 100, y: (d.y / containerSize.height) * 100 })}
            onResizeStop={(e, dir, ref, delta, pos) => {
                onLayoutChange(overlay.id, 'size', { width: (parseInt(ref.style.width, 10) / containerSize.width) * 100, height: (parseInt(ref.style.height, 10) / containerSize.height) * 100 });
                onLayoutChange(overlay.id, 'position', { x: (pos.x / containerSize.width) * 100, y: (pos.y / containerSize.height) * 100 });
            }}
            style={{ zIndex: overlay.layout.zIndex }}
            className="flex items-center justify-center border-2 border-transparent hover:border-blue-500 hover:border-dashed group"
        >
            <div id={overlay.id} className="w-full h-full relative flex items-center justify-center">{content}</div>
            <button onClick={() => onRemove(overlay.id)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
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
  onRemoveOverlay: (id: string) => void;
  liveCaptionStyle: React.CSSProperties;
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
}

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
    ...rest
  } = props;
  
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const { cameraStream, screenStream } = useVideoStreams({
    isCameraOn: isVideoOn,
    isAudioOn: isAudioOn,
    isScreenSharing: isScreenSharing,
    selectedCameraDevice: selectedVideoDevice,
    selectedAudioDevice: selectedAudioDevice,
    onScreenShareEnd: () => setIsScreenSharing(false),
  });

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        if (cameraStream && video.srcObject !== cameraStream) {
            video.srcObject = cameraStream;
        } else if (!cameraStream && video.srcObject) {
            video.srcObject = null;
        }
    }
}, [cameraStream, rest.layoutMode]);

useEffect(() => {
    const screenVideo = screenVideoRef.current;
    if (screenVideo) {
        if (screenStream && screenVideo.srcObject !== screenStream) {
            screenVideo.srcObject = screenStream;
        } else if (!screenStream && screenVideo.srcObject) {
            screenVideo.srcObject = null;
        }
    }
}, [screenStream, rest.layoutMode]);


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const splitDividerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

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
    const container = overlayContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => setContainerSize({ width: container.clientWidth, height: container.clientHeight }));
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const { startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: rest.onProcessTranscript,
    onPartialTranscript: setPartialTranscript,
  });

  useEffect(() => {
    if (rest.isRecording && isAudioOn) startRecognition();
    else stopRecognition();
  }, [rest.isRecording, isAudioOn, startRecognition, stopRecognition]);

    const handleStartRecording = () => {
        const outputStream = new MediaStream();

        if (isScreenSharing && screenStream) {
            const screenVideoTrack = screenStream.getVideoTracks()[0];
            if (screenVideoTrack) {
                outputStream.addTrack(screenVideoTrack.clone());
            }

            const screenAudioTrack = screenStream.getAudioTracks()[0];
            if (screenAudioTrack) {
                outputStream.addTrack(screenAudioTrack.clone());
            } else if (cameraStream) {
                const cameraAudioTrack = cameraStream.getAudioTracks()[0];
                if (cameraAudioTrack) {
                    outputStream.addTrack(cameraAudioTrack.clone());
                }
            }
        } else if (cameraStream) {
            const cameraVideoTrack = cameraStream.getVideoTracks()[0];
            if (cameraVideoTrack) {
                outputStream.addTrack(cameraVideoTrack.clone());
            }

            const cameraAudioTrack = cameraStream.getAudioTracks()[0];
            if (cameraAudioTrack) {
                outputStream.addTrack(cameraAudioTrack.clone());
            }
        }

        if (outputStream.getTracks().length === 0) {
            toast.error("No stream available to record.");
            return;
        }

        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(outputStream, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
            }
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
      const container = overlayContainerRef.current;
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
    const container = overlayContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let newX = (d.x / rect.width) * 100;
    let newY = (d.y / rect.height) * 100;
    if (newX < SNAP_THRESHOLD) newX = 2;
    if (newX > 100 - rest.pipSize.width - SNAP_THRESHOLD) newX = 98 - rest.pipSize.width;
    if (newY < SNAP_THRESHOLD) newY = 2;
    if (newY > 100 - rest.pipSize.height - SNAP_THRESHOLD) newY = 98 - rest.pipSize.height;
    rest.onPipPositionChange({ x: newX, y: newY });
  };

  const handlePipResizeStop = (e: any, direction: any, ref: HTMLElement, delta: any, position: any) => {
    const container = overlayContainerRef.current;
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
      case 'circle': return { ...baseStyle, borderRadius: '50%' };
      case 'rounded': return { ...baseStyle, borderRadius: '16px' };
      case 'rectangle': default: return { ...baseStyle, borderRadius: '0' };
    }
  };

  const renderCamera = (className?: string, style?: React.CSSProperties) => (
    <video ref={videoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", className)} style={{ ...getCameraShapeStyle(), ...style }} />
  );

  const renderScreen = (className?: string) => (
      <video ref={screenVideoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", className)} />
  );

  const renderContent = () => {
    const mainContent = isScreenSharing && screenStream ? renderScreen() : (isVideoOn && cameraStream ? renderCamera() : (
      <div className="text-center text-muted-foreground">
        <Webcam className="w-24 h-24 mx-auto mb-4" />
        <p>Camera is off</p>
      </div>
    ));

    const pipContent = isScreenSharing && screenStream && isVideoOn && cameraStream && (
      <Rnd
        size={{ width: `${rest.pipSize.width}%`, height: `${rest.pipSize.height}%` }}
        position={{ x: `${rest.pipPosition.x}%`, y: `${rest.pipPosition.y}%` }}
        minWidth="10%" minHeight="10%" maxWidth="50%" maxHeight="50%"
        bounds="parent"
        onDragStop={handlePipDragStop}
        onResizeStop={handlePipResizeStop}
        className="pip-camera shadow-2xl border-2 border-white/20"
        style={{ zIndex: 100, ...getCameraShapeStyle() }}
      >
        {renderCamera("cursor-move")}
      </Rnd>
    );

    switch (rest.layoutMode) {
      case 'pip':
        return <>{mainContent}{pipContent}</>;
      case 'split-vertical':
      case 'split-horizontal':
        const isVertical = rest.layoutMode === 'split-vertical';
        return (
          <div className={cn("w-full h-full flex", isVertical ? "flex-col" : "flex-row")}>
            <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ [isVertical ? 'height' : 'width']: `${rest.splitRatio * 100}%` }}>
              {isScreenSharing && screenStream ? renderScreen() : (
                <div className="text-center text-muted-foreground">
                  <ScreenShare className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-sm">Click Share Screen to start</p>
                </div>
              )}
            </div>
            <div ref={splitDividerRef} className={cn("bg-border hover:bg-primary transition-colors flex items-center justify-center group", isVertical ? "h-2 w-full cursor-row-resize" : "w-2 h-full cursor-col-resize")} onMouseDown={handleSplitterMouseDown}>
              <div className={cn("bg-primary/50 group-hover:bg-primary rounded-full transition-colors", isVertical ? "w-12 h-1" : "w-1 h-12")} />
            </div>
            <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ [isVertical ? 'height' : 'width']: `${(1 - rest.splitRatio) * 100}%` }}>
              {isVideoOn && cameraStream ? renderCamera() : (
                <div className="text-center text-muted-foreground">
                  <Webcam className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-sm">Camera Off</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return mainContent;
    }
  };

  return (
    <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
      
      {renderContent()}

      <div className="absolute top-4 right-4 z-50">
        <LayoutControls {...rest} />
      </div>

      <div ref={overlayContainerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 200 }}>
        <div className="w-full h-full relative pointer-events-none">
          {rest.generatedOverlays.map(overlay => (
            <div key={overlay.id} className="pointer-events-auto">
              <DynamicCodeRenderer overlay={overlay} onLayoutChange={rest.onOverlayLayoutChange} onRemove={rest.onRemoveOverlay} containerSize={containerSize} />
            </div>
          ))}
        </div>
        {rest.isRecording && partialTranscript && (
          <div style={{ ...rest.liveCaptionStyle, position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 16px', borderRadius: '8px', textAlign: 'center', maxWidth: '90%', transition: 'all 0.3s ease', pointerEvents: 'none' }}>
            {partialTranscript}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 w-full flex items-center justify-center gap-4 z-50">
        <div className="flex items-center">
          <Button variant="secondary" size="icon" className="rounded-r-none h-12 w-12" onClick={() => onAudioToggle(!isAudioOn)}>
            {isAudioOn ? <Mic /> : <MicOff className="text-red-500"/>}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-l-none h-12 w-8"><ChevronUp className="w-4 h-4" /></Button>
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

        <div className="flex items-center">
          <Button variant="secondary" size="icon" className="rounded-r-none h-12 w-12" onClick={() => onVideoToggle(!isVideoOn)}>
            {isVideoOn ? <Webcam /> : <VideoOff className="text-red-500"/>}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-l-none h-12 w-8"><ChevronUp className="w-4 h-4" /></Button>
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
        
        <Button variant={isScreenSharing ? "default" : "secondary"} size="icon" className="h-12 w-12 transition-colors" onClick={handleScreenShareClick} title={isScreenSharing ? "Stop screen share" : "Share screen"}>
          <ScreenShare />
        </Button>
        
        <Button size="icon" className={cn("rounded-full h-16 w-16 transition-colors", rest.isRecording ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90")} onClick={rest.isRecording ? handleStopRecording : handleStartRecording} disabled={!cameraStream && !screenStream}>
          {rest.isRecording ? <Square /> : <Circle className="h-8 w-8 fill-current" />}
        </Button>
      </div>
    </div>
  );
};