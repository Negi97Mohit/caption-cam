import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Webcam, ScreenShare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";
import { FaceDetection } from "@mediapipe/face_detection";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { Rnd } from 'react-rnd';
import * as Babel from '@babel/standalone';
import { GeneratedOverlay } from "@/pages/Index";

// --- DYNAMIC CODE RENDERER COMPONENT ---
const DynamicCodeRenderer = ({ overlay, onLayoutChange, onRemove }) => {
    const [Component, setComponent] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            setError(null);
            // Transpile JSX code string into standard JS using Babel Standalone
            const transformedCode = Babel.transform(overlay.componentCode, { presets: ['react'] }).code;
            // Safely create the component function from the transpiled code
            const componentFunction = new Function('React', `return ${transformedCode}`);
            setComponent(() => componentFunction(React));
        } catch (e) {
            console.error("Component generation error:", e);
            setError(e.message);
            setComponent(null);
        }
    }, [overlay.componentCode]);
    
    const content = error ? (
        <div className="w-full h-full p-2 bg-red-900 text-white overflow-auto">
            <h4 className="font-bold">Render Error</h4>
            <pre className="text-xs whitespace-pre-wrap">{error}</pre>
        </div>
    ) : Component ? <Component /> : <div>Loading...</div>;

    return (
        <Rnd
            default={{ 
              x: overlay.layout.position.x, 
              y: overlay.layout.position.y,
              width: overlay.layout.size.width,
              height: overlay.layout.size.height
            }}
            minWidth={50} minHeight={50} bounds="parent"
            onDragStop={(e, d) => onLayoutChange(overlay.id, 'position', { x: d.x, y: d.y })}
            onResizeStop={(e, dir, ref, delta, pos) => {
                onLayoutChange(overlay.id, 'size', { width: ref.style.width, height: ref.style.height });
                onLayoutChange(overlay.id, 'position', pos);
            }}
            style={{ zIndex: overlay.layout.zIndex }}
            className="flex items-center justify-center border-2 border-transparent hover:border-blue-500 hover:border-dashed group bg-black/10"
        >
            {content}
            <button
                onClick={() => onRemove(overlay.id)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
                X
            </button>
        </Rnd>
    );
};

interface VideoCanvasProps {
  captionsEnabled: boolean;
  recordingMode: "webcam" | "screen" | "both";
  onRecordingModeChange: (mode: "webcam" | "screen" | "both") => void;
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImageUrl: string | null;
  isAutoFramingEnabled: boolean;
  onProcessTranscript: (transcript: string) => void;
  generatedOverlays: GeneratedOverlay[];
  onOverlayLayoutChange: (id: string, key: 'position' | 'size', value: any) => void;
  onRemoveOverlay: (id: string) => void;
  liveCaptionStyle: React.CSSProperties;
  videoFilter: string;
}

export const VideoCanvas = ({
  captionsEnabled,
  recordingMode,
  onRecordingModeChange,
  backgroundEffect,
  backgroundImageUrl,
  isAutoFramingEnabled,
  onProcessTranscript,
  generatedOverlays,
  onOverlayLayoutChange,
  onRemoveOverlay,
  liveCaptionStyle,
  videoFilter
}: VideoCanvasProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const selfieSegmentation = useRef<SelfieSegmentation | null>(null);
  const faceDetection = useRef<FaceDetection | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (backgroundEffect === 'image' && backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = backgroundImageUrl;
      img.onload = () => { backgroundImageRef.current = img; };
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundEffect, backgroundImageUrl]);

  useEffect(() => {
    const segmentation = new SelfieSegmentation({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    segmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.current = segmentation;

    const detection = new FaceDetection({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}` });
    detection.setOptions({ minDetectionConfidence: 0.5, model: 'short' });
    faceDetection.current = detection;

    return () => {
      segmentation.close();
      detection.close();
    }
  }, []);

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
      }
      if (backgroundEffect !== 'none' && selfieSegmentation.current) {
        await selfieSegmentation.current.send({ image: videoElement });
      } else {
        ctx.save();
        if (isAutoFramingEnabled) {
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

    if (selfieSegmentation.current) {
      selfieSegmentation.current.onResults((results) => {
        if (!ctx || !canvasElement) return;
        ctx.save();
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        if (isAutoFramingEnabled) {
          const scale = 1 / lastFacePosition.width;
          const x = (-lastFacePosition.x * canvasElement.width * scale) + (canvasElement.width / 2);
          const y = (-lastFacePosition.y * canvasElement.height * scale) + (canvasElement.height / 2);
          ctx.setTransform(scale, 0, 0, scale, x, y);
        }
        ctx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        ctx.globalCompositeOperation = 'destination-over';
        if (backgroundEffect === 'blur') {
          ctx.filter = 'blur(8px)';
          ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        } else if (backgroundEffect === 'image' && backgroundImageRef.current) {
          ctx.drawImage(backgroundImageRef.current, 0, 0, canvasElement.width, canvasElement.height);
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        ctx.restore();
      });
    }

    if (faceDetection.current) {
      faceDetection.current.onResults((results) => {
        if (!isAutoFramingEnabled || !results.detections.length) {
          lastFacePosition = { x: 0.5, y: 0.5, width: 0.5 };
          return;
        }
        const detection = results.detections[0].boundingBox;
        const target = { x: detection.xCenter, y: detection.yCenter, width: Math.max(detection.width, detection.height) * 2.5 };
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

  const handleFinalTranscript = useCallback((transcript: string) => {
    onProcessTranscript(transcript);
    setPartialTranscript("");
  }, [onProcessTranscript]);

  const handlePartialTranscript = useCallback((partial: string) => {
    setPartialTranscript(partial);
  }, []);

  const { isRecording, startRecognition, stopRecognition } = useBrowserSpeech({
    onFinalTranscript: handleFinalTranscript,
    onPartialTranscript: handlePartialTranscript,
  });
  
  const baseLiveCaptionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '8%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    textAlign: 'center',
    maxWidth: '90%',
    transition: 'all 0.3s ease',
  };

  return (
    <div className="flex-1 relative bg-black overflow-hidden">
      <video ref={videoRef} className="hidden" autoPlay muted playsInline />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        style={{ filter: videoFilter }}
      />
      <div className="absolute inset-0">
        {captionsEnabled && generatedOverlays.map(overlay => (
          <DynamicCodeRenderer
            key={overlay.id}
            overlay={overlay}
            onLayoutChange={onOverlayLayoutChange}
            onRemove={onRemoveOverlay}
          />
        ))}
        {isRecording && partialTranscript && (
          <div style={{ ...baseLiveCaptionStyle, ...liveCaptionStyle }}>
            {partialTranscript}
          </div>
        )}
      </div>
      <div className={cn("absolute bottom-6 w-full flex items-center justify-center gap-3 transition-all duration-300", areControlsVisible || !isRecording ? "opacity-100" : "opacity-0")}>
        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-black/30 backdrop-blur-sm" onClick={() => onRecordingModeChange("webcam")} disabled={isRecording}>
          <Webcam />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-black/30 backdrop-blur-sm" onClick={() => onRecordingModeChange("screen")} disabled={isRecording}>
          <ScreenShare />
        </Button>
        {!isRecording ? (
          <Button size="icon" className="bg-red-600 hover:bg-red-700 rounded-full h-16 w-16" onClick={startRecognition}>
            <Mic />
          </Button>
        ) : (
          <Button size="icon" className="bg-primary rounded-full h-16 w-16" onClick={stopRecognition}>
            <Square />
          </Button>
        )}
      </div>
    </div>
  );
};