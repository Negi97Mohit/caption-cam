// src/hooks/useVideoStreams.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseVideoStreamsProps {
  isCameraOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  selectedCameraDevice?: string;
  selectedAudioDevice?: string;
  onScreenShareEnd: () => void;
}

export const useVideoStreams = ({
  isCameraOn,
  isAudioOn,
  isScreenSharing,
  selectedCameraDevice,
  selectedAudioDevice,
  onScreenShareEnd,
}: UseVideoStreamsProps) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const isRequestingScreen = useRef(false);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (!isCameraOn) {
      stopTracks(cameraStream);
      setCameraStream(null);
      return;
    }
    let isCancelled = false;
    const getCameraStream = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraDevice
            ? { deviceId: { exact: selectedCameraDevice }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: isAudioOn ? {
            deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
          } : false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isCancelled) {
          console.log('✅ Camera stream attached');
          setCameraStream(stream);
        } else {
          stopTracks(stream);
        }
      } catch (err) {
        console.error("Camera error:", err);
        if ((err as Error).name === 'NotAllowedError') {
            toast.error("Camera permission denied. Please enable it in your browser settings.");
        } else {
            toast.error(`Camera error: ${(err as Error).message}`);
        }
      }
    };
    getCameraStream();
    return () => { isCancelled = true; stopTracks(cameraStream); };
  }, [isCameraOn, isAudioOn, selectedCameraDevice, selectedAudioDevice, stopTracks]);

  useEffect(() => {
    if (isScreenSharing && !screenStream && !isRequestingScreen.current) {
        isRequestingScreen.current = true;
        const getScreenStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: isAudioOn,
                });
                console.log('✅ Screen stream attached');
                const videoTrack = stream.getVideoTracks()[0];
                videoTrack.onended = () => {
                    console.log('🛑 Screen share ended');
                    onScreenShareEnd();
                    toast.info("Screen sharing stopped—switching to camera view");
                };
                setScreenStream(stream);
            } catch (err) {
                console.error("Screen share error:", err);
                if ((err as Error).name === 'NotAllowedError') {
                    toast.error("Screen share permission denied. Please try again and grant permission.");
                } else {
                    toast.error(`Screen share error: ${(err as Error).message}. Try again?`);
                }
                onScreenShareEnd();
            } finally {
                isRequestingScreen.current = false;
            }
        };
        getScreenStream();
    } else if (!isScreenSharing && screenStream) {
        stopTracks(screenStream);
        setScreenStream(null);
    }
}, [isScreenSharing, onScreenShareEnd, stopTracks, isAudioOn, screenStream]);


  return { cameraStream, screenStream };
};