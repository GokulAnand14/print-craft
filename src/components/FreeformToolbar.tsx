import React from 'react';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignVerticalJustifyStart, 
  AlignVerticalJustifyCenter, 
  AlignVerticalJustifyEnd,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  RotateCw,
  Maximize2
} from 'lucide-react';
import type { FreeformElement } from '../types';

interface FreeformToolbarProps {
  selectedElement: FreeformElement | null;
  onUpdateSelected: (updates: Partial<FreeformElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onAlign: (alignment: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'centerSheet') => void;
  onConvertGridToFreeform: () => void;
  isGridEmpty: boolean;
}

export const FreeformToolbar: React.FC<FreeformToolbarProps> = ({
  selectedElement,
  onUpdateSelected,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onAlign,
  onConvertGridToFreeform,
  isGridEmpty,
}) => {
  return (
    <div className="h-9 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between select-none font-mono text-xs text-zinc-300">
      {selectedElement ? (
        <div className="flex items-center space-x-3 w-full">
          {/* Coordinates & Dimensions inputs */}
          <div className="flex items-center space-x-2 text-[11px]">
            <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              <span className="text-zinc-500">X:</span>
              <input
                type="number"
                value={selectedElement.xMm}
                onChange={(e) => onUpdateSelected({ xMm: Number(e.target.value) })}
                className="w-10 bg-transparent text-zinc-200 outline-none font-mono text-right"
              />
              <span className="text-zinc-500">mm</span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              <span className="text-zinc-500">Y:</span>
              <input
                type="number"
                value={selectedElement.yMm}
                onChange={(e) => onUpdateSelected({ yMm: Number(e.target.value) })}
                className="w-10 bg-transparent text-zinc-200 outline-none font-mono text-right"
              />
              <span className="text-zinc-500">mm</span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              <span className="text-zinc-500">W:</span>
              <input
                type="number"
                value={selectedElement.widthMm}
                onChange={(e) => onUpdateSelected({ widthMm: Math.max(5, Number(e.target.value)) })}
                className="w-10 bg-transparent text-zinc-200 outline-none font-mono text-right"
              />
              <span className="text-zinc-500">mm</span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
              <span className="text-zinc-500">H:</span>
              <input
                type="number"
                value={selectedElement.heightMm}
                onChange={(e) => onUpdateSelected({ heightMm: Math.max(5, Number(e.target.value)) })}
                className="w-10 bg-transparent text-zinc-200 outline-none font-mono text-right"
              />
              <span className="text-zinc-500">mm</span>
            </div>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Alignment Tools */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={() => onAlign('left')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Left Margin"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('centerH')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Center Horizontal"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('right')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Right Margin"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('top')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Top Margin"
            >
              <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('centerV')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Center Vertical"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('bottom')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Align Bottom Margin"
            >
              <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlign('centerSheet')}
              className="px-1.5 py-0.5 hover:bg-zinc-800 rounded text-[10px] text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Center on Sheet"
            >
              Center
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Z-Index & Rotation */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={() => onUpdateSelected({ rotation: (selectedElement.rotation + 90) % 360 })}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Rotate 90 deg"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBringToFront(selectedElement.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Bring to Front"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBringForward(selectedElement.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Bring Forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendBackward(selectedElement.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Send Backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSendToBack(selectedElement.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Send to Back"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Action buttons (Duplicate, Delete) */}
          <div className="flex items-center space-x-1 ml-auto">
            <button
              onClick={() => onDuplicate(selectedElement.id)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDelete(selectedElement.id)}
              className="p-1 hover:bg-rose-950/40 rounded text-zinc-400 hover:text-rose-400 transition-colors"
              title="Delete (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
            <span>Freeform Canvas Active</span>
            <span>•</span>
            <span>Click any object to transform, or drag images from left tray</span>
          </div>

          {!isGridEmpty && (
            <button
              onClick={onConvertGridToFreeform}
              className="h-6 px-2 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[10px] flex items-center gap-1 transition-colors"
              title="Import all current grid cells as freeform elements onto this canvas"
            >
              <Maximize2 className="w-3 h-3 text-zinc-400" />
              <span>Convert Grid Cells to Freeform</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
