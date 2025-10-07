// src/hooks/useCanvasRenderer.ts
import { useEffect, useRef } from 'react';

interface UseCanvasRendererProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    screenVideoRef: React.RefObject<HTMLVideoElement>;
}

export const useCanvasRenderer = ({
    videoRef,
    screenVideoRef,
}: UseCanvasRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const screenCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || !video.srcObject) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        let animationFrameId: number;

        const render = () => {
            if (video.readyState >= 2) { 
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [videoRef, videoRef.current?.srcObject]);

    useEffect(() => {
        const screenVideo = screenVideoRef.current;
        const screenCanvas = screenCanvasRef.current;

        if (!screenVideo || !screenCanvas || !screenVideo.srcObject) {
            return;
        }

        const ctx = screenCanvas.getContext('2d');
        if (!ctx) {
            return;
        }

        let animationFrameId: number;

        const render = () => {
            if (screenVideo.readyState >= 2) {
                screenCanvas.width = screenVideo.videoWidth;
                screenCanvas.height = screenVideo.videoHeight;
                ctx.drawImage(screenVideo, 0, 0, screenCanvas.width, screenCanvas.height);
            }
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [screenVideoRef, screenVideoRef.current?.srcObject]);

    return { canvasRef, screenCanvasRef };
};