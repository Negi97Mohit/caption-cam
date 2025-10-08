import React, { useEffect, useRef, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { FaceDetection } from '@mediapipe/face_detection';

interface CameraRendererProps {
  stream: MediaStream | null;
  backgroundEffect: 'none' | 'blur' | 'image';
  backgroundImageUrl?: string | null;
  isAutoFramingEnabled: boolean;
  zoomSensitivity: number; // 1.0 = no zoom, higher = more zoom
  trackingSpeed: number; // 0..1 smoothing factor
  className?: string;
  style?: React.CSSProperties;
}

// Utility to draw image cover on canvas
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLVideoElement | HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  crop: { sx: number; sy: number; sw: number; sh: number } | null = null
) {
  const sourceW = crop ? crop.sw : (img as any).videoWidth || (img as any).naturalWidth;
  const sourceH = crop ? crop.sh : (img as any).videoHeight || (img as any).naturalHeight;

  const srcX = crop ? crop.sx : 0;
  const srcY = crop ? crop.sy : 0;

  const srcAspect = sourceW / sourceH;
  const dstAspect = canvasWidth / canvasHeight;

  let dw = canvasWidth;
  let dh = canvasHeight;
  if (srcAspect > dstAspect) {
    // Source is wider
    dh = canvasHeight;
    dw = dh * srcAspect;
  } else {
    // Source is taller
    dw = canvasWidth;
    dh = dw / srcAspect;
  }

  const dx = (canvasWidth - dw) / 2;
  const dy = (canvasHeight - dh) / 2;

  ctx.drawImage(img as any, srcX, srcY, sourceW, sourceH, dx, dy, dw, dh);
}

export const CameraRenderer: React.FC<CameraRendererProps> = ({
  stream,
  backgroundEffect,
  backgroundImageUrl,
  isAutoFramingEnabled,
  zoomSensitivity,
  trackingSpeed,
  className,
  style,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const segRef = useRef<SelfieSegmentation | null>(null);
  const faceRef = useRef<FaceDetection | null>(null);

  const [ready, setReady] = useState(false);

  // Auto-framing state
  const targetCenterRef = useRef({ x: 0.5, y: 0.5 });
  const currentCenterRef = useRef({ x: 0.5, y: 0.5 });
  const targetScaleRef = useRef(1.0);
  const currentScaleRef = useRef(1.0);

  // Mount video stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const onLoaded = () => {
        setReady(true);
      };
      videoRef.current.onloadedmetadata = onLoaded;
      return () => {
        if (videoRef.current) videoRef.current.onloadedmetadata = null;
      };
    }
  }, [stream]);

  // Load background image when url changes
  useEffect(() => {
    if (backgroundEffect === 'image' && backgroundImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = backgroundImageUrl;
      bgImgRef.current = img;
    } else {
      bgImgRef.current = null;
    }
  }, [backgroundEffect, backgroundImageUrl]);

  // Initialize mediapipe modules when needed
  useEffect(() => {
    const needSeg = backgroundEffect !== 'none';
    const needFace = isAutoFramingEnabled;

    if (!needSeg && !needFace) return; // nothing to do

    let canceled = false;

    const init = async () => {
      if (needSeg && !segRef.current) {
        const seg = new SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`,
        });
        seg.setOptions({ modelSelection: 1 });
        segRef.current = seg;
      }

      if (needFace && !faceRef.current) {
        const fd = new FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`,
        });
        // @ts-ignore option name per mediapipe
        fd.setOptions({ model: 'short', minDetectionConfidence: 0.6 });
        faceRef.current = fd;
      }

      if (!canceled) loop();
    };

    init();

    const loop = async () => {
      if (canceled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !ready) {
        requestAnimationFrame(loop);
        return;
        }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestAnimationFrame(loop);
        return;
      }

      // Ensure canvas size matches element size
      const { clientWidth, clientHeight } = canvas;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
      }

      // Update auto-framing targets if enabled
      if (isAutoFramingEnabled && faceRef.current) {
        try {
          await faceRef.current.send({ image: video });
          // @ts-ignore mediapipe results stored internally
          const results: any = (faceRef.current as any).results;
          const det = results?.detections?.[0];
          const box = det?.boundingBox || det?.locationData?.relativeBoundingBox;
          if (box) {
            const cx = box.xCenter ?? (box.xMin + box.width / 2);
            const cy = box.yCenter ?? (box.yMin + box.height / 2);
            targetCenterRef.current.x = Math.min(1, Math.max(0, cx));
            targetCenterRef.current.y = Math.min(1, Math.max(0, cy));
            // Basic zoom heuristic: inverse of face box width
            const faceW = box.width || 0.3;
            const desired = Math.max(1, Math.min(zoomSensitivity, 0.8 / Math.max(0.15, faceW)));
            targetScaleRef.current = desired;
          }
        } catch { }
      } else {
        targetCenterRef.current = { x: 0.5, y: 0.5 };
        targetScaleRef.current = 1.0;
      }

      // Smooth move towards target
      const a = Math.min(1, Math.max(0.01, trackingSpeed));
      currentCenterRef.current.x += (targetCenterRef.current.x - currentCenterRef.current.x) * a;
      currentCenterRef.current.y += (targetCenterRef.current.y - currentCenterRef.current.y) * a;
      currentScaleRef.current += (targetScaleRef.current - currentScaleRef.current) * a;

      // Compute crop from current center/scale
      const vW = (video as any).videoWidth || 1280;
      const vH = (video as any).videoHeight || 720;
      const scale = currentScaleRef.current;
      const sw = Math.max(1, vW / scale);
      const sh = Math.max(1, vH / scale);
      const sx = Math.min(Math.max(0, currentCenterRef.current.x * vW - sw / 2), vW - sw);
      const sy = Math.min(Math.max(0, currentCenterRef.current.y * vH - sh / 2), vH - sh);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (backgroundEffect === 'none') {
        // No segmentation, just draw cropped video
        drawImageCover(ctx, video, canvas.width, canvas.height, { sx, sy, sw, sh });
      } else if (segRef.current) {
        try {
          await segRef.current.send({ image: video });
          // @ts-ignore mediapipe internal result
          const segAny: any = (segRef.current as any).results;
          const mask = segAny?.segmentationMask as HTMLCanvasElement;

          if (mask) {
            // Step 1: draw mask
            ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

            // Step 2: keep only the person for the next draw
            ctx.globalCompositeOperation = 'source-in';
            drawImageCover(ctx, video, canvas.width, canvas.height, { sx, sy, sw, sh });

            // Step 3: draw background where person is NOT present
            ctx.globalCompositeOperation = 'destination-atop';
            if (backgroundEffect === 'image' && bgImgRef.current) {
              drawImageCover(ctx, bgImgRef.current, canvas.width, canvas.height);
            } else if (backgroundEffect === 'blur') {
              ctx.save();
              ctx.filter = 'blur(18px)';
              drawImageCover(ctx, video, canvas.width, canvas.height);
              ctx.restore();
            }

            // Reset comp mode
            ctx.globalCompositeOperation = 'source-over';
          } else {
            // Fallback: no mask - just draw video
            drawImageCover(ctx, video, canvas.width, canvas.height, { sx, sy, sw, sh });
          }
        } catch {
          // On failure, just draw video
          drawImageCover(ctx, video, canvas.width, canvas.height, { sx, sy, sw, sh });
        }
      }

      requestAnimationFrame(loop);
    };

    return () => {
      canceled = true;
    };
  }, [backgroundEffect, isAutoFramingEnabled, ready, trackingSpeed, zoomSensitivity]);

  return (
    <div className={className} style={style}>
      {/* Hidden video used as source */}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
