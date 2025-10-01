import { useState, useRef, useCallback } from "react";

interface UseContinuousAudioProps {
  onAudioChunk: (chunk: ArrayBuffer) => void;
  onError: (error: Error) => void;
}

export const useContinuousAudio = ({ onAudioChunk, onError }: UseContinuousAudioProps) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioDeviceInfo, setAudioDeviceInfo] = useState<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopCapture = useCallback(() => {
    console.log("Stopping audio capture...");
    
    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(`Stopping track: ${track.label}`);
        track.stop();
      });
      streamRef.current = null;
    }

    setIsCapturing(false);
    setAudioDeviceInfo("");
  }, []);

  const startCapture = useCallback(async () => {
    if (isCapturing) {
      console.warn("Already capturing audio");
      return;
    }

    try {
      console.log("Requesting microphone access...");

      // 1. Get microphone permission with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Request high quality
          channelCount: 1, // Mono
        },
      });

      streamRef.current = stream;

      // Log audio device info
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      const deviceInfo = `Device: ${audioTrack.label}, Sample Rate: ${settings.sampleRate}Hz, Channels: ${settings.channelCount}`;
      console.log("Audio device info:", deviceInfo);
      setAudioDeviceInfo(deviceInfo);

      // 2. Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass({ sampleRate: 48000 });
      
      console.log(`AudioContext created. State: ${context.state}, Sample Rate: ${context.sampleRate}Hz`);

      // Resume if suspended
      if (context.state === "suspended") {
        await context.resume();
        console.log("AudioContext resumed");
      }

      audioContextRef.current = context;

      // 3. Load audio processor worklet
      console.log("Loading audio worklet...");
      try {
        await context.audioWorklet.addModule("/audio-processor.js");
        console.log("Audio worklet loaded successfully");
      } catch (workletError) {
        console.error("Failed to load audio worklet:", workletError);
        throw new Error("Audio processor failed to load. Check if audio-processor.js exists in /public/");
      }

      // 4. Create audio nodes
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const workletNode = new AudioWorkletNode(context, "audio-processor");
      workletNodeRef.current = workletNode;

      console.log("Audio nodes created");

      // 5. Set up message handler with error tracking
      let chunksReceived = 0;
      workletNode.port.onmessage = (event) => {
        chunksReceived++;
        if (chunksReceived % 50 === 0) {
          console.log(`Audio chunks received: ${chunksReceived}`);
        }
        onAudioChunk(event.data);
      };

      // Monitor worklet errors
      workletNode.port.onmessageerror = (event) => {
        console.error("Worklet message error:", event);
      };

      // 6. Connect audio graph: Mic -> Worklet
      source.connect(workletNode);
      
      // Optional: Connect to destination to hear yourself (useful for debugging)
      // workletNode.connect(context.destination);

      console.log("Audio graph connected successfully");
      setIsCapturing(true);

      // Monitor stream status
      audioTrack.onended = () => {
        console.warn("Audio track ended unexpectedly");
        stopCapture();
      };

      audioTrack.onmute = () => {
        console.warn("Audio track muted");
      };

      audioTrack.onunmute = () => {
        console.log("Audio track unmuted");
      };

    } catch (err) {
      console.error("Error starting audio capture:", err);
      
      let errorMessage = "Failed to start audio capture";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Microphone permission denied. Please allow microphone access.";
        } else if (err.name === "NotFoundError") {
          errorMessage = "No microphone found. Please connect a microphone.";
        } else if (err.name === "NotReadableError") {
          errorMessage = "Microphone is already in use by another application.";
        } else {
          errorMessage = err.message;
        }
      }
      
      onError(new Error(errorMessage));
      stopCapture();
    }
  }, [isCapturing, onAudioChunk, onError, stopCapture]);

  return { isCapturing, startCapture, stopCapture, audioDeviceInfo };
};