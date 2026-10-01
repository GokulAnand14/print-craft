import type { ImageFilters, ImageItem } from '../types';

export const DEFAULT_FILTERS: ImageFilters = {
  grayscale: false,
  highContrastBw: false,
  brightness: 0,
  contrast: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function fileToImageItem(file: File): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          id: 'img_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          name: file.name,
          src,
          originalWidth: img.naturalWidth || 800,
          originalHeight: img.naturalHeight || 600,
          rotation: 0,
          filters: { ...DEFAULT_FILTERS },
        });
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function renderProcessedImageToCanvas(
  img: HTMLImageElement,
  rotation: number,
  filters: ImageFilters,
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const rot = (rotation % 360 + 360) % 360;
  const is90or270 = rot === 90 || rot === 270;

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  const srcWidth = is90or270 ? naturalHeight : naturalWidth;
  const srcHeight = is90or270 ? naturalWidth : naturalHeight;

  canvas.width = targetWidth || srcWidth;
  canvas.height = targetHeight || srcHeight;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(
    filters.flipHorizontal ? -1 : 1,
    filters.flipVertical ? -1 : 1
  );

  const drawW = is90or270 ? canvas.height : canvas.width;
  const drawH = is90or270 ? canvas.width : canvas.height;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const hasAdjustments =
    filters.grayscale ||
    filters.highContrastBw ||
    filters.brightness !== 0 ||
    filters.contrast !== 0;

  if (hasAdjustments) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const len = data.length;

    const cFactor = (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast));
    const bShift = filters.brightness * 1.5;

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (filters.brightness !== 0) {
        r += bShift;
        g += bShift;
        b += bShift;
      }
      if (filters.contrast !== 0) {
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (g - 128) + 128;
      }

      if (filters.highContrastBw) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const bw = lum > 128 ? 255 : 0;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
      } else if (filters.grayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = Math.min(255, Math.max(0, gray));
        data[i + 1] = Math.min(255, Math.max(0, gray));
        data[i + 2] = Math.min(255, Math.max(0, gray));
      } else {
        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
}

/**
 * Creates professional technical print calibration targets for testing
 */
export function generateSampleImages(): ImageItem[] {
  const targets = [
    { title: 'ISO 12233 RESOLUTION TARGET', code: 'CHART-RES-01', type: 'grid' },
    { title: 'DOCUMENT SCAN SAMPLE A', code: 'DOC-SCAN-884', type: 'text' },
    { title: 'GRAYSCALE STEP WEDGE 10%', code: 'CALIB-GRAY-10', type: 'wedge' },
    { title: 'COLOR REGISTRATION MARKS', code: 'CMYK-REG-04', type: 'cmyk' },
  ];

  return targets.map((item, idx) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d')!;

    // Clean neutral background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 900);

    // Outer border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 1120, 820);

    // Inner frame
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 1;
    ctx.strokeRect(55, 55, 1090, 790);

    // Header strip
    ctx.fillStyle = '#18181b';
    ctx.fillRect(55, 55, 1090, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`TEST TARGET: ${item.title}`, 75, 85);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#a1a1aa';
    ctx.textAlign = 'right';
    ctx.fillText(`${item.code} | 1200x900px | 300DPI REF`, 1120, 85);
    ctx.textAlign = 'left';

    if (item.type === 'wedge') {
      // 10-step grayscale bar
      const barY = 220;
      const barH = 120;
      const stepW = 1000 / 10;
      for (let s = 0; s < 10; s++) {
        const val = Math.round((s / 9) * 255);
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(100 + s * stepW, barY, stepW, barH);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(100 + s * stepW, barY, stepW, barH);

        ctx.fillStyle = val > 128 ? '#000' : '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`${s * 10}%`, 110 + s * stepW, barY + barH - 15);
      }
    } else if (item.type === 'grid') {
      // Precision coordinate grid
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1;
      for (let x = 100; x <= 1100; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 150);
        ctx.lineTo(x, 750);
        ctx.stroke();
      }
      for (let y = 150; y <= 750; y += 50) {
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
      }
      // Crosshair center
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(600, 450, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(600, 300); ctx.lineTo(600, 600);
      ctx.moveTo(450, 450); ctx.lineTo(750, 450);
      ctx.stroke();
    } else if (item.type === 'cmyk') {
      // CMYK registration patches
      const colors = ['#00ffff', '#ff00ff', '#ffff00', '#000000'];
      const names = ['CYAN', 'MAGENTA', 'YELLOW', 'BLACK (K)'];
      colors.forEach((col, cIdx) => {
        const pX = 140 + cIdx * 240;
        ctx.fillStyle = col;
        ctx.fillRect(pX, 260, 200, 200);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(pX, 260, 200, 200);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(names[cIdx], pX + 10, 490);
      });
    } else {
      // Text readability sample
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Sample Document Print Test', 100, 220);
      ctx.font = '16px serif';
      ctx.fillText('Line testing at standard office document proportions. 12pt body text.', 100, 270);
      ctx.fillText('The quick brown fox jumps over the lazy dog. 0123456789!@#$%^&*()', 100, 310);
      ctx.font = '12px sans-serif';
      ctx.fillText('Microprint readability check: 6pt typography verification for print alignment and head calibration.', 100, 360);
      
      // Horizontal ruler line
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, 400); ctx.lineTo(1100, 400);
      ctx.stroke();
    }

    // Technical footer
    ctx.fillStyle = '#52525b';
    ctx.font = '12px monospace';
    ctx.fillText(`TARGET #${idx + 1} | EXACT MM CALIBRATION | READY FOR PRINT PRODUCTION`, 80, 810);

    return {
      id: `target_${idx + 1}_${Date.now()}`,
      name: `${item.code.toLowerCase()}.png`,
      src: canvas.toDataURL('image/png'),
      originalWidth: 1200,
      originalHeight: 900,
      rotation: 0,
      filters: { ...DEFAULT_FILTERS },
    };
  });
}
