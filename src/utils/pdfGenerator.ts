import jsPDF from 'jspdf';
import { PAPER_SIZES } from '../types';
import type { DocumentPage, ImageItem, LayoutSettings } from '../types';
import { loadImage, renderProcessedImageToCanvas } from './imageProcessing';

export interface GenerationProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

export async function generatePrintPdf(
  pages: DocumentPage[],
  imagesMap: Map<string, ImageItem>,
  settings: LayoutSettings,
  onProgress?: (progress: GenerationProgress) => void
): Promise<{ blob: Blob; url: string }> {
  const paper = PAPER_SIZES[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';

  const pageWidth = isLandscape ? paper.heightMm : paper.widthMm;
  const pageHeight = isLandscape ? paper.widthMm : paper.heightMm;

  const doc = new jsPDF({
    orientation: settings.orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  });

  const { rows, cols, gapMm, margins, fitMode, cutGuides, targetDpi } = settings;

  const gapX = settings.gapXmm ?? gapMm;
  const gapY = settings.gapYmm ?? gapMm;

  const usableWidth = Math.max(10, pageWidth - margins.leftMm - margins.rightMm);
  const usableHeight = Math.max(10, pageHeight - margins.topMm - margins.bottomMm);

  const totalGapsX = Math.max(0, cols - 1) * gapX;
  const totalGapsY = Math.max(0, rows - 1) * gapY;

  const cellWidth = Math.max(5, (usableWidth - totalGapsX) / cols);
  const cellHeight = Math.max(5, (usableHeight - totalGapsY) / rows);

  const totalGridW = cols * cellWidth + totalGapsX;
  const totalGridH = rows * cellHeight + totalGapsY;

  const startX = settings.centerGridOnPage
    ? margins.leftMm + Math.max(0, (usableWidth - totalGridW) / 2)
    : margins.leftMm;
  const startY = settings.centerGridOnPage
    ? margins.topMm + Math.max(0, (usableHeight - totalGridH) / 2)
    : margins.topMm;

  // Pre-load all referenced images in parallel
  const loadedImageElements = new Map<string, HTMLImageElement>();
  const uniqueImageIds = new Set<string>();

  pages.forEach((p) => {
    if (p.cells) {
      Object.values(p.cells).forEach((imgId) => {
        if (imgId) uniqueImageIds.add(imgId);
      });
    }
    if (p.elements) {
      p.elements.forEach((el) => {
        if (el.imageId) uniqueImageIds.add(el.imageId);
      });
    }
  });

  for (const imgId of uniqueImageIds) {
    const item = imagesMap.get(imgId);
    if (item) {
      try {
        const el = await loadImage(item.src);
        loadedImageElements.set(imgId, el);
      } catch (err) {
        console.error(`Failed to load image ${item.name}`, err);
      }
    }
  }

  // Pixels per mm at target DPI (1 inch = 25.4 mm)
  const pxPerMm = targetDpi / 25.4;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage([pageWidth, pageHeight], settings.orientation);
    }

    onProgress?.({
      currentPage: pageIdx + 1,
      totalPages: pages.length,
      status: `Rendering sheet ${pageIdx + 1} of ${pages.length}...`,
    });

    const page = pages[pageIdx];

    // ==========================================
    // 1. FREEFORM CANVAS MODE RENDERING
    // ==========================================
    if (page.mode === 'freeform') {
      const sortedElements = [...(page.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

      for (const el of sortedElements) {
        if (!el.imageId || !imagesMap.has(el.imageId)) continue;
        const item = imagesMap.get(el.imageId)!;
        const imgEl = loadedImageElements.get(el.imageId);
        if (!imgEl) continue;

        const mergedFilters = {
          grayscale: item.filters.grayscale || settings.globalFilters.grayscale,
          highContrastBw: item.filters.highContrastBw || settings.globalFilters.highContrastBw,
          brightness: item.filters.brightness + settings.globalFilters.brightness,
          contrast: item.filters.contrast + settings.globalFilters.contrast,
          flipHorizontal: item.filters.flipHorizontal !== settings.globalFilters.flipHorizontal,
          flipVertical: item.filters.flipVertical !== settings.globalFilters.flipVertical,
        };

        const targetPxW = Math.round(el.widthMm * pxPerMm);
        const targetPxH = Math.round(el.heightMm * pxPerMm);

        const canvas = renderProcessedImageToCanvas(
          imgEl,
          item.rotation + (el.rotation || 0),
          mergedFilters,
          targetPxW,
          targetPxH
        );

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(
          imgData,
          'JPEG',
          el.xMm,
          el.yMm,
          el.widthMm,
          el.heightMm,
          undefined,
          'FAST'
        );

        // Border outline
        if (el.borderWidthMm || cutGuides.showCardBorders) {
          doc.setDrawColor(el.borderColor || cutGuides.cardBorderColor || '#18181b');
          doc.setLineWidth(el.borderWidthMm || cutGuides.cardBorderWidthMm || 0.2);
          doc.setLineDashPattern([], 0);
          doc.rect(el.xMm, el.yMm, el.widthMm, el.heightMm, 'S');
        }

        // Corner crop marks around freeform elements
        if (cutGuides.enabled && cutGuides.type === 'corner-marks') {
          doc.setDrawColor(cutGuides.color || '#71717a');
          doc.setLineWidth(cutGuides.lineWidthMm || 0.2);
          const tick = 3;
          const x1 = el.xMm;
          const y1 = el.yMm;
          const x2 = x1 + el.widthMm;
          const y2 = y1 + el.heightMm;

          doc.line(x1 - tick, y1, x1, y1); doc.line(x1, y1 - tick, x1, y1);
          doc.line(x2, y1, x2 + tick, y1); doc.line(x2, y1 - tick, x2, y1);
          doc.line(x1 - tick, y2, x1, y2); doc.line(x1, y2, x1, y2 + tick);
          doc.line(x2, y2, x2 + tick, y2); doc.line(x2, y2, x2, y2 + tick);
        }
      }
    } 
    // ==========================================
    // 2. STRUCTURED GRID MODE RENDERING
    // ==========================================
    else {
      const cellPad = settings.cellPadding || { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 };

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellIdx = r * cols + c;
          const imgId = page.cells ? page.cells[cellIdx] : null;

          const cellX = startX + c * (cellWidth + gapX);
          const cellY = startY + r * (cellHeight + gapY);

          const contentX = cellX + cellPad.leftMm;
          const contentY = cellY + cellPad.topMm;
          const contentW = Math.max(1, cellWidth - cellPad.leftMm - cellPad.rightMm);
          const contentH = Math.max(1, cellHeight - cellPad.topMm - cellPad.bottomMm);

          if (imgId && imagesMap.has(imgId)) {
            const item = imagesMap.get(imgId)!;
            const imgEl = loadedImageElements.get(imgId);

            if (imgEl) {
              const mergedFilters = {
                grayscale: item.filters.grayscale || settings.globalFilters.grayscale,
                highContrastBw: item.filters.highContrastBw || settings.globalFilters.highContrastBw,
                brightness: item.filters.brightness + settings.globalFilters.brightness,
                contrast: item.filters.contrast + settings.globalFilters.contrast,
                flipHorizontal: item.filters.flipHorizontal !== settings.globalFilters.flipHorizontal,
                flipVertical: item.filters.flipVertical !== settings.globalFilters.flipVertical,
              };

              const cellFit = item.customFitMode || fitMode;

              const contentPxW = Math.round(contentW * pxPerMm);
              const contentPxH = Math.round(contentH * pxPerMm);

              const rot = (item.rotation % 360 + 360) % 360;
              const isSwapped = rot === 90 || rot === 270;
              const srcAspect = isSwapped
                ? (imgEl.naturalHeight || 600) / (imgEl.naturalWidth || 800)
                : (imgEl.naturalWidth || 800) / (imgEl.naturalHeight || 600);

              const contentAspect = contentW / contentH;

              let drawX = contentX;
              let drawY = contentY;
              let drawW = contentW;
              let drawH = contentH;

              if (cellFit === 'contain') {
                if (srcAspect > contentAspect) {
                  drawW = contentW;
                  drawH = contentW / srcAspect;
                  drawX = contentX;
                  drawY = contentY + (contentH - drawH) / 2;
                } else {
                  drawH = contentH;
                  drawW = contentH * srcAspect;
                  drawX = contentX + (contentW - drawW) / 2;
                  drawY = contentY;
                }

                const canvas = renderProcessedImageToCanvas(
                  imgEl,
                  item.rotation,
                  mergedFilters,
                  Math.round(drawW * pxPerMm),
                  Math.round(drawH * pxPerMm)
                );

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                doc.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
              } else {
                const canvas = document.createElement('canvas');
                canvas.width = contentPxW;
                canvas.height = contentPxH;
                const ctx = canvas.getContext('2d')!;

                const processedCanvas = renderProcessedImageToCanvas(
                  imgEl,
                  item.rotation,
                  mergedFilters
                );

                const pW = processedCanvas.width;
                const pH = processedCanvas.height;
                const pAspect = pW / pH;
                let sX = 0, sY = 0, sW = pW, sH = pH;

                if (pAspect > contentAspect) {
                  sW = pH * contentAspect;
                  sX = (pW - sW) / 2;
                } else {
                  sH = pW / contentAspect;
                  sY = (pH - sH) / 2;
                }

                ctx.drawImage(processedCanvas, sX, sY, sW, sH, 0, 0, contentPxW, contentPxH);
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                doc.addImage(imgData, 'JPEG', contentX, contentY, contentW, contentH, undefined, 'FAST');
              }
            }
          }

          if (cutGuides.showCardBorders) {
            doc.setDrawColor(cutGuides.cardBorderColor || '#18181b');
            doc.setLineWidth(cutGuides.cardBorderWidthMm || 0.2);
            doc.setLineDashPattern([], 0);
            doc.rect(cellX, cellY, cellWidth, cellHeight, 'S');
          }
        }
      }

      // Draw Grid Cut Guides if enabled
      if (cutGuides.enabled) {
        doc.setDrawColor(cutGuides.color || '#71717a');
        doc.setLineWidth(cutGuides.lineWidthMm || 0.2);

        const isDashed = cutGuides.type === 'dashed';
        const isDots = cutGuides.type === 'dots';
        const isCornerMarks = cutGuides.type === 'corner-marks';

        if (isDashed) {
          doc.setLineDashPattern([2, 2], 0);
        } else if (isDots) {
          doc.setLineDashPattern([0.5, 1.5], 0);
        } else {
          doc.setLineDashPattern([], 0);
        }

        if (isCornerMarks) {
          const tickLen = 3;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const x1 = startX + c * (cellWidth + gapX);
              const y1 = startY + r * (cellHeight + gapY);
              const x2 = x1 + cellWidth;
              const y2 = y1 + cellHeight;

              doc.line(x1 - tickLen, y1, x1, y1); doc.line(x1, y1 - tickLen, x1, y1);
              doc.line(x2, y1, x2 + tickLen, y1); doc.line(x2, y1 - tickLen, x2, y1);
              doc.line(x1 - tickLen, y2, x1, y2); doc.line(x1, y2, x1, y2 + tickLen);
              doc.line(x2, y2, x2 + tickLen, y2); doc.line(x2, y2, x2, y2 + tickLen);
            }
          }
        } else {
          for (let c = 1; c < cols; c++) {
            const cutX = startX + c * cellWidth + (c - 0.5) * gapX;
            doc.line(cutX, Math.max(0, startY - 3), cutX, Math.min(pageHeight, startY + totalGridH + 3));
          }

          for (let r = 1; r < rows; r++) {
            const cutY = startY + r * cellHeight + (r - 0.5) * gapY;
            doc.line(Math.max(0, startX - 3), cutY, Math.min(pageWidth, startX + totalGridW + 3), cutY);
          }

          if (margins.topMm > 0) {
            doc.line(Math.max(0, startX - 3), startY, Math.min(pageWidth, startX + totalGridW + 3), startY);
          }
          if (margins.bottomMm > 0) {
            const bY = startY + totalGridH;
            doc.line(Math.max(0, startX - 3), bY, Math.min(pageWidth, startX + totalGridW + 3), bY);
          }
          if (margins.leftMm > 0) {
            doc.line(startX, Math.max(0, startY - 3), startX, Math.min(pageHeight, startY + totalGridH + 3));
          }
          if (margins.rightMm > 0) {
            const rX = startX + totalGridW;
            doc.line(rX, Math.max(0, startY - 3), rX, Math.min(pageHeight, startY + totalGridH + 3));
          }
        }
      }
    }
  }

  onProgress?.({
    currentPage: pages.length,
    totalPages: pages.length,
    status: 'Finalizing PDF output...',
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
