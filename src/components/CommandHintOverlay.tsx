import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface CommandHintOverlayProps {
  title: string;
  commands: string[];
  isVisible: boolean;
}

export const CommandHintOverlay = ({ title, commands, isVisible }: CommandHintOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Card className="absolute bottom-6 left-6 w-64 bg-background/80 backdrop-blur-sm animate-fade-in shadow-2xl">
      <CardHeader className="flex flex-row items-center space-x-2 pb-2">
        <Lightbulb className="h-5 w-5 text-yellow-400" />
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
          {commands.map((cmd, index) => (
            <li key={index} className="leading-tight">{cmd}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};