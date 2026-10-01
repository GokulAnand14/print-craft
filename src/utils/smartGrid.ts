import { PAPER_SIZES } from '../types';
import type { ImageItem, LayoutSettings } from '../types';

export interface SmartGridRecommendation {
  rows: number;
  cols: number;
  orientation: 'portrait' | 'landscape';
  cellWidthMm: number;
  cellHeightMm: number;
  coveragePercent: number;
  aspectRatio: number;
  ratioLabel: string;
}

export interface PhysicalPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  category: 'id' | 'photo' | 'card' | 'custom';
}

export const PHYSICAL_PRESETS: PhysicalPreset[] = [
  { id: 'passport-in-eu', name: 'Passport / Visa (35 × 45 mm)', widthMm: 35, heightMm: 45, category: 'id' },
  { id: 'us-passport', name: 'US Passport / Square (51 × 51 mm)', widthMm: 50.8, heightMm: 50.8, category: 'id' },
  { id: 'id-badge', name: 'Standard ID / Badge (85.6 × 54 mm)', widthMm: 85.6, heightMm: 54, category: 'id' },
  { id: 'trading-card', name: 'Trading / Game Card (63.5 × 88.9 mm)', widthMm: 63.5, heightMm: 88.9, category: 'card' },
  { id: 'business-card', name: 'Business Card (89 × 51 mm)', widthMm: 89, heightMm: 51, category: 'card' },
  { id: 'photo-4x6', name: 'Photo Print 4 × 6" (101.6 × 152.4 mm)', widthMm: 152.4, heightMm: 101.6, category: 'photo' },
  { id: 'photo-5x7', name: 'Photo Print 5 × 7" (127 × 177.8 mm)', widthMm: 177.8, heightMm: 127, category: 'photo' },
  { id: 'wallet', name: 'Wallet Photo (64 × 89 mm)', widthMm: 64, heightMm: 89, category: 'photo' },
];

export function formatAspectRatio(width: number, height: number): string {
  if (!width || !height) return '1:1';
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.05) return '1:1 (Square)';
  if (Math.abs(ratio - 1.333) < 0.06) return '4:3 (Standard)';
  if (Math.abs(ratio - 1.5) < 0.06) return '3:2 (Classic 35mm)';
  if (Math.abs(ratio - 1.777) < 0.06) return '16:9 (Widescreen)';
  if (Math.abs(ratio - 0.75) < 0.06) return '3:4 (Portrait)';
  if (Math.abs(ratio - 0.666) < 0.06) return '2:3 (Portrait 35mm)';
  if (Math.abs(ratio - 0.562) < 0.06) return '9:16 (Vertical)';

  const rW = Math.round(ratio * 10) / 10;
  return `${rW}:1`;
}

/**
 * Detects the dominant aspect ratio from a collection of images
 */
export function getDominantImageDimensions(images: ImageItem[]): {
  aspectRatio: number;
  width: number;
  height: number;
  isLandscape: boolean;
} {
  if (images.length === 0) {
    return { aspectRatio: 1.5, width: 1200, height: 800, isLandscape: true };
  }

  // Calculate weighted average aspect ratio based on rotation
  let totalRatio = 0;
  for (const img of images) {
    const rot = (img.rotation % 360 + 360) % 360;
    const isSwapped = rot === 90 || rot === 270;
    const w = isSwapped ? img.originalHeight : img.originalWidth;
    const h = isSwapped ? img.originalWidth : img.originalHeight;
    totalRatio += (w || 800) / (h || 600);
  }

  const avgRatio = totalRatio / images.length;
  const first = images[0];
  const rot0 = (first.rotation % 360 + 360) % 360;
  const isSwapped0 = rot0 === 90 || rot0 === 270;
  const baseW = isSwapped0 ? first.originalHeight : first.originalWidth;
  const baseH = isSwapped0 ? first.originalWidth : first.originalHeight;

  return {
    aspectRatio: avgRatio,
    width: baseW,
    height: baseH,
    isLandscape: avgRatio >= 1,
  };
}

/**
 * Finds the optimal grid (rows, cols, orientation) that best fits the image aspect ratio
 * with minimum wasted paper margin.
 */
export function calculateSmartGrid(
  images: ImageItem[],
  settings: LayoutSettings,
  targetImageCount?: number
): SmartGridRecommendation {
  const paper = PAPER_SIZES[settings.paperSize];
  const count = targetImageCount || Math.max(1, images.length);
  const { aspectRatio, width, height } = getDominantImageDimensions(images);
  const ratioLabel = formatAspectRatio(width, height);

  const orientations: ('portrait' | 'landscape')[] = ['portrait', 'landscape'];
  let bestRec: SmartGridRecommendation | null = null;
  let highestScore = -1;

  for (const ori of orientations) {
    const isL = ori === 'landscape';
    const paperW = isL ? paper.heightMm : paper.widthMm;
    const paperH = isL ? paper.widthMm : paper.heightMm;

    const usableW = Math.max(10, paperW - settings.margins.leftMm - settings.margins.rightMm);
    const usableH = Math.max(10, paperH - settings.margins.topMm - settings.margins.bottomMm);

    // Test grid combinations from 1x1 up to 8x8
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 6; c++) {
        const totalSlots = r * c;

        // Favor grids that fit the image count reasonably (not leaving dozens of empty slots)
        if (count > 1 && totalSlots < Math.min(count, 4) && totalSlots < count) {
          // If we have 4 images, 1x1 isn't ideal
          continue;
        }

        const totalGapX = (c - 1) * settings.gapMm;
        const totalGapY = (r - 1) * settings.gapMm;

        const cellW = (usableW - totalGapX) / c;
        const cellH = (usableH - totalGapY) / r;

        if (cellW <= 0 || cellH <= 0) continue;

        const cellAspect = cellW / cellH;

        // How closely does the cell match the image's native aspect ratio?
        // Ratio similarity: 1.0 means exact match (zero letterboxing/cropping!)
        const ratioSimilarity = Math.min(cellAspect, aspectRatio) / Math.max(cellAspect, aspectRatio);

        // Compute actual image area inside the cell
        let actualImgW = cellW;
        let actualImgH = cellH;
        if (aspectRatio > cellAspect) {
          actualImgW = cellW;
          actualImgH = cellW / aspectRatio;
        } else {
          actualImgH = cellH;
          actualImgW = cellH * aspectRatio;
        }

        const totalImgArea = actualImgW * actualImgH * Math.min(totalSlots, count);
        const paperArea = paperW * paperH;
        const coveragePercent = Math.min(100, Math.round((totalImgArea / paperArea) * 100));

        // Score based on ratio similarity (no awkward white borders) + coverage + fitting items
        const countFitPenalty = Math.abs(totalSlots - count) * 2;
        const score = (ratioSimilarity * 70) + (coveragePercent * 0.4) - (countFitPenalty * 0.5);

        if (score > highestScore) {
          highestScore = score;
          bestRec = {
            rows: r,
            cols: c,
            orientation: ori,
            cellWidthMm: Math.round(cellW * 10) / 10,
            cellHeightMm: Math.round(cellH * 10) / 10,
            coveragePercent,
            aspectRatio,
            ratioLabel,
          };
        }
      }
    }
  }

  return (
    bestRec || {
      rows: 2,
      cols: 2,
      orientation: 'portrait',
      cellWidthMm: 95,
      cellHeightMm: 135,
      coveragePercent: 82,
      aspectRatio,
      ratioLabel,
    }
  );
}

/**
 * Calculates max rows and columns for a fixed physical print size (e.g. 35x45mm passport)
 */
export function calculatePhysicalTiling(
  targetWidthMm: number,
  targetHeightMm: number,
  paperWidthMm: number,
  paperHeightMm: number,
  gapMm: number,
  margins: { topMm: number; bottomMm: number; leftMm: number; rightMm: number }
): { rows: number; cols: number; totalPerPage: number } {
  const usableW = Math.max(10, paperWidthMm - margins.leftMm - margins.rightMm);
  const usableH = Math.max(10, paperHeightMm - margins.topMm - margins.bottomMm);

  // cols * targetWidth + (cols - 1) * gap <= usableW
  // cols * (targetWidth + gap) - gap <= usableW
  // cols = Math.floor((usableW + gap) / (targetWidth + gap))
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (targetWidthMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (targetHeightMm + gapMm)));

  return {
    rows,
    cols,
    totalPerPage: rows * cols,
  };
}
