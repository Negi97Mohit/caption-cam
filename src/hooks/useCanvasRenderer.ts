// src/hooks/useCanvasRenderer.ts
import { useEffect, useRef, useCallback } from 'react';
import { SelfieSegmentation, Results as SegmentationResults } from "@mediapipe/selfie_segmentation";
import { FaceDetection, Results as FaceDetectionResults } from "@mediapipe/face_detection";

interface UseCanvasRendererProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  screenVideoRef: React.RefObject<HTMLVideoElement>;
  selectedVideoDevice: string | undefined;
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImageUrl: string | null;
  isAutoFramingEnabled: boolean;
  zoomSensitivity: number;
  trackingSpeed: number;
  isBeautifyEnabled: boolean;
  isLowLightEnabled: boolean;
}

const lerp = (start: number, end: number, amount: number) => (1 - amount) * start + amount * end;

export const useCanvasRenderer = ({
  videoRef,
  screenVideoRef,
  selectedVideoDevice,
  backgroundEffect,
  backgroundImageUrl,
  isAutoFramingEnabled,
  zoomSensitivity,
  trackingSpeed,
  isBeautifyEnabled,
  isLowLightEnabled,
}: UseCanvasRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const segmentationModelRef = useRef<SelfieSegmentation | null>(null);
  const faceDetectionModelRef = useRef<FaceDetection | null>(null);
  const segmentationResultsRef = useRef<SegmentationResults | null>(null);
  const faceDetectionResultsRef = useRef<FaceDetectionResults | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const smoothedFrameRef = useRef({ x: 0, y: 0, width: 1, height: 1 });
  const animationFrameId = useRef<number>();

  // Initialize MediaPipe models
  useEffect(() => {
    console.log("🔧 Initializing MediaPipe models...");
    
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    selfieSegmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.onResults((results) => {
      segmentationResultsRef.current = results;
    });
    segmentationModelRef.current = selfieSegmentation;

    const faceDetection = new FaceDetection({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    faceDetection.setOptions({ minDetectionConfidence: 0.5, model: 'short' });
    faceDetection.onResults((results) => {
      faceDetectionResultsRef.current = results;
    });
    faceDetectionModelRef.current = faceDetection;

    offscreenCanvasRef.current = document.createElement('canvas');
    console.log("✅ MediaPipe models initialized");

    return () => {
      console.log("🧹 Cleaning up MediaPipe models");
      selfieSegmentation.close();
      faceDetection.close();
    };
  }, []);

  // Load background image
  useEffect(() => {
    if (backgroundEffect === 'image' && backgroundImageUrl) {
      console.log("🖼️ Loading background image:", backgroundImageUrl);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = backgroundImageUrl;
      img.onload = () => {
        backgroundImageRef.current = img;
        console.log("✅ Background image loaded");
      };
    } else {
      backgroundImageRef.current = null;
    }
  }, [backgroundEffect, backgroundImageUrl]);

  // Process video frame with effects
  const processVideoFrame = useCallback((
    videoElement: HTMLVideoElement, 
    canvasElement: HTMLCanvasElement, 
    offscreenCanvas: HTMLCanvasElement
  ) => {
    const ctx = canvasElement.getContext('2d');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!ctx || !offscreenCtx || videoElement.readyState < 2) return;

    offscreenCanvas.width = videoElement.videoWidth;
    offscreenCanvas.height = videoElement.videoHeight;
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Apply background effect
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
    
    // Apply image filters
    if (isBeautifyEnabled || isLowLightEnabled) {
      const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      const data = imageData.data;

      if (isLowLightEnabled) {
        const brightnessFactor = 1.3;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * brightnessFactor);
          data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor);
          data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor);
        }
      }

      if (isBeautifyEnabled) {
        const tempImageData = new Uint8ClampedArray(data);
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < offscreenCanvas.height; y++) {
          for (let x = 0; x < offscreenCanvas.width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            
            for (let ky = -halfKernel; ky <= halfKernel; ky++) {
              for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                const pixelY = y + ky;
                const pixelX = x + kx;
                
                if (pixelY >= 0 && pixelY < offscreenCanvas.height && pixelX >= 0 && pixelX < offscreenCanvas.width) {
                  const offset = (pixelY * offscreenCanvas.width + pixelX) * 4;
                  r += tempImageData[offset];
                  g += tempImageData[offset + 1];
                  b += tempImageData[offset + 2];
                  count++;
                }
              }
            }
            
            const destOffset = (y * offscreenCanvas.width + x) * 4;
            data[destOffset] = r / count;
            data[destOffset + 1] = g / count;
            data[destOffset + 2] = b / count;
          }
        }
      }

      offscreenCtx.putImageData(imageData, 0, 0);
    }

    // Apply auto-framing
    let targetX = 0, targetY = 0, targetWidth = offscreenCanvas.width, targetHeight = offscreenCanvas.height;
    const detections = faceDetectionResultsRef.current?.detections;
    
    if (isAutoFramingEnabled && detections && detections.length > 0) {
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
      
      if (targetX < 0) targetX = 0;
      if (targetY < 0) targetY = 0;
      if (targetX + targetWidth > offscreenCanvas.width) targetX = offscreenCanvas.width - targetWidth;
      if (targetY + targetHeight > offscreenCanvas.height) targetY = offscreenCanvas.height - targetHeight;
    }
    
    // Smooth transitions
    smoothedFrameRef.current.x = lerp(smoothedFrameRef.current.x, targetX, trackingSpeed);
    smoothedFrameRef.current.y = lerp(smoothedFrameRef.current.y, targetY, trackingSpeed);
    smoothedFrameRef.current.width = lerp(smoothedFrameRef.current.width, targetWidth, trackingSpeed);
    smoothedFrameRef.current.height = lerp(smoothedFrameRef.current.height, targetHeight, trackingSpeed);
    
    const { x, y, width, height } = smoothedFrameRef.current;
    
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(offscreenCanvas, x, y, width, height, 0, 0, canvasElement.width, canvasElement.height);
  }, [backgroundEffect, isAutoFramingEnabled, zoomSensitivity, trackingSpeed, isBeautifyEnabled, isLowLightEnabled]);

  // Camera canvas rendering loop
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    
    if (!videoElement || !canvasElement || !offscreenCanvas) {
      console.log("❌ Missing elements for camera rendering");
      return;
    }
    
    if (!segmentationModelRef.current || !faceDetectionModelRef.current) {
      console.log("❌ Models not ready");
      return;
    }

    console.log("🎬 Setting up camera rendering loop");

    const ctx = canvasElement.getContext('2d');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!ctx || !offscreenCtx) return;

    ctx.imageSmoothingQuality = 'high';
    offscreenCtx.imageSmoothingQuality = 'high';

    let isProcessing = false;

    const processFrame = async () => {
      if (!isProcessing) return;
      
      if (videoElement.readyState < 2) {
        animationFrameId.current = requestAnimationFrame(processFrame);
        return;
      }
      
      // Run MediaPipe models if needed
      if (backgroundEffect !== 'none' || isAutoFramingEnabled) {
        await Promise.all([
          backgroundEffect !== 'none' ? segmentationModelRef.current!.send({ image: videoElement }) : Promise.resolve(),
          isAutoFramingEnabled ? faceDetectionModelRef.current!.send({ image: videoElement }) : Promise.resolve()
        ]);
      }
      
      processVideoFrame(videoElement, canvasElement, offscreenCanvas);
      animationFrameId.current = requestAnimationFrame(processFrame);
    };
    
    const onPlay = () => {
      console.log("▶️ Camera canvas rendering started");
      isProcessing = true;
      smoothedFrameRef.current = { 
        x: 0, y: 0, 
        width: videoElement.videoWidth, 
        height: videoElement.videoHeight 
      };
      animationFrameId.current = requestAnimationFrame(processFrame);
    };

    const onPause = () => {
      console.log("⏸️ Camera canvas rendering paused");
      isProcessing = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    
    videoElement.addEventListener("play", onPlay);
    videoElement.addEventListener("pause", onPause);

    // Start if already playing
    if (!videoElement.paused) {
      onPlay();
    }

    return () => {
      videoElement.removeEventListener("play", onPlay);
      videoElement.removeEventListener("pause", onPause);
      isProcessing = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [videoRef.current, canvasRef.current, processVideoFrame, backgroundEffect, isAutoFramingEnabled]);

  // Screen canvas rendering loop
  useEffect(() => {
    if (selectedVideoDevice !== 'screen') return;

    const screenVideo = screenVideoRef.current;
    const screenCanvas = screenCanvasRef.current;
    
    if (!screenVideo || !screenCanvas) {
      console.log("❌ Missing elements for screen rendering");
      return;
    }

    console.log("🎬 Setting up screen rendering loop");

    const ctx = screenCanvas.getContext('2d');
    if (!ctx) return;

    let isProcessing = false;
    let frameId: number;

    const processScreenFrame = () => {
      if (!isProcessing) return;
      
      if (screenVideo.readyState < 2) {
        frameId = requestAnimationFrame(processScreenFrame);
        return;
      }

      screenCanvas.width = screenVideo.videoWidth;
      screenCanvas.height = screenVideo.videoHeight;
      ctx.drawImage(screenVideo, 0, 0, screenCanvas.width, screenCanvas.height);
      frameId = requestAnimationFrame(processScreenFrame);
    };

    const onPlay = () => {
      console.log("▶️ Screen canvas rendering started");
      isProcessing = true;
      frameId = requestAnimationFrame(processScreenFrame);
    };

    const onPause = () => {
      console.log("⏸️ Screen canvas rendering paused");
      isProcessing = false;
      if (frameId) cancelAnimationFrame(frameId);
    };

    screenVideo.addEventListener('play', onPlay);
    screenVideo.addEventListener('pause', onPause);

    // Start if already playing
    if (!screenVideo.paused) {
      onPlay();
    }

    return () => {
      screenVideo.removeEventListener('play', onPlay);
      screenVideo.removeEventListener('pause', onPause);
      isProcessing = false;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [selectedVideoDevice, screenVideoRef]);

  return {
    canvasRef,
    screenCanvasRef,
  };
};