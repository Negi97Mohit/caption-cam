// src/hooks/useBrowserSpeech.ts

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseBrowserSpeechProps {
  onFinalTranscript: (transcript: string) => void;
  onPartialTranscript: (transcript: string) => void;
}

export const useBrowserSpeech = ({ onFinalTranscript, onPartialTranscript }: UseBrowserSpeechProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>("");

  const startRecognition = () => {
    finalTranscriptRef.current = "";
    setIsRecording(true);
  };

  const stopRecognition = () => {
    setIsRecording(false);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      onPartialTranscript(interimTranscript);

      // If we have a final transcript, send it and reset.
      if (finalTranscriptRef.current.trim()) {
        onFinalTranscript(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = "";
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (isRecording) {
        // Automatically restart if it stops during a recording session
        recognition.start();
      }
    };

    return () => {
      recognition.stop();
    };
  }, [onFinalTranscript, onPartialTranscript]);

  useEffect(() => {
    if (isRecording) {
      recognitionRef.current?.start();
    } else {
      recognitionRef.current?.stop();
    }
  }, [isRecording]);

  return { isRecording, startRecognition, stopRecognition };
};