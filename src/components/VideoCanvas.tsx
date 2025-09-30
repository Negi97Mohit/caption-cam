import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Square, 
  Monitor, 
  Camera, 
  Download,
  Play,
  Layers,
} from "lucide-react";
import { CaptionStyle } from "@/types/caption";
import { DraggableCaptions } from "./DraggableCaptions";
import { useToast } from "@/hooks/use-toast";

interface VideoCanvasProps {
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  recordingMode: "webcam" | "screen" | "both";
  onRecordingModeChange: (mode: "webcam" | "screen" | "both") => void;
  onCaptionPositionChange: (position: { x: number; y: number }) => void;
}

export const VideoCanvas = ({
  captionStyle,
  captionsEnabled,
  recordingMode,
  onRecordingModeChange,
  onCaptionPositionChange,
}: VideoCanvasProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const startPreview = async () => {
    try {
      if (recordingMode === "webcam") {
        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
          audio: audioConstraints,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else if (recordingMode === "screen") {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        
        const stream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else if (recordingMode === "both") {
        // Main screen
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        
        // PIP camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true,
        });
        
        streamRef.current = displayStream;
        pipStreamRef.current = cameraStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = displayStream;
        }
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = cameraStream;
        }
      }

      setIsPreviewing(true);
      
      toast({
        title: "Preview started",
        description: "Ready to record",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access media devices",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    
    toast({
      title: "Recording started",
      description: "Speak clearly for live captions",
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: "Recording stopped",
        description: "Ready to download",
      });
    }
  };

  const downloadVideo = () => {
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Your video is being downloaded",
    });
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (pipStreamRef.current) {
      pipStreamRef.current.getTracks().forEach(track => track.stop());
      pipStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-secondary/20">
      {/* Canvas Controls */}
      <div className="p-4 border-b border-border bg-card flex items-center gap-3">
        <div className="flex gap-2">
          <Button
            variant={recordingMode === "webcam" ? "default" : "secondary"}
            size="sm"
            onClick={() => onRecordingModeChange("webcam")}
            disabled={isPreviewing}
          >
            <Camera className="w-4 h-4 mr-2" />
            Webcam
          </Button>
          <Button
            variant={recordingMode === "screen" ? "default" : "secondary"}
            size="sm"
            onClick={() => onRecordingModeChange("screen")}
            disabled={isPreviewing}
          >
            <Monitor className="w-4 h-4 mr-2" />
            Screen
          </Button>
          <Button
            variant={recordingMode === "both" ? "default" : "secondary"}
            size="sm"
            onClick={() => onRecordingModeChange("both")}
            disabled={isPreviewing}
          >
            <Layers className="w-4 h-4 mr-2" />
            Both (PIP)
          </Button>
        </div>

        <div className="flex gap-2 ml-auto">
          {!isPreviewing && (
            <Button onClick={startPreview} className="bg-gradient-primary">
              <Play className="w-4 h-4 mr-2" />
              Start Preview
            </Button>
          )}

          {isPreviewing && !isRecording && (
            <>
              <Button onClick={startRecording} variant="default">
                <Video className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
              <Button onClick={stopPreview} variant="secondary">
                Stop Preview
              </Button>
            </>
          )}

          {isRecording && (
            <Button onClick={stopRecording} variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          )}

          {chunksRef.current.length > 0 && !isRecording && (
            <Button onClick={downloadVideo} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Video Canvas */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden shadow-elevated">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Picture-in-Picture Video */}
          {recordingMode === "both" && isPreviewing && (
            <video
              ref={pipVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 w-64 h-48 rounded-lg border-2 border-white shadow-lg object-cover"
            />
          )}

          {!isPreviewing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Video className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">Click Start Preview to begin</p>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-destructive/90 rounded-full animate-glow-pulse">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-bold">REC</span>
            </div>
          )}

          {isPreviewing && captionsEnabled && (
            <DraggableCaptions
              style={captionStyle}
              onCaptionChange={setCurrentCaption}
              isRecording={isRecording}
              onPositionChange={onCaptionPositionChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
