export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'A3' | 'Photo4x6' | 'Photo5x7' | 'Custom';

export type PageOrientation = 'portrait' | 'landscape';

export interface PaperDimensions {
  widthMm: number;
  heightMm: number;
  name: string;
}

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  A4: { widthMm: 210, heightMm: 297, name: 'A4 (210 × 297 mm)' },
  Letter: { widthMm: 215.9, heightMm: 279.4, name: 'US Letter (8.5 × 11 in)' },
  Legal: { widthMm: 215.9, heightMm: 355.6, name: 'US Legal (8.5 × 14 in)' },
  A3: { widthMm: 297, heightMm: 420, name: 'A3 (297 × 420 mm)' },
  Photo4x6: { widthMm: 101.6, heightMm: 152.4, name: 'Photo 4 × 6 in' },
  Photo5x7: { widthMm: 127, heightMm: 177.8, name: 'Photo 5 × 7 in' },
  Custom: { widthMm: 210, heightMm: 297, name: 'Custom Size' },
};

export type FitMode = 'contain' | 'cover';

export interface ImageFilters {
  grayscale: boolean;
  highContrastBw: boolean;
  brightness: number; // -100 to 100, default 0
  contrast: number;   // -100 to 100, default 0
  flipHorizontal: boolean; // Great for iron-on transfer / t-shirts
  flipVertical: boolean;
}

export interface ImageItem {
  id: string;
  name: string;
  src: string;          // base64 data url or object url
  originalWidth: number;
  originalHeight: number;
  rotation: number;     // 0, 90, 180, 270
  filters: ImageFilters;
  customFitMode?: FitMode;
}

export interface GridPreset {
  id: string;
  name: string;
  rows: number;
  cols: number;
  description: string;
  aspectRatioLabel?: string;
}

export interface CutGuideOptions {
  enabled: boolean;
  type: 'dashed' | 'solid' | 'corner-marks' | 'dots';
  color: string;
  lineWidthMm: number;
  showCardBorders: boolean;
  cardBorderColor: string;
  cardBorderWidthMm: number;
  showScissorIcons: boolean;
}

export interface MarginOptions {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface PaddingOptions {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface LayoutSettings {
  paperSize: PaperSize;
  orientation: PageOrientation;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  margins: MarginOptions;
  marginsLocked?: boolean;
  cellPadding: PaddingOptions;
  cellPaddingLocked?: boolean;
  rows: number;
  cols: number;
  gapMm: number; // backward compat fallback
  gapXmm: number;
  gapYmm: number;
  gapsLocked?: boolean;
  centerGridOnPage?: boolean;
  fitMode: FitMode;
  cutGuides: CutGuideOptions;
  globalFilters: ImageFilters;
  targetDpi: 150 | 300 | 600;
  autoAdjustGridToImage?: boolean;
}

export interface PageCell {
  cellIndex: number;
  imageId: string | null;
}

export type CanvasMode = 'grid' | 'freeform';

export interface FreeformElement {
  id: string;
  imageId: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number; // degrees
  zIndex: number;
  locked?: boolean;
  aspectRatioLocked?: boolean;
  opacity?: number;
  borderWidthMm?: number;
  borderColor?: string;
}

export interface DocumentPage {
  id: string;
  pageNumber: number;
  mode: CanvasMode;
  // Cell assignments for grid mode: map from cellIndex (0 to rows*cols-1) to imageId
  cells: Record<number, string | null>;
  // Freeform elements for freeform layout mode
  elements: FreeformElement[];
}

export interface ProjectData {
  version: number;
  projectName: string;
  createdAt?: number;
  updatedAt?: number;
  settings: LayoutSettings;
  pages: DocumentPage[];
  images: ImageItem[];
  activePageIndex?: number;
}
