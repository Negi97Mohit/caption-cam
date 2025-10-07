// src/types/layout.ts
export type LayoutMode = 'split-vertical' | 'split-horizontal' | 'pip';
export type CameraShape = 'rectangle' | 'circle' | 'rounded';

export interface LayoutState {
  mode: LayoutMode;
  cameraShape: CameraShape;
  splitRatio: number; // 0 to 1, represents divider position
  pipPosition: { x: number; y: number }; // percentage based
  pipSize: { width: number; height: number }; // percentage based
  customMaskUrl?: string;
}

export const DEFAULT_LAYOUT_STATE: LayoutState = {
  mode: 'pip',
  cameraShape: 'rectangle',
  splitRatio: 0.5,
  pipPosition: { x: 75, y: 75 }, // bottom-right corner by default
  pipSize: { width: 20, height: 20 },
};