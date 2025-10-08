// src/hooks/useContinuousAudio.ts
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseContinuousAudioOptions {
  onAudioChunk: (chunk: ArrayBuffer | Blob) => void;
  onError?: (err: Error) => void;
  mimeType?: string; // default 'audio/webm'
  timesliceMs?: number; // default 250ms
}

export function useContinuousAudio({ onAudioChunk, onError, mimeType = 'audio/webm', timesliceMs = 250 }: UseContinuousAudioOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCapture = useCallback(async () => {
    try {
      if (isCapturing) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          // Send Blob directly; consumer can handle conversion if needed
          onAudioChunk(e.data);
        }
      };

      recorder.onerror = (ev: any) => {
        onError?.(new Error(ev?.error?.message || 'Unknown MediaRecorder error'));
      };

      recorder.start(timesliceMs);
      setIsCapturing(true);
    } catch (err: any) {
      onError?.(err);
    }
  }, [isCapturing, mimeType, onAudioChunk, onError, timesliceMs]);

  const stopCapture = useCallback(() => {
    try {
      const rec = mediaRecorderRef.current;
      if (!rec) return;
      if (rec.state !== 'inactive') rec.stop();
      rec.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    } catch (err: any) {
      onError?.(err);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  useEffect(() => () => {
    // Cleanup on unmount
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch {}
      mediaRecorderRef.current = null;
    }
  }, []);

  return { isCapturing, startCapture, stopCapture };
}
