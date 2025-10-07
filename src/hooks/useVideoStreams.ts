// src/hooks/useVideoStreams.ts
import { useEffect, useState, useCallback } from 'react';
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
  const [mergedStream, setMergedStream] = useState<MediaStream | null>(null); // New: For recording

  // Cleanup helper
  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach(track => track.stop());
  }, []);

  // Merge streams (screen video + camera audio if needed)
  useEffect(() => {
    if (!screenStream || !cameraStream) {
      setMergedStream(null);
      return;
    }
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    const cameraAudioTrack = isAudioOn ? cameraStream.getAudioTracks()[0] : null;

    // Mute camera video/audio if screen-sharing (avoid echo/overlay)
    cameraStream.getVideoTracks().forEach(track => (track.enabled = false));
    if (cameraAudioTrack) cameraAudioTrack.enabled = false; // Or clone if needed

    // Create new stream with screen video + optional audio
    const newStream = new MediaStream([screenVideoTrack]);
    if (cameraAudioTrack) newStream.addTrack(cameraAudioTrack);

    setMergedStream(newStream);

    return () => stopTracks(newStream);
  }, [screenStream, cameraStream, isAudioOn, stopTracks]);

  // Camera effect (unchanged, but add log)
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
        toast.error(`Camera error: ${(err as Error).message}`);
      }
    };
    getCameraStream();
    return () => { isCancelled = true; stopTracks(cameraStream); };
  }, [isCameraOn, isAudioOn, selectedCameraDevice, selectedAudioDevice, stopTracks]);

  // Screen effect (add retry on fail)
  useEffect(() => {
    if (!isScreenSharing) {
      stopTracks(screenStream);
      setScreenStream(null);
      return;
    }
    let isCancelled = false;
    let retryCount = 0;
    const maxRetries = 2;
    const getScreenStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false, // Screen share audio separate if needed
        });
        if (!isCancelled) {
          console.log('✅ Screen stream attached');
          const videoTrack = stream.getVideoTracks()[0];
          videoTrack.onended = () => {
            console.log('🛑 Screen share ended');
            onScreenShareEnd();
            toast.info("Screen sharing stopped—switching to camera view");
          };
          setScreenStream(stream);
          retryCount = 0; // Reset on success
        } else {
          stopTracks(stream);
        }
      } catch (err) {
        retryCount++;
        console.error("Screen share error:", err);
        if (retryCount <= maxRetries && (err as Error).name !== 'NotAllowedError') {
          toast.warning(`Screen share failed (retry ${retryCount}/${maxRetries})...`);
          setTimeout(getScreenStream, 1000 * retryCount); // Exponential backoff
        } else {
          toast.error(`Screen share error: ${(err as Error).message}. Try again?`);
          onScreenShareEnd(); // Fallback
        }
      }
    };
    getScreenStream();
    return () => { isCancelled = true; stopTracks(screenStream); };
  }, [isScreenSharing, onScreenShareEnd, stopTracks]);

  return { cameraStream, screenStream, mergedStream }; // Expose merged for recording
};