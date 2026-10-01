import React, { useState } from 'react';
import { 
  RotateCw, 
  Trash2, 
  Maximize, 
  Minimize, 
  Plus, 
  Grid
} from 'lucide-react';
import { PAPER_SIZES } from '../types';
import type { DocumentPage, FitMode, ImageItem, LayoutSettings } from '../types';

interface PrintCanvasProps {
  currentPage: DocumentPage;
  settings: LayoutSettings;
  imagesMap: Map<string, ImageItem>;
  zoom: number;
  onSetCellImage: (cellIndex: number, imageId: string | null) => void;
  onSwapCells: (sourceIndex: number, targetIndex: number) => void;
  onRotateImage: (imageId: string) => void;
  onToggleCellFit: (imageId: string) => void;
  onFillGridWithImage: (imageId: string) => void;
}

export const PrintCanvas: React.FC<PrintCanvasProps> = ({
  currentPage,
  settings,
  imagesMap,
  zoom,
  onSetCellImage,
  onSwapCells,
  onRotateImage,
  onToggleCellFit,
  onFillGridWithImage,
}) => {
  const paper = PAPER_SIZES[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';

  const pageWidthMm = isLandscape ? paper.heightMm : paper.widthMm;
  const pageHeightMm = isLandscape ? paper.widthMm : paper.heightMm;

  // Visual pixel scale at 100% zoom: 1mm = 3.6 px
  const baseScale = 3.6;
  const sheetWidthPx = pageWidthMm * baseScale;
  const sheetHeightPx = pageHeightMm * baseScale;

  const { rows, cols, margins, gapMm, fitMode, cutGuides, globalFilters } = settings;

  const gapX = settings.gapXmm ?? gapMm;
  const gapY = settings.gapYmm ?? gapMm;

  const usableWidthMm = Math.max(10, pageWidthMm - margins.leftMm - margins.rightMm);
  const usableHeightMm = Math.max(10, pageHeightMm - margins.topMm - margins.bottomMm);

  const totalGapsX = Math.max(0, cols - 1) * gapX;
  const totalGapsY = Math.max(0, rows - 1) * gapY;

  const cellWidthMm = Math.max(5, (usableWidthMm - totalGapsX) / cols);
  const cellHeightMm = Math.max(5, (usableHeightMm - totalGapsY) / rows);

  const totalGridWidthMm = cols * cellWidthMm + totalGapsX;
  const totalGridHeightMm = rows * cellHeightMm + totalGapsY;

  const startXMm = settings.centerGridOnPage
    ? margins.leftMm + Math.max(0, (usableWidthMm - totalGridWidthMm) / 2)
    : margins.leftMm;
  const startYMm = settings.centerGridOnPage
    ? margins.topMm + Math.max(0, (usableHeightMm - totalGridHeightMm) / 2)
    : margins.topMm;

  const [dragOverCell, setDragOverCell] = useState<number | null>(null);

  const handleCellDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverCell(null);

    const cellSourceRaw = e.dataTransfer.getData('application/x-cell-source');
    if (cellSourceRaw) {
      const sourceIndex = parseInt(cellSourceRaw, 10);
      if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
        onSwapCells(sourceIndex, targetIndex);
        return;
      }
    }

    const imageId = e.dataTransfer.getData('text/plain');
    if (imageId) {
      onSetCellImage(targetIndex, imageId);
    }
  };

  const totalCells = rows * cols;
  const cells = Array.from({ length: totalCells }, (_, i) => i);

  return (
    <div className="flex-1 overflow-auto bg-[#121214] flex items-center justify-center p-8 relative select-none">
      {/* Zoom transform container */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.12s ease-out',
        }}
        className="relative"
      >
        {/* Physical Sheet Canvas */}
        <div
          id="printable-sheet"
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
          }}
          className="bg-white text-zinc-900 shadow-xl relative overflow-hidden"
        >
          {/* Margin Boundary (Technical dashed guide) */}
          <div
            style={{
              top: `${margins.topMm * baseScale}px`,
              bottom: `${margins.bottomMm * baseScale}px`,
              left: `${margins.leftMm * baseScale}px`,
              right: `${margins.rightMm * baseScale}px`,
            }}
            className="absolute border border-dashed border-zinc-400/60 pointer-events-none z-10"
          />

          {/* Grid Cells Container */}
          <div
            style={{
              top: `${startYMm * baseScale}px`,
              left: `${startXMm * baseScale}px`,
              width: `${totalGridWidthMm * baseScale}px`,
              height: `${totalGridHeightMm * baseScale}px`,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${cellWidthMm * baseScale}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellHeightMm * baseScale}px)`,
              columnGap: `${gapX * baseScale}px`,
              rowGap: `${gapY * baseScale}px`,
            }}
            className="absolute"
          >
            {cells.map((cellIdx) => {
              const imageId = currentPage.cells[cellIdx];
              const item = imageId ? imagesMap.get(imageId) : null;
              const isOver = dragOverCell === cellIdx;
              const effectiveFit: FitMode = (item?.customFitMode || fitMode);

              return (
                <div
                  key={cellIdx}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCell(cellIdx);
                  }}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={(e) => handleCellDrop(e, cellIdx)}
                  style={{
                    border: cutGuides.showCardBorders
                      ? `${(cutGuides.cardBorderWidthMm || 0.2) * baseScale}px solid ${cutGuides.cardBorderColor || '#18181b'}`
                      : undefined,
                    padding: `${(settings.cellPadding?.topMm ?? 0) * baseScale}px ${(settings.cellPadding?.rightMm ?? 0) * baseScale}px ${(settings.cellPadding?.bottomMm ?? 0) * baseScale}px ${(settings.cellPadding?.leftMm ?? 0) * baseScale}px`,
                    boxSizing: 'border-box',
                  }}
                  className={`relative group overflow-hidden flex items-center justify-center ${
                    isOver ? 'ring-1 ring-zinc-900 bg-zinc-100' : ''
                  } ${
                    !item ? 'bg-zinc-50 border border-zinc-200' : 'bg-white'
                  }`}
                >
                  {item ? (
                    <>
                      {/* Cell Image Handle */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/x-cell-source', cellIdx.toString());
                          e.dataTransfer.setData('text/plain', item.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden"
                      >
                        <img
                          src={item.src}
                          alt={item.name}
                          draggable={false}
                          style={{
                            width: effectiveFit === 'cover' ? '100%' : 'auto',
                            height: effectiveFit === 'cover' ? '100%' : 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: effectiveFit,
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
                          className="pointer-events-none select-none"
                        />
                      </div>

                      {/* Technical Hover Controls */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 text-zinc-100 rounded px-1 py-0.5 flex items-center gap-1 border border-zinc-700 z-20">
                        <button
                          onClick={() => onRotateImage(item.id)}
                          className="p-1 hover:text-white transition-colors"
                          title="Rotate 90 deg"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onToggleCellFit(item.id)}
                          className="p-1 hover:text-white transition-colors"
                          title={effectiveFit === 'contain' ? 'Switch to Fill (Cover)' : 'Switch to Fit (Contain)'}
                        >
                          {effectiveFit === 'contain' ? (
                            <Maximize className="w-3 h-3" />
                          ) : (
                            <Minimize className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          onClick={() => onFillGridWithImage(item.id)}
                          className="p-1 hover:text-white transition-colors"
                          title="Replicate across all sheet cells"
                        >
                          <Grid className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onSetCellImage(cellIdx, null)}
                          className="p-1 hover:text-rose-400 transition-colors"
                          title="Clear cell"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Cell Dimension Chip */}
                      <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 text-zinc-300 font-mono text-[9px] px-1 py-0.2 rounded border border-zinc-700 pointer-events-none">
                        {cellWidthMm.toFixed(1)} × {cellHeightMm.toFixed(1)} mm
                      </div>
                    </>
                  ) : (
                    /* Empty Cell */
                    <div className="flex flex-col items-center justify-center text-zinc-400 p-2 text-center pointer-events-none font-mono">
                      <Plus className="w-3.5 h-3.5 mb-1 text-zinc-400" />
                      <span className="text-[10px] text-zinc-500">Slot {cellIdx + 1}</span>
                      <span className="text-[9px] text-zinc-400">
                        {cellWidthMm.toFixed(1)} × {cellHeightMm.toFixed(1)} mm
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cut Guides Overlay */}
          {cutGuides.enabled && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {cutGuides.type === 'corner-marks' ? (
                // Corner crop marks
                cells.map((cellIdx) => {
                  const r = Math.floor(cellIdx / cols);
                  const c = cellIdx % cols;
                  const x1 = (startXMm + c * (cellWidthMm + gapX)) * baseScale;
                  const y1 = (startYMm + r * (cellHeightMm + gapY)) * baseScale;
                  const x2 = x1 + cellWidthMm * baseScale;
                  const y2 = y1 + cellHeightMm * baseScale;
                  const tick = 10;

                  return (
                    <React.Fragment key={cellIdx}>
                      <div style={{ left: `${x1 - tick}px`, top: `${y1}px`, width: `${tick}px`, height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x1}px`, top: `${y1 - tick}px`, width: '1px', height: `${tick}px`, backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x2}px`, top: `${y1}px`, width: `${tick}px`, height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x2}px`, top: `${y1 - tick}px`, width: '1px', height: `${tick}px`, backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x1 - tick}px`, top: `${y2}px`, width: `${tick}px`, height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x1}px`, top: `${y2}px`, width: '1px', height: `${tick}px`, backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x2}px`, top: `${y2}px`, width: `${tick}px`, height: '1px', backgroundColor: cutGuides.color }} className="absolute" />
                      <div style={{ left: `${x2}px`, top: `${y2}px`, width: '1px', height: `${tick}px`, backgroundColor: cutGuides.color }} className="absolute" />
                    </React.Fragment>
                  );
                })
              ) : (
                // Grid cut lines
                <>
                  {Array.from({ length: cols - 1 }, (_, cIdx) => {
                    const c = cIdx + 1;
                    const x = (startXMm + c * cellWidthMm + (c - 0.5) * gapX) * baseScale;
                    return (
                      <div
                        key={`v-cut-${c}`}
                        style={{
                          left: `${x}px`,
                          top: `${Math.max(0, startYMm - 4) * baseScale}px`,
                          bottom: `${Math.max(0, pageHeightMm - (startYMm + totalGridHeightMm) - 4) * baseScale}px`,
                          borderLeft: `1px ${cutGuides.type === 'dashed' ? 'dashed' : 'solid'} ${cutGuides.color}`,
                        }}
                        className="absolute"
                      />
                    );
                  })}

                  {Array.from({ length: rows - 1 }, (_, rIdx) => {
                    const r = rIdx + 1;
                    const y = (startYMm + r * cellHeightMm + (r - 0.5) * gapY) * baseScale;
                    return (
                      <div
                        key={`h-cut-${r}`}
                        style={{
                          top: `${y}px`,
                          left: `${Math.max(0, startXMm - 4) * baseScale}px`,
                          right: `${Math.max(0, pageWidthMm - (startXMm + totalGridWidthMm) - 4) * baseScale}px`,
                          borderTop: `1px ${cutGuides.type === 'dashed' ? 'dashed' : 'solid'} ${cutGuides.color}`,
                        }}
                        className="absolute"
                      />
                    );
                  })}
                </>
              )}
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
            <span>{paper.name.split(' ')[0]} • {pageWidthMm}×{pageHeightMm}mm</span>
            <span>SHEET {currentPage.pageNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
