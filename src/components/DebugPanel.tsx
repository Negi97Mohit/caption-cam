import { useDebug } from "@/context/DebugContext";

export const DebugPanel = () => {
  const { debugInfo } = useDebug();

  return (
    <div className="w-full space-y-3 text-xs font-mono">
      <div>
        <p className="font-bold text-muted-foreground">Raw Transcript:</p>
        <p className="mt-1 p-2 bg-black/30 rounded break-words">{debugInfo.rawTranscript || "..."}</p>
      </div>
      <div>
        <p className="font-bold text-muted-foreground">AI Response (JSON):</p>
        <pre className="mt-1 p-2 bg-black/30 rounded text-green-400 overflow-auto max-h-40">
          {JSON.stringify(debugInfo.aiResponse, null, 2) || "..."}
        </pre>
      </div>
      {debugInfo.error && (
        <div>
          <p className="font-bold text-red-500">Error:</p>
          <p className="mt-1 p-2 bg-red-900/50 rounded text-red-400 break-words">{debugInfo.error}</p>
        </div>
      )}
    </div>
  );
};