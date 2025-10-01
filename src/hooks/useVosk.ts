import { useState, useRef, useCallback } from "react";
import { useContinuousAudio } from "./useContinuousAudio";

const TRANSCRIPT_BUFFER_TIMEOUT = 2000; // Increased to 2 seconds
const MAX_BUFFER_LENGTH = 500;

interface UseVoskProps {
  onTranscript: (transcript: string) => void;
  onPartialTranscript: (partial: string) => void;
  onError?: (error: Error) => void;
}

export const useVosk = ({ onTranscript, onPartialTranscript, onError }: UseVoskProps) => {
  const [isVoskReady, setIsVoskReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);

  // Refs for transcript buffering
  const transcriptBufferRef = useRef<string>("");
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentenceEndRef = useRef<number>(0);
  
  // Audio chunk tracking
  const audioChunksSentRef = useRef<number>(0);
  const lastPartialTimeRef = useRef<number>(Date.now());

  const flushBuffer = useCallback(() => {
    if (transcriptBufferRef.current.trim()) {
      console.log("Flushing transcript buffer:", transcriptBufferRef.current);
      onTranscript(transcriptBufferRef.current.trim());
      transcriptBufferRef.current = "";
      lastSentenceEndRef.current = Date.now();
    }
  }, [onTranscript]);

  const handleAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
      audioChunksSentRef.current++;
      
      // Log every 100 chunks
      if (audioChunksSentRef.current % 100 === 0) {
        console.log(`Audio chunks sent to Vosk: ${audioChunksSentRef.current}`);
      }
    } else {
      console.warn("WebSocket not ready, cannot send audio chunk");
    }
  }, []);

  const {
    isCapturing: isAudioCapturing,
    startCapture: startAudioCapture,
    stopCapture: stopAudioCapture,
    audioDeviceInfo,
  } = useContinuousAudio({
    onAudioChunk: handleAudioChunk,
    onError: (error) => {
      console.error("Audio capture error:", error);
      onError?.(error);
      setIsRecording(false);
    },
  });

  const stopRecording = useCallback(() => {
    console.log("Stopping recording...");
    if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    flushBuffer();
    stopAudioCapture();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
    setIsVoskReady(false);
    setConnectionStatus("disconnected");
    audioChunksSentRef.current = 0;
  }, [stopAudioCapture, flushBuffer]);

  const startRecording = useCallback(() => {
    if (isRecording) {
      console.warn("Already recording");
      return;
    }

    console.log("Starting recording...");
    console.log("Connecting to Vosk server at ws://localhost:2700");
    
    const ws = new WebSocket("ws://localhost:2700");
    wsRef.current = ws;
    setConnectionStatus("connecting");

    ws.onopen = () => {
      console.log("✓ Vosk WebSocket connection opened successfully");
      setIsVoskReady(true);
      setConnectionStatus("connected");
      setIsRecording(true);
      audioChunksSentRef.current = 0;
      
      // Start audio capture after WebSocket is ready
      startAudioCapture();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const now = Date.now();
      
      if (message.text && message.text.trim()) {
        const newText = message.text.trim();
        console.log("✓ Received final transcript:", newText);
        
        const endsWithPunctuation = /[.!?]$/.test(newText);
        const timeSinceLastSentence = now - lastSentenceEndRef.current;
        
        transcriptBufferRef.current = (transcriptBufferRef.current + " " + newText).trim();

        if (transcriptBufferRef.current.length > MAX_BUFFER_LENGTH) {
          flushBuffer();
          return;
        }

        if (bufferTimeoutRef.current) {
          clearTimeout(bufferTimeoutRef.current);
        }

        // Flush immediately if sentence is complete
        if (endsWithPunctuation && timeSinceLastSentence > 500) {
          flushBuffer();
        } else {
          bufferTimeoutRef.current = setTimeout(flushBuffer, TRANSCRIPT_BUFFER_TIMEOUT);
        }
        
        lastPartialTimeRef.current = now;
      } else if (message.partial) {
        // Only log if it's been a while since last partial
        if (now - lastPartialTimeRef.current > 1000) {
          console.log("Partial transcript:", message.partial);
        }
        onPartialTranscript(message.partial);
        lastPartialTimeRef.current = now;
      }
    };

    ws.onerror = (event) => {
      console.error("✗ WebSocket error:", event);
      setConnectionStatus("error");
      onError?.(new Error(
        "WebSocket connection failed. Please ensure:\n" +
        "1. Python server is running (python server.py)\n" +
        "2. Vosk model is correctly installed\n" +
        "3. Port 2700 is not blocked by firewall"
      ));
      stopRecording();
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      setIsVoskReady(false);
      setConnectionStatus("disconnected");
      
      if (isAudioCapturing) {
        stopAudioCapture();
      }
      setIsRecording(false);
    };
  }, [isRecording, startAudioCapture, onPartialTranscript, onError, flushBuffer, stopRecording, isAudioCapturing]);

  return { 
    isVoskReady, 
    isRecording, 
    startRecording, 
    stopRecording,
    connectionStatus,
    audioDeviceInfo,
    audioChunksSent: audioChunksSentRef.current
  };
};