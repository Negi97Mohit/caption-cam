import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Minimal TS aliases for browser SpeechRecognition types
// These are provided by the browser (webkitSpeechRecognition) without official TS types
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

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
  const consecutiveErrorsRef = useRef(0);
  const lastResultTimeRef = useRef(Date.now());
  const silenceCheckIntervalRef = useRef<NodeJS.Timeout>();

  isRecordingRef.current = isRecording;

  const startRecognition = useCallback(() => {
    console.log('🎤 Starting browser speech recognition...');
    consecutiveErrorsRef.current = 0;
    setIsRecording(true);
  }, []);

  const stopRecognition = useCallback(() => {
    console.log('🛑 Stopping browser speech recognition...');
    setIsRecording(false);
    consecutiveErrorsRef.current = 0;
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = undefined;
    }
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('❌ Speech recognition not supported in this browser.');
      toast.error('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setRecognitionStatus('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognitionRef.current = recognition;

    // --- Event Handlers ---
    recognition.onstart = () => {
      console.log('✅ Speech recognition started successfully');
      setRecognitionStatus('listening');
      consecutiveErrorsRef.current = 0;
      lastResultTimeRef.current = Date.now();
      toast.success('Voice recognition active', { duration: 2000 });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      lastResultTimeRef.current = Date.now();
      consecutiveErrorsRef.current = 0; // Reset errors on successful result
      
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          console.log('📝 Final transcript:', transcript);
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Send partial transcripts for live display
      if (interimTranscript) {
        onPartialTranscript(interimTranscript);
      }

      // Send final transcripts for processing
      if (finalTranscriptRef.current.trim()) {
        const finalText = finalTranscriptRef.current.trim();
        onFinalTranscript(finalText);
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('❌ Speech recognition error:', event.error);
      consecutiveErrorsRef.current++;

      // Handle specific error types
      switch (event.error) {
        case 'no-speech':
          console.log('⚠️ No speech detected, will auto-restart...');
          // Don't show error toast for no-speech, it's normal
          break;
        case 'audio-capture':
          toast.error('Microphone error. Check your audio settings.');
          setRecognitionStatus('error');
          break;
        case 'not-allowed':
          toast.error('Microphone permission denied. Please allow microphone access.');
          setRecognitionStatus('error');
          setIsRecording(false);
          break;
        case 'network':
          toast.error('Network error. Check your internet connection.');
          break;
        case 'aborted':
          console.log('ℹ️ Recognition aborted (usually normal during restart)');
          break;
        default:
          if (consecutiveErrorsRef.current >= 3) {
            toast.error(`Speech recognition error: ${event.error}`);
            setRecognitionStatus('error');
          }
      }

      // Stop if too many consecutive errors
      if (consecutiveErrorsRef.current >= 5) {
        console.error('❌ Too many errors, stopping recognition');
        setIsRecording(false);
        setRecognitionStatus('error');
      }
    };

    // Auto-restart on end
    const restartRecognition = () => {
      if (!isRecordingRef.current || isRestartingRef.current) {
        setRecognitionStatus('stopped');
        console.log('🛑 Recognition ended (user stopped or already restarting)');
        return;
      }

      console.log('🔄 Recognition ended, restarting...');
      
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        if (!isRecordingRef.current || isRestartingRef.current) return;
        
        try {
          console.log('🔄 Attempting to restart...');
          recognition.start();
        } catch (err: any) {
          // Handle "recognition already started" error
          if (err.message && err.message.includes('already started')) {
            console.log('⚠️ Recognition already running, no need to restart');
            return;
          }
          
          console.warn('⚠️ Restart failed, retrying in 500ms', err);
          consecutiveErrorsRef.current++;
          
          if (consecutiveErrorsRef.current < 5) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isRecordingRef.current && !isRestartingRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  console.error('❌ Retry also failed', e);
                }
              }
            }, 500);
          }
        }
      }, 300);
    };

    recognition.onend = restartRecognition;

    // --- Resume on focus / visibility change ---
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRecordingRef.current) {
        console.log('👁️ Tab visible, ensuring recognition is active...');
        try {
          recognition.start();
        } catch (err) {
          // Already started, ignore
        }
      }
    };

    const handleFocus = () => {
      if (isRecordingRef.current) {
        console.log('🎯 Window focused, ensuring recognition is active...');
        lastResultTimeRef.current = Date.now(); // Reset silence timer
        try {
          recognition.start();
        } catch (err) {
          // Already started, ignore
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    // --- Silence Detection & Auto-Restart ---
    // If no results for 60 seconds (increased from 30), force restart
    const isRestartingRef = { current: false };
    
    silenceCheckIntervalRef.current = setInterval(() => {
      if (!isRecordingRef.current || isRestartingRef.current) return;
      
      const timeSinceLastResult = Date.now() - lastResultTimeRef.current;
      
      if (timeSinceLastResult > 60000) { // 60 seconds instead of 30
        console.warn('⚠️ No results for 60 seconds, forcing restart...');
        isRestartingRef.current = true;
        
        try {
          recognition.stop();
        } catch (err) {
          console.error('❌ Stop failed during silence restart', err);
        }
        
        setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
              lastResultTimeRef.current = Date.now();
              isRestartingRef.current = false;
            } catch (err) {
              console.error('❌ Restart failed after silence', err);
              isRestartingRef.current = false;
            }
          } else {
            isRestartingRef.current = false;
          }
        }, 1000);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      console.log('🧹 Cleaning up speech recognition...');
      clearTimeout(restartTimeoutRef.current);
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
      }
      try {
        recognition.stop();
      } catch (err) {
        // Ignore errors during cleanup
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onFinalTranscript, onPartialTranscript]);

  // Start / stop based on isRecording state
  useEffect(() => {
    if (isRecording) {
      console.log('🚀 Starting recognition...');
      finalTranscriptRef.current = '';
      lastResultTimeRef.current = Date.now();
      try {
        recognitionRef.current?.start();
      } catch (err: any) {
        if (err.message && err.message.includes('already started')) {
          console.log('ℹ️ Recognition already running');
        } else {
          console.error('❌ Failed to start:', err);
          toast.error('Failed to start voice recognition');
        }
      }
    } else {
      console.log('⏸️ Stopping recognition...');
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        // Ignore errors during stop
      }
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
        silenceCheckIntervalRef.current = undefined;
      }
    }
  }, [isRecording]);

  return { 
    isRecording, 
    startRecognition, 
    stopRecognition, 
    recognitionStatus 
  };
};