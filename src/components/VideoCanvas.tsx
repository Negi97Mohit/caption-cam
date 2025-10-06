// src/components/VideoCanvas.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Webcam, VideoOff, ScreenShare, Square, ChevronUp, Check, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { SelfieSegmentation, Results as SegmentationResults } from "@mediapipe/selfie_segmentation";
import { FaceDetection, Results as FaceDetectionResults } from "@mediapipe/face_detection";
import { useBrowserSpeech } from "../hooks/useBrowserSpeech";
import { Rnd } from 'react-rnd';
import * as Babel from '@babel/standalone';
import { GeneratedOverlay } from "../types/caption";

// --- DYNAMIC CODE RENDERER ---
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
  // --- NEW: Props for tracking values ---
  zoomSensitivity: number;
  trackingSpeed: number;
}

// Helper function for linear interpolation (smoothing)
const lerp = (start: number, end: number, amount: number) => (1 - amount) * start + amount * end;

export const VideoCanvas = (props: VideoCanvasProps) => {
  const {
    captionsEnabled, onProcessTranscript, generatedOverlays, onOverlayLayoutChange, onRemoveOverlay,
    liveCaptionStyle, videoFilter, isAudioOn, onAudioToggle, isVideoOn, onVideoToggle,
    isRecording, onRecordingToggle, selectedAudioDevice, onAudioDeviceSelect,
    selectedVideoDevice, onVideoDeviceSelect,
    backgroundEffect, backgroundImageUrl, isAutoFramingEnabled,
    // --- NEW: Destructure new props ---
    zoomSensitivity,
    trackingSpeed,
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameId = useRef<number>();
  
  const [partialTranscript, setPartialTranscript] = useState("");
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  const [segmentationModel, setSegmentationModel] = useState<SelfieSegmentation | null>(null);
  const [faceDetectionModel, setFaceDetectionModel] = useState<FaceDetection | null>(null);
  const segmentationResultsRef = useRef<SegmentationResults | null>(null);
  const faceDetectionResultsRef = useRef<FaceDetectionResults | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  
  const smoothedFrameRef = useRef({ x: 0, y: 0, width: 1, height: 1 });

  useEffect(() => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    selfieSegmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.onResults((results) => {
      segmentationResultsRef.current = results;
    });
    setSegmentationModel(selfieSegmentation);

    const faceDetection = new FaceDetection({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    faceDetection.setOptions({ minDetectionConfidence: 0.5, model: 'short' });
    faceDetection.onResults((results) => {
      faceDetectionResultsRef.current = results;
    });
    setFaceDetectionModel(faceDetection);

    offscreenCanvasRef.current = document.createElement('canvas');

    return () => {
      selfieSegmentation.close();
      faceDetection.close();
    };
  }, []);

  useEffect(() => {
    if (backgroundEffect === 'image' && backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = backgroundImageUrl;
      img.onload = () => {
        backgroundImageRef.current = img;
      };
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundEffect, backgroundImageUrl]);

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

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!videoElement || !canvasElement || !offscreenCanvas || !segmentationModel || !faceDetectionModel) return;

    const ctx = canvasElement.getContext('2d');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!ctx || !offscreenCtx) return;
    
    if (smoothedFrameRef.current.width === 1) {
        smoothedFrameRef.current = { x: 0, y: 0, width: videoElement.videoWidth, height: videoElement.videoHeight };
    }

    let isProcessing = true;

    const processFrame = async () => {
      if (!isProcessing || !videoElement || videoElement.readyState < 2) {
        if (isProcessing) animationFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      if (backgroundEffect !== 'none' || isAutoFramingEnabled) {
          await Promise.all([
            backgroundEffect !== 'none' ? segmentationModel.send({ image: videoElement }) : Promise.resolve(),
            isAutoFramingEnabled ? faceDetectionModel.send({ image: videoElement }) : Promise.resolve()
          ]);
      }

      offscreenCanvas.width = videoElement.videoWidth;
      offscreenCanvas.height = videoElement.videoHeight;
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      if (backgroundEffect !== 'none' && segmentationResultsRef.current) {
        offscreenCtx.save();
        offscreenCtx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.drawImage(segmentationResultsRef.current.segmentationMask, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.globalCompositeOperation = 'destination-over';
        if (backgroundEffect === 'blur') {
            offscreenCtx.filter = 'blur(10px)';
            offscreenCtx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        } else if (backgroundEffect === 'image' && backgroundImageRef.current) {
            offscreenCtx.drawImage(backgroundImageRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        }
        offscreenCtx.restore();
      } else {
        offscreenCtx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      }
      
      // --- COMPLETELY REWRITTEN: Auto-framing logic ---
      let targetX = 0, targetY = 0, targetWidth = offscreenCanvas.width, targetHeight = offscreenCanvas.height;

      const detections = faceDetectionResultsRef.current?.detections;
      
      // Check if framing is on AND if there are any people detected
      if (isAutoFramingEnabled && detections && detections.length > 0) {
        
        // Step 1: Find the single bounding box that contains ALL detections.
        let minX = offscreenCanvas.width, minY = offscreenCanvas.height, maxX = 0, maxY = 0;
        
        detections.forEach(detection => {
          const box = detection.boundingBox;
          const realX = box.xCenter * offscreenCanvas.width - (box.width * offscreenCanvas.width / 2);
          const realY = box.yCenter * offscreenCanvas.height - (box.height * offscreenCanvas.height / 2);
          const realWidth = box.width * offscreenCanvas.width;
          const realHeight = box.height * offscreenCanvas.height;
          
          if (realX < minX) minX = realX;
          if (realY < minY) minY = realY;
          if (realX + realWidth > maxX) maxX = realX + realWidth;
          if (realY + realHeight > maxY) maxY = realY + realHeight;
        });

        const combinedWidth = maxX - minX;
        const combinedHeight = maxY - minY;
        const combinedCenterX = minX + combinedWidth / 2;
        const combinedCenterY = minY + combinedHeight / 2;

        // Step 2: Calculate the target frame size based on the combined box and zoom sensitivity.
        const targetBoxWidth = combinedWidth * zoomSensitivity;
        const targetBoxHeight = combinedHeight * zoomSensitivity;
        
        const aspectRatio = offscreenCanvas.width / offscreenCanvas.height;
        if (targetBoxWidth / targetBoxHeight > aspectRatio) {
            targetWidth = Math.min(offscreenCanvas.width, targetBoxWidth);
            targetHeight = targetWidth / aspectRatio;
        } else {
            targetHeight = Math.min(offscreenCanvas.height, targetBoxHeight);
            targetWidth = targetHeight * aspectRatio;
        }
        
        targetX = combinedCenterX - targetWidth / 2;
        targetY = combinedCenterY - targetHeight / 2;
        
        // Clamp values to stay within video bounds
        if (targetX < 0) targetX = 0;
        if (targetY < 0) targetY = 0;
        if (targetX + targetWidth > offscreenCanvas.width) targetX = offscreenCanvas.width - targetWidth;
        if (targetY + targetHeight > offscreenCanvas.height) targetY = offscreenCanvas.height - targetHeight;
      }
      
      // Step 3: Apply smoothing using the customizable tracking speed.
      // If auto-framing is turned off, the target remains the full canvas, so it will smoothly zoom out.
      smoothedFrameRef.current.x = lerp(smoothedFrameRef.current.x, targetX, trackingSpeed);
      smoothedFrameRef.current.y = lerp(smoothedFrameRef.current.y, targetY, trackingSpeed);
      smoothedFrameRef.current.width = lerp(smoothedFrameRef.current.width, targetWidth, trackingSpeed);
      smoothedFrameRef.current.height = lerp(smoothedFrameRef.current.height, targetHeight, trackingSpeed);
      
      const { x, y, width, height } = smoothedFrameRef.current;
      
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.drawImage(offscreenCanvas, x, y, width, height, 0, 0, canvasElement.width, canvasElement.height);

      if (isProcessing) animationFrameId.current = requestAnimationFrame(processFrame);
    };

    const startStream = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (!isVideoOn) {
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          return;
        }

        try {
            const audioConstraint = isAudioOn ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined } : false;
            const videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
            const stream = selectedVideoDevice === 'screen'
                ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: isAudioOn })
                : await navigator.mediaDevices.getUserMedia({ video: { ...videoConstraints, deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined }, audio: audioConstraint });
            
            streamRef.current = stream;
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                smoothedFrameRef.current = { x: 0, y: 0, width: videoElement.videoWidth, height: videoElement.videoHeight };
            };
            await videoElement.play();
            isProcessing = true;
            processFrame();
        } catch (err) {
            console.error("Failed to get media stream:", err);
            toast.error(`Error starting stream: ${err.message}`);
            onVideoToggle(false);
        }
    };
    
    startStream();
    return () => {
      isProcessing = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [
    isVideoOn, isAudioOn, selectedVideoDevice, selectedAudioDevice, onVideoToggle, 
    segmentationModel, faceDetectionModel, backgroundEffect, isAutoFramingEnabled, 
    backgroundImageUrl, zoomSensitivity, trackingSpeed // Add new props to dependency array
  ]);

  const { startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: onProcessTranscript,
    onPartialTranscript: setPartialTranscript,
  });

  useEffect(() => {
    if (isRecording && isAudioOn) startRecognition();
    else stopRecognition();
  }, [isRecording, isAudioOn, startRecognition, stopRecognition]);

  const handleStartRecording = () => {
    if (canvasRef.current) {
        const stream = canvasRef.current.captureStream(30);
        if (streamRef.current?.getAudioTracks().length > 0) {
            stream.addTrack(streamRef.current.getAudioTracks()[0]);
        }
        
        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
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
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas 
        ref={canvasRef} 
        // FIX #2: Change from object-contain to object-cover to eliminate borders
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