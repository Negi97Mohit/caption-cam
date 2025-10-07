// src/components/LayoutControls.tsx
import React from "react";
import { LayoutMode, CameraShape } from "@/types/caption";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Layout, Circle, Square, RectangleHorizontal, SplitSquareVertical, SplitSquareHorizontal, Image, Upload } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

interface LayoutControlsProps {
  layoutMode: LayoutMode;
  cameraShape: CameraShape;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onCameraShapeChange: (shape: CameraShape) => void;
  onCustomMaskUpload?: (file: File) => void;
}

export const LayoutControls = ({
  layoutMode,
  cameraShape,
  onLayoutModeChange,
  onCameraShapeChange,
  onCustomMaskUpload,
}: LayoutControlsProps) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onCustomMaskUpload) {
      onCustomMaskUpload(file);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Layout className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Layout Mode</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onLayoutModeChange('split-vertical')}>
          <SplitSquareVertical className="w-4 h-4 mr-2" />
          Split Vertical
          {layoutMode === 'split-vertical' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onLayoutModeChange('split-horizontal')}>
          <SplitSquareHorizontal className="w-4 h-4 mr-2" />
          Split Horizontal
          {layoutMode === 'split-horizontal' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onLayoutModeChange('pip')}>
          <Image className="w-4 h-4 mr-2" />
          Picture in Picture
          {layoutMode === 'pip' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Camera Shape</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onCameraShapeChange('rectangle')}>
          <Square className="w-4 h-4 mr-2" />
          Rectangle
          {cameraShape === 'rectangle' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCameraShapeChange('rounded')}>
          <RectangleHorizontal className="w-4 h-4 mr-2" />
          Rounded
          {cameraShape === 'rounded' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCameraShapeChange('circle')}>
          <Circle className="w-4 h-4 mr-2" />
          Circle
          {cameraShape === 'circle' && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        
        {onCustomMaskUpload && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <Label htmlFor="mask-upload" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-2 hover:text-foreground">
                <Upload className="w-4 h-4" />
                Upload Custom Mask
              </Label>
              <Input
                id="mask-upload"
                type="file"
                accept="image/svg+xml,image/png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};