    import React from 'react';
import { Rnd } from 'react-rnd';
import { cn } from '@/lib/utils';
import { GeneratedOverlay } from '@/types/caption';
import { AmbientEffectsOverlay } from './AmbientEffectsOverlay';

interface DraggableAmbientEffectProps {
  overlay: GeneratedOverlay;
  onLayoutChange: (id: string, key: 'position' | 'size', value: any) => void;
  onRemove: (id: string) => void;
  containerSize: { width: number; height: number };
  onSelect: (id: string) => void;
  isSelected: boolean;
}

export const DraggableAmbientEffect: React.FC<DraggableAmbientEffectProps> = ({
  overlay,
  onLayoutChange,
  onRemove,
  containerSize,
  onSelect,
  isSelected,
}) => {
  if (!containerSize.width || !containerSize.height || !overlay.ambientEffect) {
    return null;
  }

  const position = {
    x: (overlay.layout.position.x / 100) * containerSize.width,
    y: (overlay.layout.position.y / 100) * containerSize.height,
  };
  const size = {
    width: (overlay.layout.size.width / 100) * containerSize.width,
    height: (overlay.layout.size.height / 100) * containerSize.height,
  };

  return (
    <Rnd
      size={size}
      position={position}
      minWidth={50}
      minHeight={50}
      bounds="parent"
      onDragStop={(e, d) =>
        onLayoutChange(overlay.id, 'position', {
          x: (d.x / containerSize.width) * 100,
          y: (d.y / containerSize.height) * 100,
        })
      }
      onResizeStop={(e, direction, ref, delta, pos) => {
        onLayoutChange(overlay.id, 'size', {
          width: (parseInt(ref.style.width, 10) / containerSize.width) * 100,
          height: (parseInt(ref.style.height, 10) / containerSize.height) * 100,
        });
        onLayoutChange(overlay.id, 'position', {
          x: (pos.x / containerSize.width) * 100,
          y: (pos.y / containerSize.height) * 100,
        });
      }}
      onDragStart={() => onSelect(overlay.id)}
      style={{ zIndex: overlay.layout.zIndex }}
      className={cn(
        'border-2 border-dashed group pointer-events-auto transition-colors overflow-hidden', // Added overflow-hidden
        isSelected
          ? 'border-primary border-solid'
          : 'border-transparent hover:border-primary/50',
      )}
    >
      <div
        id={overlay.id}
        onClick={() => onSelect(overlay.id)}
        className="w-full h-full relative"
      >
        <AmbientEffectsOverlay effect={overlay.ambientEffect} />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(overlay.id);
        }}
        className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 text-xs font-bold"
      >
        ×
      </button>
    </Rnd>
  );
};
