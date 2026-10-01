import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Trash2, 
  RotateCw, 
  Copy, 
  Grid, 
  Clipboard, 
  FileCheck2,
  FolderOpen,
  Plus
} from 'lucide-react';
import type { ImageItem } from '../types';
import { fileToImageItem } from '../utils/imageProcessing';

interface ImageTrayProps {
  images: ImageItem[];
  onAddImages: (newImages: ImageItem[]) => void;
  onRemoveImage: (id: string) => void;
  onRotateImage: (id: string) => void;
  onDuplicateImage: (id: string) => void;
  onFillGridWithImage: (id: string) => void;
  onAutoDistributeAll: () => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
  onPlaceOnSheet: (imageId: string) => void;
  isOpen: boolean;
}

export const ImageTray: React.FC<ImageTrayProps> = ({
  images,
  onAddImages,
  onRemoveImage,
  onRotateImage,
  onDuplicateImage,
  onFillGridWithImage,
  onAutoDistributeAll,
  onClearAll,
  onLoadSamples,
  onPlaceOnSheet,
  isOpen,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const item = await fileToImageItem(file);
          newItems.push(item);
        } catch (e) {
          console.error('Error loading image', file.name, e);
        }
      }
    }

    if (newItems.length > 0) {
      onAddImages(newItems);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handlePasteClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const newItems: ImageItem[] = [];
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `clipboard_${Date.now()}.png`, { type });
            const imgItem = await fileToImageItem(file);
            newItems.push(imgItem);
          }
        }
      }
      if (newItems.length > 0) {
        onAddImages(newItems);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-900/90 flex flex-col h-[calc(100vh-3rem-3.5rem)] select-none shrink-0 text-zinc-300">
      {/* Tray Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono font-medium text-zinc-200 uppercase tracking-wide">
            Source Files
          </span>
          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">
            {images.length}
          </span>
        </div>

        {images.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Remove all loaded images"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Drop / Import Box */}
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded p-3 text-center cursor-pointer transition-colors ${
            isDraggingOver
              ? 'border-zinc-400 bg-zinc-800/80'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center space-y-1">
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-300">
              Import Files (Drop / Click)
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              PNG, JPG, WEBP, SVG
            </span>
          </div>
        </div>

        {/* Action utility row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handlePasteClipboard}
            className="h-7 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] font-mono text-zinc-300 hover:text-zinc-100 flex items-center justify-center gap-1 transition-colors"
            title="Paste from clipboard"
          >
            <Clipboard className="w-3 h-3 text-zinc-400" />
            <span>Paste (Ctrl+V)</span>
          </button>

          <button
            onClick={onLoadSamples}
            className="h-7 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] font-mono text-zinc-300 hover:text-zinc-100 flex items-center justify-center gap-1 transition-colors"
            title="Load calibration test targets"
          >
            <FileCheck2 className="w-3 h-3 text-zinc-400" />
            <span>Test Targets</span>
          </button>
        </div>
      </div>

      {/* Batch Auto-Tile Action */}
      {images.length > 0 && (
        <div className="p-2 border-b border-zinc-800 bg-zinc-950/40">
          <button
            onClick={onAutoDistributeAll}
            className="w-full h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] font-mono text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            title="Sequentially fill all grid cells across sheets"
          >
            <Grid className="w-3.5 h-3.5 text-zinc-400" />
            <span>Auto-Tile Across Sheets</span>
          </button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {images.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-zinc-600 font-mono text-xs">
            <span>No images loaded</span>
            <span className="text-[10px] mt-1 text-zinc-500">Drop files or press Ctrl+V</span>
          </div>
        ) : (
          images.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded p-1.5 flex items-center space-x-2.5 cursor-grab active:cursor-grabbing transition-colors group"
              title="Click or drag onto sheet"
            >
              {/* Thumbnail (Click to place) */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaceOnSheet(item.id);
                }}
                className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-zinc-500 relative"
                title="Click to place on active sheet"
              >
                <img
                  src={item.src}
                  alt={item.name}
                  draggable={false}
                  style={{
                    transform: `rotate(${item.rotation}deg)`,
                  }}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                />
              </div>

              {/* Metadata & Actions */}
              <div className="flex-1 min-w-0">
                <div 
                  onClick={() => onPlaceOnSheet(item.id)}
                  className="text-[11px] font-mono text-zinc-200 truncate cursor-pointer hover:text-white" 
                  title="Click to place on active sheet"
                >
                  {item.name}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {item.originalWidth} × {item.originalHeight} px
                </div>

                {/* Micro Actions */}
                <div className="flex items-center space-x-2 mt-1">
                  <button
                    onClick={() => onPlaceOnSheet(item.id)}
                    className="h-4 px-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded text-[9px] flex items-center gap-0.5 transition-colors font-mono"
                    title="Place on active sheet"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Place</span>
                  </button>
                  <button
                    onClick={() => onRotateImage(item.id)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Rotate 90 deg"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onFillGridWithImage(item.id)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Fill all slots on sheet"
                  >
                    <Grid className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDuplicateImage(item.id)}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Duplicate entry"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemoveImage(item.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
