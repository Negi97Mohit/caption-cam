// src/hooks/useContinuousAudio.ts
import { useState, useRef, useCallback } from "react";

interface UseContinuousAudioProps {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onError: (error: Error) => void;
}

export const useContinuousAudio = ({ onAudioChunk, onError }: UseContinuousAudioProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const stopCapture = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setIsCapturing(false);
  }, []);

  const startCapture = useCallback(async () => {
    if (isCapturing) return;

    try {
      // 1. Get microphone permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Create and resume AudioContext
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (context.state === "suspended") {
        await context.resume();
      }
      audioContextRef.current = context;

      // 3. Add our custom processor to the worklet
      await context.audioWorklet.addModule("/audio-processor.js");

      // 4. Create the source and worklet nodes
      const source = context.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(context, "audio-processor");
      workletNodeRef.current = workletNode;

      // 5. Listen for messages (audio chunks) from the processor
      workletNode.port.onmessage = (event) => {
        onAudioChunk(event.data);
      };

      // 6. Connect the audio graph: Mic -> Worklet
      source.connect(workletNode);
      // You can optionally connect to the destination to hear yourself:
      // workletNode.connect(context.destination);

      setIsCapturing(true);
    } catch (err) {
      console.error("Error starting audio capture:", err);
      onError(err instanceof Error ? err : new Error(String(err)));
      stopCapture();
    }
  }, [isCapturing, onAudioChunk, onError, stopCapture]);

  return { isCapturing, startCapture, stopCapture };
};