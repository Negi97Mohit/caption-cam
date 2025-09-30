import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Square, Monitor, Camera, Mic, Download } from "lucide-react";
import { CaptionStyle } from "@/types/caption";
import { LiveCaptions } from "./LiveCaptions";
import { useToast } from "@/hooks/use-toast";

interface VideoRecorderProps {
  captionStyle: CaptionStyle;
  captionsEnabled: boolean;
  onCaptionsToggle: (enabled: boolean) => void;
}

export const VideoRecorder = ({
  captionStyle,
  captionsEnabled,
  onCaptionsToggle,
}: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordingMode, setRecordingMode] = useState<"webcam" | "screen">("webcam");
  const [currentCaption, setCurrentCaption] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const startPreview = async () => {
    try {
      let stream: MediaStream;

      if (recordingMode === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
      } else {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true,
        });
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        
        stream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsPreviewing(true);
      
      toast({
        title: "Preview started",
        description: "Your camera is ready to record",
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
        description: "Processing your video...",
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  return (
    <Card className="p-6 bg-card border-border animate-fade-in">
      <div className="space-y-4">
        <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {isPreviewing && captionsEnabled && (
            <LiveCaptions
              style={captionStyle}
              onCaptionChange={setCurrentCaption}
              isRecording={isRecording}
            />
          )}

          {!isPreviewing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Click Start Preview to begin</p>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-destructive/90 rounded-full animate-glow-pulse">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">REC</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <Button
              variant={recordingMode === "webcam" ? "default" : "secondary"}
              size="sm"
              onClick={() => setRecordingMode("webcam")}
              disabled={isPreviewing}
            >
              <Camera className="w-4 h-4 mr-2" />
              Webcam
            </Button>
            <Button
              variant={recordingMode === "screen" ? "default" : "secondary"}
              size="sm"
              onClick={() => setRecordingMode("screen")}
              disabled={isPreviewing}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Screen
            </Button>
          </div>

          <div className="flex gap-2 ml-auto">
            {!isPreviewing && (
              <Button onClick={startPreview} className="bg-gradient-primary">
                <Video className="w-4 h-4 mr-2" />
                Start Preview
              </Button>
            )}

            {isPreviewing && !isRecording && (
              <>
                <Button onClick={startRecording} className="bg-gradient-primary">
                  <Mic className="w-4 h-4 mr-2" />
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
      </div>
    </Card>
  );
};
