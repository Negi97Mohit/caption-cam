import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Webcam, VideoOff, ScreenShare, Square, ChevronUp, Check, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { FaceDetection } from "@mediapipe/face_detection";
import { useBrowserSpeech } from "../hooks/useBrowserSpeech";
import { Rnd } from 'react-rnd';
import * as Babel from '@babel/standalone';
import { GeneratedOverlay } from "../types/caption";

// --- DYNAMIC CODE RENDERER (No changes) ---
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
            setError(e.message);
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

// --- MAIN COMPONENT ---
interface VideoCanvasProps {
  // All props are unchanged
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
}

export const VideoCanvas = (props: VideoCanvasProps) => {
  const {
    captionsEnabled, onProcessTranscript, generatedOverlays, onOverlayLayoutChange, onRemoveOverlay,
    liveCaptionStyle, videoFilter, isAudioOn, onAudioToggle, isVideoOn, onVideoToggle,
    isRecording, onRecordingToggle, selectedAudioDevice, onAudioDeviceSelect,
    selectedVideoDevice, onVideoDeviceSelect
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameId = useRef<number>();
  
  const [partialTranscript, setPartialTranscript] = useState("");
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const container = overlayContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => setContainerSize({ width: container.clientWidth, height: container.clientHeight }));
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

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

  // --- CORE LOGIC FIX ---
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (!videoElement || !canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Function to draw video to canvas
    const processFrame = () => {
        if (videoElement.readyState >= 2) { // Check if video has enough data
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }
        animationFrameId.current = requestAnimationFrame(processFrame);
    };

    // Event listener to start drawing when video is ready
    const handleCanPlay = () => {
        videoElement.play();
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        animationFrameId.current = requestAnimationFrame(processFrame);
    };

    const stopCurrentStream = () => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        videoElement.srcObject = null;
        videoElement.removeEventListener('canplay', handleCanPlay);
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    };

    const startStream = async () => {
        stopCurrentStream();
        if (!isVideoOn) return;

        try {
            const audioConstraint = isAudioOn ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined } : false;
            const videoConstraints = {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            };
            
            let stream;
            if (selectedVideoDevice === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: isAudioOn });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }, audio: audioConstraint });
            }
            
            streamRef.current = stream;
            videoElement.srcObject = stream;
            videoElement.addEventListener('canplay', handleCanPlay);

        } catch (err) {
            console.error("Failed to get media stream:", err);
            toast.error(`Error starting stream: ${err.message}`);
            onVideoToggle(false);
        }
    };
    
    startStream();
    return () => stopCurrentStream();

  }, [isVideoOn, isAudioOn, selectedVideoDevice, selectedAudioDevice, onVideoToggle]);

  const { startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: onProcessTranscript,
    onPartialTranscript: setPartialTranscript,
  });

  useEffect(() => {
    if (isRecording && isAudioOn) startRecognition();
    else stopRecognition();
  }, [isRecording, isAudioOn, startRecognition, stopRecognition]);

  const handleStartRecording = () => {
    if (streamRef.current) {
        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp9' });
        mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
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
        onRecordingToggle(true);
        toast.info("Recording started!");
    } else {
        toast.error("No video stream available to record.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    onRecordingToggle(false);
  };

  const handleScreenShareClick = () => {
    onVideoDeviceSelect('screen');
    if (!isVideoOn) onVideoToggle(true);
  };
  
  const baseLiveCaptionStyle: React.CSSProperties = {
      position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 16px', borderRadius: '8px',
      textAlign: 'center', maxWidth: '90%', transition: 'all 0.3s ease',
  };

  return (
    <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
      {/* Video element is now completely hidden, canvas is the source of truth */}
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas 
        ref={canvasRef} 
        className={cn("w-full h-full object-cover transition-opacity duration-300", !isVideoOn && "opacity-0")}
        style={{ filter: videoFilter }}
      />
       {!isVideoOn && (
        <div className="absolute text-center text-muted-foreground">
            <Webcam className="w-24 h-24 mx-auto mb-4" />
            <p>Your camera is off</p>
        </div>
      )}
      <div ref={overlayContainerRef} className="absolute inset-0">
         {generatedOverlays.map(overlay => (
            <DynamicCodeRenderer key={overlay.id} overlay={overlay} onLayoutChange={onOverlayLayoutChange} onRemove={onRemoveOverlay} containerSize={containerSize} />
        ))}
        {isRecording && partialTranscript && ( <div style={{ ...baseLiveCaptionStyle, ...liveCaptionStyle }}>{partialTranscript}</div> )}
      </div>

      <div className="absolute bottom-6 w-full flex items-center justify-center gap-4">
        {/* Audio Controls */}
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

        {/* Video Controls */}
        <div className="flex items-center">
            <Button variant="secondary" size="icon" className="rounded-r-none h-12 w-12" onClick={() => onVideoToggle(!isVideoOn)}>
                {isVideoOn && selectedVideoDevice !== 'screen' ? <Webcam /> : <VideoOff className="text-red-500"/>}
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="secondary" size="icon" className="rounded-l-none h-12 w-8"><ChevronUp className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {videoDevices.map((device, i) => (
                        <DropdownMenuItem key={device.deviceId} onClick={() => onVideoDeviceSelect(device.deviceId)}>
                            {device.deviceId === selectedVideoDevice && selectedVideoDevice !== 'screen' && <Check className="w-4 h-4 mr-2"/>}
                            {device.label || `Camera ${i + 1}`}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        
        {/* Screen Share Button */}
        <Button 
            variant="secondary" 
            size="icon" 
            className={cn("h-12 w-12", selectedVideoDevice === 'screen' && "bg-primary text-primary-foreground")}
            onClick={handleScreenShareClick}
        >
            <ScreenShare />
        </Button>

        {/* Recording Button */}
        <Button 
            size="icon" 
            className={cn("rounded-full h-16 w-16 transition-colors", isRecording ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90")}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={!isVideoOn}
        >
            {isRecording ? <Square /> : <Circle className="h-8 w-8 fill-current" />}
        </Button>
      </div>
    </div>
  );
};