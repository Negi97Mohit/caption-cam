// src/components/DraggableGraph.tsx
import { cn } from "@/lib/utils";
import React, { useRef } from 'react';
import { GraphObject } from '@/types/caption';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Move, X, Maximize2 } from 'lucide-react'; // Import Maximize2 for resize icon

interface DraggableGraphProps {
  graph: GraphObject;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onResize: (id: string, size: { width: number; height: number }) => void; // ADDED
  onDelete: (id: string) => void;
  isFocused: boolean;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

export const DraggableGraph = ({ graph, onPositionChange, onResize, onDelete, isFocused }: DraggableGraphProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  
  // --- DRAG LOGIC ---
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent dragging when clicking on delete, chart content, or resize handle
    if ((e.target as HTMLElement).closest('.delete-btn, .recharts-wrapper, .resize-handle')) return;
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Find and replace the onMouseMove function in DraggableGraph.tsx
  const onMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const parentRect = dragRef.current.parentElement!.getBoundingClientRect();
    const elementRect = dragRef.current.getBoundingClientRect(); // Get element's own size

    // Calculate the new top-left position relative to the parent
    const newLeft = e.clientX - parentRect.left - offset.current.x;
    const newTop = e.clientY - parentRect.top - offset.current.y;

    // CORRECTED: Calculate the new CENTER of the element
    const newCenterX = newLeft + elementRect.width / 2;
    const newCenterY = newTop + elementRect.height / 2;

    // Convert the center coordinates to percentages
    const x = (newCenterX / parentRect.width) * 100;
    const y = (newCenterY / parentRect.height) * 100;

    // Apply bounds to keep the graph from going too far off-screen
    onPositionChange(graph.id, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };
  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  
  // --- RESIZE LOGIC (NEW) ---
  const onResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragRef.current) return;
    const startRect = dragRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const onResizeMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startRect.width + (moveEvent.clientX - startX);
        const newHeight = startRect.height + (moveEvent.clientY - startY);
        onResize(graph.id, { width: Math.max(newWidth, 200), height: Math.max(newHeight, 150) });
    };

    const onResizeMouseUp = () => {
        document.removeEventListener("mousemove", onResizeMouseMove);
        document.removeEventListener("mouseup", onResizeMouseUp);
    };

    document.addEventListener("mousemove", onResizeMouseMove);
    document.addEventListener("mouseup", onResizeMouseUp);
  };

  const renderChart = () => {
    // ... (renderChart function remains the same)
     if (!graph.data || graph.data.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-center p-4">
          <p>Graph created. <br /> Now, add some data points by speaking.</p>
        </div>
      );
    }
    switch (graph.graphType) {
      case 'bar':
        return (
          <BarChart data={graph.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" name={graph.config.xAxisLabel} />
            <YAxis name={graph.config.yAxisLabel} />
            <Tooltip cursor={{fill: 'rgba(206, 206, 206, 0.2)'}} />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name={graph.config.yAxisLabel || 'Value'} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={graph.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" name={graph.config.xAxisLabel} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#82ca9d" name={graph.config.yAxisLabel || 'Value'}/>
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie data={graph.data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {graph.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      default:
        return <div>Unsupported graph type</div>;
    }
  };

  return (
    <div
      ref={dragRef}
      className={cn(
        "group absolute bg-card/80 backdrop-blur-sm border rounded-lg shadow-2xl p-4 cursor-move transition-all duration-300",
        isFocused && "ring-4 ring-primary ring-offset-2 ring-offset-background"
      )}
      style={{
        left: `${graph.position.x}%`,
        top: `${graph.position.y}%`,
        width: `${graph.size.width}px`,
        height: `${graph.size.height}px`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.3s ease-in-out',
      }}
      onMouseDown={onMouseDown}
    >
      <Move className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-5 text-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        className="delete-btn absolute -top-3 -right-3 z-10 h-8 w-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
        onClick={() => onDelete(graph.id)}
        title="Delete graph"
      >
        <X className="h-4 w-4 text-white" />
      </button>

      <h3 className="text-lg font-semibold text-center mb-2 text-card-foreground">{graph.config.title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        {renderChart()}
      </ResponsiveContainer>
      
      {/* NEW: Resize Handle */}
      <div
        className="resize-handle absolute -bottom-2 -right-2 h-5 w-5 bg-primary rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        onMouseDown={onResizeMouseDown}
      >
        <Maximize2 className="h-3 w-3 text-primary-foreground" />
      </div>
    </div>
  );
};