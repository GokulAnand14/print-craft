import React, { useState, useRef, useEffect } from 'react';
import { Move } from 'lucide-react';
import { PAPER_SIZES } from '../types';
import type { FreeformElement, ImageItem, LayoutSettings } from '../types';

interface FreeformCanvasProps {
  elements: FreeformElement[];
  settings: LayoutSettings;
  imagesMap: Map<string, ImageItem>;
  zoom: number;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<FreeformElement>) => void;
  onAddElement: (element: FreeformElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot' | 'drag';

export const FreeformCanvas: React.FC<FreeformCanvasProps> = ({
  elements,
  settings,
  imagesMap,
  zoom,
  selectedId,
  onSelectElement,
  onUpdateElement,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
}) => {
  const paper = PAPER_SIZES[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';

  const pageWidthMm = isLandscape ? paper.heightMm : paper.widthMm;
  const pageHeightMm = isLandscape ? paper.widthMm : paper.heightMm;

  // Base scale: 1mm = 3.6 screen px
  const baseScale = 3.6;
  const sheetWidthPx = pageWidthMm * baseScale;
  const sheetHeightPx = pageHeightMm * baseScale;

  const { margins, cutGuides, globalFilters } = settings;

  // Dragging / Resizing interaction states
  const [activeInteraction, setActiveInteraction] = useState<{
    type: HandleType;
    elementId: string;
    startX: number;
    startY: number;
    initialElem: FreeformElement;
  } | null>(null);

  // Active snap lines [ { type: 'x' | 'y', posMm: number } ]
  const [snapLines, setSnapLines] = useState<{ type: 'x' | 'y'; posMm: number }[]>([]);

  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle Drop of Image onto Freeform Canvas
  const handleSheetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData('text/plain');
    if (!imageId || !imagesMap.has(imageId) || !sheetRef.current) return;

    const img = imagesMap.get(imageId)!;
    const rect = sheetRef.current.getBoundingClientRect();

    // Mouse coordinates inside sheet in mm
    const mouseXPx = (e.clientX - rect.left) / zoom;
    const mouseYPx = (e.clientY - rect.top) / zoom;

    const mouseXMm = mouseXPx / baseScale;
    const mouseYMm = mouseYPx / baseScale;

    // Calculate natural proportion for initial size (target width ~75mm)
    const rot = (img.rotation % 360 + 360) % 360;
    const isSwapped = rot === 90 || rot === 270;
    const naturalW = isSwapped ? img.originalHeight : img.originalWidth;
    const naturalH = isSwapped ? img.originalWidth : img.originalHeight;
    const aspect = (naturalW || 800) / (naturalH || 600);

    const defaultWidthMm = Math.min(80, pageWidthMm - margins.leftMm - margins.rightMm);
    const defaultHeightMm = defaultWidthMm / aspect;

    const maxZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

    const newElement: FreeformElement = {
      id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      imageId,
      xMm: Math.max(0, Math.min(pageWidthMm - defaultWidthMm, mouseXMm - defaultWidthMm / 2)),
      yMm: Math.max(0, Math.min(pageHeightMm - defaultHeightMm, mouseYMm - defaultHeightMm / 2)),
      widthMm: Math.round(defaultWidthMm * 10) / 10,
      heightMm: Math.round(defaultHeightMm * 10) / 10,
      rotation: 0,
      zIndex: maxZ + 1,
      aspectRatioLocked: true,
      borderWidthMm: 0,
    };

    onAddElement(newElement);
    onSelectElement(newElement.id);
  };

  // Start Move or Resize Handle interaction
  const handlePointerDown = (
    e: React.PointerEvent,
    type: HandleType,
    element: FreeformElement
  ) => {
    e.stopPropagation();
    onSelectElement(element.id);

    if (element.locked && type !== 'drag') return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setActiveInteraction({
      type,
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      initialElem: { ...element },
    });
  };

  // Window pointer move and pointer up listeners
  useEffect(() => {
    if (!activeInteraction) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { type, elementId, startX, startY, initialElem } = activeInteraction;
      const dxPx = (e.clientX - startX) / zoom;
      const dyPx = (e.clientY - startY) / zoom;

      const dxMm = dxPx / baseScale;
      const dyMm = dyPx / baseScale;

      let newX = initialElem.xMm;
      let newY = initialElem.yMm;
      let newW = initialElem.widthMm;
      let newH = initialElem.heightMm;
      let newRot = initialElem.rotation;

      const aspect = initialElem.widthMm / initialElem.heightMm;
      const isShift = e.shiftKey || initialElem.aspectRatioLocked;

      if (type === 'drag') {
        newX = initialElem.xMm + dxMm;
        newY = initialElem.yMm + dyMm;

        // Snapping logic (5mm snap tolerance)
        const snapThresholdMm = 2.5;
        const newSnapLines: { type: 'x' | 'y'; posMm: number }[] = [];

        // Snap X to center of sheet or margins
        const centerX = pageWidthMm / 2;
        if (Math.abs(newX + newW / 2 - centerX) < snapThresholdMm) {
          newX = centerX - newW / 2;
          newSnapLines.push({ type: 'x', posMm: centerX });
        } else if (Math.abs(newX - margins.leftMm) < snapThresholdMm) {
          newX = margins.leftMm;
          newSnapLines.push({ type: 'x', posMm: margins.leftMm });
        } else if (Math.abs(newX + newW - (pageWidthMm - margins.rightMm)) < snapThresholdMm) {
          newX = pageWidthMm - margins.rightMm - newW;
          newSnapLines.push({ type: 'x', posMm: pageWidthMm - margins.rightMm });
        }

        // Snap Y to center of sheet or margins
        const centerY = pageHeightMm / 2;
        if (Math.abs(newY + newH / 2 - centerY) < snapThresholdMm) {
          newY = centerY - newH / 2;
          newSnapLines.push({ type: 'y', posMm: centerY });
        } else if (Math.abs(newY - margins.topMm) < snapThresholdMm) {
          newY = margins.topMm;
          newSnapLines.push({ type: 'y', posMm: margins.topMm });
        } else if (Math.abs(newY + newH - (pageHeightMm - margins.bottomMm)) < snapThresholdMm) {
          newY = pageHeightMm - margins.bottomMm - newH;
          newSnapLines.push({ type: 'y', posMm: pageHeightMm - margins.bottomMm });
        }

        setSnapLines(newSnapLines);
      } else if (type === 'rot') {
        // Calculate angle between center of element and pointer
        if (sheetRef.current) {
          const rect = sheetRef.current.getBoundingClientRect();
          const elemCenterXPx = (initialElem.xMm + initialElem.widthMm / 2) * baseScale;
          const elemCenterYPx = (initialElem.yMm + initialElem.heightMm / 2) * baseScale;
          const mouseXPx = (e.clientX - rect.left) / zoom;
          const mouseYPx = (e.clientY - rect.top) / zoom;

          const rad = Math.atan2(mouseYPx - elemCenterYPx, mouseXPx - elemCenterXPx);
          let deg = Math.round((rad * 180) / Math.PI) + 90;
          if (e.shiftKey) deg = Math.round(deg / 15) * 15; // 15 deg snap with Shift
          newRot = (deg % 360 + 360) % 360;
        }
      } else {
        // Resize handles
        if (type.includes('e')) newW = Math.max(10, initialElem.widthMm + dxMm);
        if (type.includes('s')) newH = Math.max(10, initialElem.heightMm + dyMm);
        if (type.includes('w')) {
          const proposedW = Math.max(10, initialElem.widthMm - dxMm);
          newX = initialElem.xMm + (initialElem.widthMm - proposedW);
          newW = proposedW;
        }
        if (type.includes('n')) {
          const proposedH = Math.max(10, initialElem.heightMm - dyMm);
          newY = initialElem.yMm + (initialElem.heightMm - proposedH);
          newH = proposedH;
        }

        // Lock aspect ratio
        if (isShift) {
          if (type === 'e' || type === 'w' || type === 'se' || type === 'sw') {
            newH = newW / aspect;
          } else {
            newW = newH * aspect;
          }
        }
      }

      onUpdateElement(elementId, {
        xMm: Math.round(newX * 10) / 10,
        yMm: Math.round(newY * 10) / 10,
        widthMm: Math.round(newW * 10) / 10,
        heightMm: Math.round(newH * 10) / 10,
        rotation: newRot,
      });
    };

    const handlePointerUp = () => {
      setActiveInteraction(null);
      setSnapLines([]);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeInteraction, zoom, pageWidthMm, pageHeightMm, margins, onUpdateElement]);

  // Keyboard shortcut listener (Delete, Nudge, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedId);
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onDuplicateElement(selectedId);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5; // mm
        const elem = elements.find((el) => el.id === selectedId);
        if (!elem) return;

        let { xMm, yMm } = elem;
        if (e.key === 'ArrowLeft') xMm -= step;
        if (e.key === 'ArrowRight') xMm += step;
        if (e.key === 'ArrowUp') yMm -= step;
        if (e.key === 'ArrowDown') yMm += step;

        onUpdateElement(selectedId, {
          xMm: Math.round(xMm * 10) / 10,
          yMm: Math.round(yMm * 10) / 10,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, onDeleteElement, onDuplicateElement, onUpdateElement]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectElement(null);
      }}
      className="flex-1 overflow-auto bg-[#121214] flex items-center justify-center p-8 relative select-none"
    >
      {/* Zoom transform container */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: activeInteraction ? 'none' : 'transform 0.12s ease-out',
        }}
        className="relative"
      >
        {/* Printable Physical Sheet Canvas */}
        <div
          ref={sheetRef}
          id="printable-sheet"
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectElement(null);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleSheetDrop}
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
          }}
          className="bg-white text-zinc-900 shadow-2xl relative overflow-hidden"
        >
          {/* Margin Bounds (Technical boundary guide) */}
          <div
            style={{
              top: `${margins.topMm * baseScale}px`,
              bottom: `${margins.bottomMm * baseScale}px`,
              left: `${margins.leftMm * baseScale}px`,
              right: `${margins.rightMm * baseScale}px`,
            }}
            className="absolute border border-dashed border-zinc-400/60 pointer-events-none z-10"
          />

          {/* Active Dynamic Snap Guide Lines */}
          {snapLines.map((snap, idx) => (
            <div
              key={idx}
              style={{
                [snap.type === 'x' ? 'left' : 'top']: `${snap.posMm * baseScale}px`,
                [snap.type === 'x' ? 'width' : 'height']: '1px',
                [snap.type === 'x' ? 'height' : 'width']: '100%',
              }}
              className="absolute bg-sky-500 z-30 pointer-events-none"
            />
          ))}

          {/* Freeform Elements */}
          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const item = imagesMap.get(el.imageId);
            if (!item) return null;

            const xPx = el.xMm * baseScale;
            const yPx = el.yMm * baseScale;
            const wPx = el.widthMm * baseScale;
            const hPx = el.heightMm * baseScale;

            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, 'drag', el)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                }}
                style={{
                  transform: `translate(${xPx}px, ${yPx}px) rotate(${el.rotation}deg)`,
                  width: `${wPx}px`,
                  height: `${hPx}px`,
                  zIndex: el.zIndex,
                  touchAction: 'none',
                  userSelect: 'none',
                }}
                className={`absolute group cursor-move select-none ${
                  isSelected ? 'ring-2 ring-zinc-950 shadow-lg' : 'hover:ring-1 hover:ring-zinc-400/60'
                }`}
              >
                {/* Element Image */}
                <div className="w-full h-full relative overflow-hidden pointer-events-none select-none">
                  <img
                    src={item.src}
                    alt={item.name}
                    draggable={false}
                    style={{
                      transform: `rotate(${item.rotation}deg) scaleX(${
                        (item.filters.flipHorizontal !== globalFilters.flipHorizontal) ? -1 : 1
                      }) scaleY(${
                        (item.filters.flipVertical !== globalFilters.flipVertical) ? -1 : 1
                      })`,
                      filter: (item.filters.highContrastBw || globalFilters.highContrastBw)
                        ? 'grayscale(100%) contrast(350%)'
                        : (item.filters.grayscale || globalFilters.grayscale)
                        ? 'grayscale(100%)'
                        : 'none',
                    }}
                    className="w-full h-full object-fill select-none pointer-events-none"
                  />
                </div>

                {/* 1px outline border if enabled */}
                {(el.borderWidthMm || cutGuides.showCardBorders) && (
                  <div
                    style={{
                      border: `${(el.borderWidthMm || cutGuides.cardBorderWidthMm || 0.2) * baseScale}px solid ${el.borderColor || cutGuides.cardBorderColor || '#18181b'}`,
                    }}
                    className="absolute inset-0 pointer-events-none"
                  />
                )}

                {/* Corner Crop Ticks for freeform element */}
                {cutGuides.enabled && cutGuides.type === 'corner-marks' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div style={{ left: '-8px', top: '0', width: '8px', height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ left: '0', top: '-8px', width: '1px', height: '8px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ right: '-8px', top: '0', width: '8px', height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ right: '0', top: '-8px', width: '1px', height: '8px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ left: '-8px', bottom: '0', width: '8px', height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ left: '0', bottom: '-8px', width: '1px', height: '8px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ right: '-8px', bottom: '0', width: '8px', height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                    <div style={{ right: '0', bottom: '-8px', width: '1px', height: '8px', backgroundColor: cutGuides.color }} className="absolute" />
                  </div>
                )}

                {/* Transform Bounding Box & 8 Handles (Active Selection Only) */}
                {isSelected && (
                  <>
                    {/* Bounding box outline */}
                    <div className="absolute inset-0 border border-zinc-950 pointer-events-none" />

                    {/* Rotation Handle stem & circle */}
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'rot', el)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'grab' }}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-white border border-zinc-950 rounded-full active:cursor-grabbing flex items-center justify-center shadow-md z-30 hover:scale-110 transition-transform"
                      title="Drag to Rotate (Hold Shift for 15° steps)"
                    >
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                    </div>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 h-7 w-px bg-zinc-950 pointer-events-none" />

                    {/* 8 Corner & Edge Resize Handles */}
                    {[
                      { handle: 'nw', cursor: 'nwse-resize', pos: '-top-1.5 -left-1.5' },
                      { handle: 'n', cursor: 'ns-resize', pos: '-top-1.5 left-1/2 -translate-x-1/2' },
                      { handle: 'ne', cursor: 'nesw-resize', pos: '-top-1.5 -right-1.5' },
                      { handle: 'e', cursor: 'ew-resize', pos: 'top-1/2 -translate-y-1/2 -right-1.5' },
                      { handle: 'se', cursor: 'nwse-resize', pos: '-bottom-1.5 -right-1.5' },
                      { handle: 's', cursor: 'ns-resize', pos: '-bottom-1.5 left-1/2 -translate-x-1/2' },
                      { handle: 'sw', cursor: 'nesw-resize', pos: '-bottom-1.5 -left-1.5' },
                      { handle: 'w', cursor: 'ew-resize', pos: 'top-1/2 -translate-y-1/2 -left-1.5' },
                    ].map((h) => (
                      <div
                        key={h.handle}
                        onPointerDown={(e) => handlePointerDown(e, h.handle as HandleType, el)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: h.cursor }}
                        className={`absolute ${h.pos} w-3 h-3 bg-white border border-zinc-950 shadow-sm z-30 hover:bg-zinc-200 transition-colors`}
                      />
                    ))}

                    {/* Real-time dimension HUD tooltip */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-zinc-100 font-mono text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-40 border border-zinc-700">
                      {el.widthMm} × {el.heightMm} mm • X:{el.xMm} Y:{el.yMm}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Empty sheet guidance overlay if no items */}
          {elements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 pointer-events-none font-mono">
              <Move className="w-6 h-6 mb-2 text-zinc-400" />
              <span className="text-xs text-zinc-600 font-semibold uppercase">Freeform Canvas Mode</span>
              <span className="text-[10px] text-zinc-400 mt-1">Drag and drop images anywhere onto this sheet</span>
            </div>
          )}

          {/* Technical Sheet Stamp */}
          <div
            style={{
              bottom: `${Math.max(2, margins.bottomMm / 2) * baseScale}px`,
              left: `${margins.leftMm * baseScale}px`,
              right: `${margins.rightMm * baseScale}px`,
            }}
            className="absolute flex items-center justify-between text-[8px] text-zinc-400 font-mono pointer-events-none select-none px-1 uppercase"
          >
            <span>{paper.name.split(' ')[0]} • FREEFORM MODE</span>
            <span>{elements.length} OBJECTS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
