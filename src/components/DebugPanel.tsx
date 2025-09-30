// src/components/DebugPanel.tsx
import { useDebug } from "@/context/DebugContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export const DebugPanel = () => {
  const { debugInfo } = useDebug();

  return (
    <Card className="fixed bottom-4 right-4 z-[200] w-96 bg-gray-900/80 backdrop-blur-sm border-gray-700 text-white animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg text-white">AI Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs font-mono">
        <div>
          <p className="font-bold text-gray-400">Raw Transcript:</p>
          <p className="p-2 bg-black/50 rounded break-words">{debugInfo.rawTranscript || "..."}</p>
        </div>
        <div>
          <p className="font-bold text-gray-400">AI Response (JSON):</p>
          <pre className="p-2 bg-black/50 rounded text-green-400 overflow-auto max-h-40">
            {JSON.stringify(debugInfo.aiResponse, null, 2) || "..."}
          </pre>
        </div>
        {debugInfo.error && (
          <div>
            <p className="font-bold text-red-400">Error:</p>
            <p className="p-2 bg-black/50 rounded text-red-400 break-words">{debugInfo.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};