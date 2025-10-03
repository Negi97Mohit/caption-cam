import { useState, useRef, useEffect, useCallback } from 'react';

export type RecognitionStatus = 'idle' | 'listening' | 'error' | 'stopped';

interface UseBrowserSpeechProps {
  onFinalTranscript: (transcript: string) => void;
  onPartialTranscript: (transcript: string) => void;
}

export const useBrowserSpeech = ({
  onFinalTranscript,
  onPartialTranscript,
}: UseBrowserSpeechProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout>();

  isRecordingRef.current = isRecording;

  const startRecognition = useCallback(() => setIsRecording(true), []);
  const stopRecognition = useCallback(() => setIsRecording(false), []);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser.');
      setRecognitionStatus('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('✅ Speech recognition started');
      setRecognitionStatus('listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) onPartialTranscript(interimTranscript);

      if (finalTranscriptRef.current.trim()) {
        onFinalTranscript(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      setRecognitionStatus('error');
    };

    // Auto-restart on end
    const restartRecognition = () => {
      if (isRecordingRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.warn('Restart failed, retrying in 500ms', err);
            restartTimeoutRef.current = setTimeout(() => recognition.start(), 500);
          }
        }, 300);
      } else {
        setRecognitionStatus('stopped');
      }
    };

    recognition.onend = restartRecognition;

    // Resume on focus / visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRecordingRef.current) {
        try { recognition.start(); } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearTimeout(restartTimeoutRef.current);
      recognition.stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [onFinalTranscript, onPartialTranscript]);

  // Start / stop based on isRecording state
  useEffect(() => {
    if (isRecording) {
      finalTranscriptRef.current = '';
      try { recognitionRef.current?.start(); } catch (err) {
        console.warn('start() failed:', err);
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [isRecording]);

  return { isRecording, startRecognition, stopRecognition, recognitionStatus };
};
