// src/hooks/useVosk.ts
import { useState, useRef, useCallback } from "react";
import { useContinuousAudio } from "./useContinuousAudio";

const TRANSCRIPT_BUFFER_TIMEOUT = 1500; // 1.5 seconds of silence

interface UseVoskProps {
  onTranscript: (transcript: string) => void;
  onPartialTranscript: (partial: string) => void;
  onError?: (error: Error) => void;
}

export const useVosk = ({ onTranscript, onPartialTranscript, onError }: UseVoskProps) => {
  const [isVoskReady, setIsVoskReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Refs for transcript buffering
  const transcriptBufferRef = useRef<string>("");
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
    }
  }, []);

  const {
    isCapturing: isAudioCapturing,
    startCapture: startAudioCapture,
    stopCapture: stopAudioCapture,
  } = useContinuousAudio({
    onAudioChunk: handleAudioChunk,
    onError: (error) => {
      console.error("Audio capture error:", error);
      onError?.(error);
      setIsRecording(false);
    },
  });

  const stopRecording = useCallback(() => {
    if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    if (transcriptBufferRef.current) {
        onTranscript(transcriptBufferRef.current);
        transcriptBufferRef.current = "";
    }
    stopAudioCapture();
    wsRef.current?.close();
    wsRef.current = null;
    setIsRecording(false);
  }, [stopAudioCapture, onTranscript]);

  const startRecording = useCallback(() => {
    if (isRecording) return;
    
    const ws = new WebSocket("ws://localhost:2700");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Vosk WebSocket connection opened.");
      setIsVoskReady(true);
      startAudioCapture();
      setIsRecording(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.text) {
          // Instead of sending immediately, add to buffer and set a timeout
          transcriptBufferRef.current = (transcriptBufferRef.current + " " + message.text).trim();
          
          if (bufferTimeoutRef.current) {
              clearTimeout(bufferTimeoutRef.current);
          }

          bufferTimeoutRef.current = setTimeout(() => {
              if (transcriptBufferRef.current) {
                  onTranscript(transcriptBufferRef.current);
                  transcriptBufferRef.current = ""; // Clear buffer after sending
              }
          }, TRANSCRIPT_BUFFER_TIMEOUT);
          
      } else if (message.partial) {
        onPartialTranscript(message.partial);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      onError?.(new Error("WebSocket connection failed. Make sure the Vosk server is running."));
      stopRecording();
    };

    ws.onclose = () => {
      console.log("Vosk WebSocket connection closed.");
      setIsVoskReady(false);
      if (isAudioCapturing) {
        stopAudioCapture();
      }
      setIsRecording(false);
    };
  }, [isRecording, startAudioCapture, onTranscript, onPartialTranscript, onError, stopRecording, isAudioCapturing]);

  return { isVoskReady, isRecording, startRecording, stopRecording };
};