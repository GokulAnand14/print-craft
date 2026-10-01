import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { 
  DocumentPage, 
  FreeformElement, 
  CanvasMode, 
  ImageItem, 
  LayoutSettings,
  ProjectData
} from './types';
import { PAPER_SIZES } from './types';
import { generatePrintPdf } from './utils/pdfGenerator';
import type { GenerationProgress } from './utils/pdfGenerator';
import { fileToImageItem, generateSampleImages } from './utils/imageProcessing';
import { calculateSmartGrid } from './utils/smartGrid';
import { 
  saveImagesToDb, 
  loadImagesFromDb, 
  clearImagesFromDb, 
  saveProjectMetadata, 
  loadProjectMetadata, 
  exportProjectFile, 
  importProjectFile 
} from './utils/storage';
import { Header } from './components/Header';
import { ImageTray } from './components/ImageTray';
import { PrintCanvas } from './components/PrintCanvas';
import { FreeformCanvas } from './components/FreeformCanvas';
import { FreeformToolbar } from './components/FreeformToolbar';
import { ControlsPanel } from './components/ControlsPanel';
import { PageNavigator } from './components/PageNavigator';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

const DEFAULT_SETTINGS: LayoutSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: {
    topMm: 10,
    bottomMm: 10,
    leftMm: 10,
    rightMm: 10,
  },
  marginsLocked: true,
  cellPadding: {
    topMm: 0,
    bottomMm: 0,
    leftMm: 0,
    rightMm: 0,
  },
  cellPaddingLocked: true,
  rows: 2,
  cols: 2,
  gapMm: 4,
  gapXmm: 4,
  gapYmm: 4,
  gapsLocked: true,
  centerGridOnPage: true,
  fitMode: 'contain',
  cutGuides: {
    enabled: true,
    type: 'dashed',
    color: '#71717a',
    lineWidthMm: 0.2,
    showCardBorders: false,
    cardBorderColor: '#18181b',
    cardBorderWidthMm: 0.2,
    showScissorIcons: false,
  },
  globalFilters: {
    grayscale: false,
    highContrastBw: false,
    brightness: 0,
    contrast: 0,
    flipHorizontal: false,
    flipVertical: false,
  },
  targetDpi: 300,
};

interface HistorySnapshot {
  pages: DocumentPage[];
  settings: LayoutSettings;
  activePageIndex: number;
}

export const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS);
  const [pages, setPages] = useState<DocumentPage[]>([
    { id: 'page_1', pageNumber: 1, mode: 'grid', cells: {}, elements: [] },
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Project state & persistence
  const [projectName, setProjectName] = useState<string>('PrintCraft_Sheet');
  const [saveStatus, setSaveStatus] = useState<string>('Saved');
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Viewport & UI State
  const [zoom, setZoom] = useState<number>(0.85);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  const isHydratedRef = useRef<boolean>(false);
  const lastSnapshotTimeRef = useRef<number>(0);

  // Toast dispatchers
  const addToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Quick lookup Map for images
  const imagesMap = useMemo(() => {
    const map = new Map<string, ImageItem>();
    images.forEach((img) => map.set(img.id, img));
    return map;
  }, [images]);

  const activePage = pages[activePageIndex] || pages[0];

  // History snapshot recording
  const pushSnapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastSnapshotTimeRef.current < 250) return;
    lastSnapshotTimeRef.current = now;

    setUndoStack((prev) => [
      ...prev.slice(-24),
      {
        pages: JSON.parse(JSON.stringify(pages)),
        settings: JSON.parse(JSON.stringify(settings)),
        activePageIndex,
      },
    ]);
    setRedoStack([]);
  }, [pages, settings, activePageIndex]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      {
        pages: JSON.parse(JSON.stringify(pages)),
        settings: JSON.parse(JSON.stringify(settings)),
        activePageIndex,
      },
    ]);
    setUndoStack((prev) => prev.slice(0, -1));
    setPages(previous.pages);
    setSettings(previous.settings);
    setActivePageIndex(Math.min(previous.activePageIndex, previous.pages.length - 1));
    addToast('Undo layout action', 'info');
  }, [undoStack, pages, settings, activePageIndex, addToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      {
        pages: JSON.parse(JSON.stringify(pages)),
        settings: JSON.parse(JSON.stringify(settings)),
        activePageIndex,
      },
    ]);
    setRedoStack((prev) => prev.slice(0, -1));
    setPages(next.pages);
    setSettings(next.settings);
    setActivePageIndex(Math.min(next.activePageIndex, next.pages.length - 1));
    addToast('Redo layout action', 'info');
  }, [redoStack, pages, settings, activePageIndex, addToast]);

  // Initial session hydration
  useEffect(() => {
    const hydrate = async () => {
      try {
        const meta = loadProjectMetadata();
        const savedImages = await loadImagesFromDb();

        if (meta && meta.pages && meta.pages.length > 0) {
          setSettings(meta.settings);
          setPages(meta.pages);
          if (meta.projectName) setProjectName(meta.projectName);
          if (typeof meta.activePageIndex === 'number') {
            setActivePageIndex(Math.min(meta.activePageIndex, meta.pages.length - 1));
          }
          if (savedImages && savedImages.length > 0) {
            setImages(savedImages);
          }
          addToast('Restored workspace session', 'info');
        } else {
          // Initial sample targets
          const samples = generateSampleImages();
          setImages(samples);
          const slotsPerPage = DEFAULT_SETTINGS.rows * DEFAULT_SETTINGS.cols;
          const cells: Record<number, string | null> = {};
          for (let i = 0; i < slotsPerPage; i++) {
            cells[i] = samples[i % samples.length].id;
          }
          setPages([{ id: 'page_1', pageNumber: 1, mode: 'grid', cells, elements: [] }]);
        }
      } catch (err) {
        console.warn('Hydration warning, falling back to samples:', err);
        const samples = generateSampleImages();
        setImages(samples);
        const slotsPerPage = DEFAULT_SETTINGS.rows * DEFAULT_SETTINGS.cols;
        const cells: Record<number, string | null> = {};
        for (let i = 0; i < slotsPerPage; i++) {
          cells[i] = samples[i % samples.length].id;
        }
        setPages([{ id: 'page_1', pageNumber: 1, mode: 'grid', cells, elements: [] }]);
      } finally {
        isHydratedRef.current = true;
      }
    };

    hydrate();
  }, [addToast]);

  // Auto-save to IndexedDB & localStorage
  useEffect(() => {
    if (!isHydratedRef.current) return;

    setSaveStatus('Saving...');
    const timer = setTimeout(async () => {
      try {
        saveProjectMetadata({
          projectName,
          settings,
          pages,
          activePageIndex,
        });
        await saveImagesToDb(images);
        setSaveStatus('Saved');
      } catch (err) {
        console.warn('Auto-save error:', err);
        setSaveStatus('Local only');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [images, settings, pages, projectName, activePageIndex]);

  // Project export/import
  const handleSaveProject = useCallback(() => {
    const now = Date.now();
    const projectData: ProjectData = {
      version: 1,
      projectName,
      createdAt: now,
      updatedAt: now,
      settings,
      pages,
      images,
      activePageIndex,
    };
    exportProjectFile(projectData);
    addToast(`Saved project file "${projectName}"`, 'success');
  }, [projectName, settings, pages, images, activePageIndex, addToast]);

  const handleLoadProject = useCallback(async (file: File) => {
    try {
      const data = await importProjectFile(file);
      pushSnapshot();
      if (data.projectName) setProjectName(data.projectName);
      if (data.settings) setSettings(data.settings);
      if (data.pages && data.pages.length > 0) setPages(data.pages);
      if (data.images && data.images.length > 0) setImages(data.images);
      setActivePageIndex(0);
      setSelectedElementId(null);
      addToast(`Imported ${data.pages?.length || 0} sheets from ${file.name}`, 'success');
    } catch (err) {
      console.error('Project import failed:', err);
      addToast('Could not load project file', 'error');
    }
  }, [pushSnapshot, addToast]);

  // Settings updater with history snapshot
  const handleUpdateSettings = useCallback(
    (updater: (prev: LayoutSettings) => LayoutSettings) => {
      pushSnapshot();
      setSettings(updater);
    },
    [pushSnapshot]
  );

  // Helper: auto-place images into available slots on current page (Grid mode)
  const autoPlaceNewImages = useCallback(
    (newImages: ImageItem[]) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const page = { ...nextPages[activePageIndex], cells: { ...nextPages[activePageIndex].cells } };
        const totalSlots = settings.rows * settings.cols;

        let imgIdx = 0;
        for (let slot = 0; slot < totalSlots && imgIdx < newImages.length; slot++) {
          if (!page.cells[slot]) {
            page.cells[slot] = newImages[imgIdx].id;
            imgIdx++;
          }
        }
        nextPages[activePageIndex] = page;
        return nextPages;
      });
    },
    [activePageIndex, settings.rows, settings.cols]
  );

  const handleApplySmartGrid = useCallback(() => {
    if (images.length === 0) return;
    pushSnapshot();
    const rec = calculateSmartGrid(images, settings);
    setSettings((prev) => ({
      ...prev,
      rows: rec.rows,
      cols: rec.cols,
      orientation: rec.orientation,
    }));

    const slotsPerPage = rec.rows * rec.cols;
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex], cells: {} as Record<number, string | null> };
      for (let s = 0; s < slotsPerPage; s++) {
        if (s < images.length) {
          page.cells[s] = images[s].id;
        } else {
          page.cells[s] = null;
        }
      }
      nextPages[activePageIndex] = page;
      return nextPages;
    });
    addToast(`Auto-fitted ${rec.rows}×${rec.cols} grid`, 'info');
  }, [images, settings, activePageIndex, pushSnapshot, addToast]);

  const handleAddImages = (newItems: ImageItem[]) => {
    pushSnapshot();
    const isFirstImport = images.length === 0 && newItems.length > 0;
    const combined = [...images, ...newItems];
    setImages(combined);

    if (isFirstImport) {
      const rec = calculateSmartGrid(newItems, settings);
      setSettings((prev) => ({
        ...prev,
        rows: rec.rows,
        cols: rec.cols,
        orientation: rec.orientation,
      }));

      const slotsPerPage = rec.rows * rec.cols;
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const page = { ...nextPages[0], cells: {} as Record<number, string | null> };
        for (let s = 0; s < slotsPerPage; s++) {
          if (s < newItems.length) {
            page.cells[s] = newItems[s].id;
          } else {
            page.cells[s] = null;
          }
        }
        nextPages[0] = page;
        return nextPages;
      });
    } else {
      if (activePage.mode === 'grid') {
        autoPlaceNewImages(newItems);
      }
    }
    addToast(`Imported ${newItems.length} asset(s)`, 'success');
  };

  const handleRemoveImage = (id: string) => {
    pushSnapshot();
    setImages((prev) => prev.filter((img) => img.id !== id));
    setPages((prevPages) =>
      prevPages.map((page) => {
        const updatedCells: Record<number, string | null> = {};
        Object.entries(page.cells || {}).forEach(([slot, imgId]) => {
          updatedCells[Number(slot)] = imgId === id ? null : imgId;
        });
        const updatedElements = (page.elements || []).filter((el) => el.imageId !== id);
        return { ...page, cells: updatedCells, elements: updatedElements };
      })
    );
    addToast('Removed asset from workspace', 'info');
  };

  const handleRotateImage = (id: string) => {
    pushSnapshot();
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    );
  };

  const handleDuplicateImage = (id: string) => {
    const original = images.find((i) => i.id === id);
    if (!original) return;

    pushSnapshot();
    const copy: ImageItem = {
      ...original,
      id: 'img_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      name: `${original.name.replace(/\.[^/.]+$/, '')}_copy.png`,
    };
    handleAddImages([copy]);
  };

  const handleSetCellImage = (cellIndex: number, imageId: string | null) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex], cells: { ...nextPages[activePageIndex].cells } };
      page.cells[cellIndex] = imageId;
      nextPages[activePageIndex] = page;
      return nextPages;
    });
  };

  const handleSwapCells = (sourceIndex: number, targetIndex: number) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex], cells: { ...nextPages[activePageIndex].cells } };
      const temp = page.cells[targetIndex];
      page.cells[targetIndex] = page.cells[sourceIndex];
      page.cells[sourceIndex] = temp;
      nextPages[activePageIndex] = page;
      return nextPages;
    });
  };

  const handleToggleCellFit = (imageId: string) => {
    pushSnapshot();
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === imageId) {
          const currentFit = img.customFitMode || settings.fitMode;
          return {
            ...img,
            customFitMode: currentFit === 'contain' ? 'cover' : 'contain',
          };
        }
        return img;
      })
    );
  };

  const handleFillGridWithImage = (imageId: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex], cells: {} as Record<number, string | null> };
      const totalSlots = settings.rows * settings.cols;
      for (let i = 0; i < totalSlots; i++) {
        page.cells[i] = imageId;
      }
      nextPages[activePageIndex] = page;
      return nextPages;
    });
    addToast('Filled sheet with active asset', 'info');
  };

  const handleAutoDistributeAll = () => {
    if (images.length === 0) return;
    pushSnapshot();

    const slotsPerPage = settings.rows * settings.cols;
    const requiredPagesCount = Math.max(1, Math.ceil(images.length / slotsPerPage));
    const newPages: DocumentPage[] = [];

    let imgIdx = 0;
    for (let p = 0; p < requiredPagesCount; p++) {
      const cells: Record<number, string | null> = {};
      for (let s = 0; s < slotsPerPage; s++) {
        if (imgIdx < images.length) {
          cells[s] = images[imgIdx].id;
          imgIdx++;
        } else {
          cells[s] = null;
        }
      }
      newPages.push({
        id: `page_${p + 1}`,
        pageNumber: p + 1,
        mode: 'grid',
        cells,
        elements: [],
      });
    }

    setPages(newPages);
    setActivePageIndex(0);
    addToast(`Distributed assets across ${requiredPagesCount} sheet(s)`, 'success');
  };

  const handlePlaceOnSheet = (imageId: string) => {
    pushSnapshot();
    const page = pages[activePageIndex];
    if (page.mode === 'freeform') {
      const paper = PAPER_SIZES[settings.paperSize];
      const isL = settings.orientation === 'landscape';
      const paperW = isL ? paper.heightMm : paper.widthMm;
      const paperH = isL ? paper.widthMm : paper.heightMm;

      const item = imagesMap.get(imageId);
      const rot = item ? (item.rotation % 360 + 360) % 360 : 0;
      const isSwapped = rot === 90 || rot === 270;
      const naturalW = item ? (isSwapped ? item.originalHeight : item.originalWidth) : 800;
      const naturalH = item ? (isSwapped ? item.originalWidth : item.originalHeight) : 600;
      const aspect = (naturalW || 800) / (naturalH || 600);

      const defaultW = Math.min(80, paperW - settings.margins.leftMm - settings.margins.rightMm);
      const defaultH = defaultW / aspect;

      const count = (page.elements || []).length;
      const offset = (count % 8) * 8;
      const centerX = Math.max(0, (paperW - defaultW) / 2) + offset;
      const centerY = Math.max(0, (paperH - defaultH) / 2) + offset;

      const maxZ = (page.elements || []).reduce((max, el) => Math.max(max, el.zIndex), 0);

      const newEl: FreeformElement = {
        id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        imageId,
        xMm: Math.round(centerX * 10) / 10,
        yMm: Math.round(centerY * 10) / 10,
        widthMm: Math.round(defaultW * 10) / 10,
        heightMm: Math.round(defaultH * 10) / 10,
        rotation: 0,
        zIndex: maxZ + 1,
        aspectRatioLocked: true,
      };

      handleAddFreeformElement(newEl);
      setSelectedElementId(newEl.id);
    } else {
      const slotsPerPage = settings.rows * settings.cols;
      let emptySlot = -1;

      for (let s = 0; s < slotsPerPage; s++) {
        if (!page.cells || !page.cells[s]) {
          emptySlot = s;
          break;
        }
      }

      if (emptySlot !== -1) {
        handleSetCellImage(emptySlot, imageId);
      } else {
        const newPageNum = pages.length + 1;
        const newPage: DocumentPage = {
          id: `page_${Date.now()}`,
          pageNumber: newPageNum,
          mode: 'grid',
          cells: { 0: imageId },
          elements: [],
        };
        setPages((prev) => [...prev, newPage]);
        setActivePageIndex(pages.length);
      }
    }
  };

  const handleGenerateMultipleSheets = (sheetCount: number, imageId?: string) => {
    const slotsPerPage = settings.rows * settings.cols;
    const targetImageId = imageId || (images.length > 0 ? images[0].id : null);
    if (!targetImageId && images.length === 0) return;

    pushSnapshot();
    const newPages: DocumentPage[] = [];

    for (let p = 0; p < sheetCount; p++) {
      const cells: Record<number, string | null> = {};
      for (let s = 0; s < slotsPerPage; s++) {
        if (targetImageId) {
          cells[s] = targetImageId;
        } else {
          cells[s] = images[(p * slotsPerPage + s) % images.length].id;
        }
      }
      newPages.push({
        id: `page_${Date.now()}_${p + 1}`,
        pageNumber: p + 1,
        mode: 'grid',
        cells,
        elements: [],
      });
    }

    setPages(newPages);
    setActivePageIndex(0);
    setSelectedElementId(null);
    addToast(`Generated ${sheetCount} batch sheet(s)`, 'success');
  };

  const handleRepeatFillCurrentSheet = () => {
    const page = pages[activePageIndex];
    if (page.mode !== 'grid') return;

    const slotsPerPage = settings.rows * settings.cols;
    const existingIds = Object.values(page.cells || {}).filter(Boolean) as string[];
    const pool = existingIds.length > 0 ? existingIds : images.map((i) => i.id);
    if (pool.length === 0) return;

    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const updatedPage = { ...nextPages[activePageIndex], cells: { ...nextPages[activePageIndex].cells } };
      for (let s = 0; s < slotsPerPage; s++) {
        if (!updatedPage.cells[s]) {
          updatedPage.cells[s] = pool[s % pool.length];
        }
      }
      nextPages[activePageIndex] = updatedPage;
      return nextPages;
    });
    addToast('Filled remaining cell slots', 'info');
  };

  const handleClearAll = () => {
    pushSnapshot();
    setImages([]);
    setPages([{ id: 'page_1', pageNumber: 1, mode: 'grid', cells: {}, elements: [] }]);
    setActivePageIndex(0);
    setSelectedElementId(null);
    clearImagesFromDb();
    addToast('Workspace reset', 'info');
  };

  const handleLoadSamples = () => {
    pushSnapshot();
    const samples = generateSampleImages();
    setImages(samples);

    const slotsPerPage = settings.rows * settings.cols;
    const cells: Record<number, string | null> = {};
    for (let i = 0; i < slotsPerPage; i++) {
      cells[i] = samples[i % samples.length].id;
    }

    setPages([{ id: 'page_1', pageNumber: 1, mode: 'grid', cells, elements: [] }]);
    setActivePageIndex(0);
    setSelectedElementId(null);
    addToast('Loaded sample alignment targets', 'info');
  };

  // ==========================================
  // Freeform Canvas Handlers
  // ==========================================
  const handleUpdateFreeformElement = (id: string, updates: Partial<FreeformElement>) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      page.elements = (page.elements || []).map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );
      nextPages[activePageIndex] = page;
      return nextPages;
    });
  };

  const handleAddFreeformElement = (newEl: FreeformElement) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      page.elements = [...(page.elements || []), newEl];
      nextPages[activePageIndex] = page;
      return nextPages;
    });
  };

  const handleDeleteFreeformElement = (id: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      page.elements = (page.elements || []).filter((el) => el.id !== id);
      nextPages[activePageIndex] = page;
      return nextPages;
    });
    if (selectedElementId === id) setSelectedElementId(null);
    addToast('Deleted element', 'info');
  };

  const handleDuplicateFreeformElement = (id: string) => {
    const page = pages[activePageIndex];
    const elem = (page.elements || []).find((el) => el.id === id);
    if (!elem) return;

    pushSnapshot();
    const copy: FreeformElement = {
      ...elem,
      id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      xMm: elem.xMm + 8,
      yMm: elem.yMm + 8,
      zIndex: (page.elements || []).length + 1,
    };
    handleAddFreeformElement(copy);
    setSelectedElementId(copy.id);
    addToast('Duplicated element', 'info');
  };

  const handleBringForward = (id: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      const elems = [...(page.elements || [])];
      const idx = elems.findIndex((el) => el.id === id);
      if (idx !== -1 && idx < elems.length - 1) {
        const temp = elems[idx];
        elems[idx] = elems[idx + 1];
        elems[idx + 1] = temp;
        elems.forEach((el, i) => (el.zIndex = i + 1));
        page.elements = elems;
        nextPages[activePageIndex] = page;
      }
      return nextPages;
    });
  };

  const handleSendBackward = (id: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      const elems = [...(page.elements || [])];
      const idx = elems.findIndex((el) => el.id === id);
      if (idx > 0) {
        const temp = elems[idx];
        elems[idx] = elems[idx - 1];
        elems[idx - 1] = temp;
        elems.forEach((el, i) => (el.zIndex = i + 1));
        page.elements = elems;
        nextPages[activePageIndex] = page;
      }
      return nextPages;
    });
  };

  const handleBringToFront = (id: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      const elems = [...(page.elements || [])];
      const elem = elems.find((el) => el.id === id);
      if (elem) {
        const rest = elems.filter((el) => el.id !== id);
        rest.push(elem);
        rest.forEach((el, i) => (el.zIndex = i + 1));
        page.elements = rest;
        nextPages[activePageIndex] = page;
      }
      return nextPages;
    });
  };

  const handleSendToBack = (id: string) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      const elems = [...(page.elements || [])];
      const elem = elems.find((el) => el.id === id);
      if (elem) {
        const rest = elems.filter((el) => el.id !== id);
        rest.unshift(elem);
        rest.forEach((el, i) => (el.zIndex = i + 1));
        page.elements = rest;
        nextPages[activePageIndex] = page;
      }
      return nextPages;
    });
  };

  const handleAlign = (alignment: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'centerSheet') => {
    if (!selectedElementId) return;
    const paper = PAPER_SIZES[settings.paperSize];
    const isL = settings.orientation === 'landscape';
    const paperW = isL ? paper.heightMm : paper.widthMm;
    const paperH = isL ? paper.widthMm : paper.heightMm;
    const page = pages[activePageIndex];
    const elem = (page.elements || []).find((el) => el.id === selectedElementId);
    if (!elem) return;

    pushSnapshot();
    let updates: Partial<FreeformElement> = {};
    if (alignment === 'left') updates = { xMm: settings.margins.leftMm };
    if (alignment === 'centerH') updates = { xMm: Math.round(((paperW - elem.widthMm) / 2) * 10) / 10 };
    if (alignment === 'right') updates = { xMm: Math.round((paperW - settings.margins.rightMm - elem.widthMm) * 10) / 10 };
    if (alignment === 'top') updates = { yMm: settings.margins.topMm };
    if (alignment === 'centerV') updates = { yMm: Math.round(((paperH - elem.heightMm) / 2) * 10) / 10 };
    if (alignment === 'bottom') updates = { yMm: Math.round((paperH - settings.margins.bottomMm - elem.heightMm) * 10) / 10 };
    if (alignment === 'centerSheet') {
      updates = {
        xMm: Math.round(((paperW - elem.widthMm) / 2) * 10) / 10,
        yMm: Math.round(((paperH - elem.heightMm) / 2) * 10) / 10,
      };
    }
    handleUpdateFreeformElement(selectedElementId, updates);
  };

  // Convert Structured Grid cells into Freeform Elements
  const handleConvertGridToFreeform = () => {
    const page = pages[activePageIndex];
    const paper = PAPER_SIZES[settings.paperSize];
    const isL = settings.orientation === 'landscape';
    const paperW = isL ? paper.heightMm : paper.widthMm;
    const paperH = isL ? paper.widthMm : paper.heightMm;

    const usableW = Math.max(10, paperW - settings.margins.leftMm - settings.margins.rightMm);
    const usableH = Math.max(10, paperH - settings.margins.topMm - settings.margins.bottomMm);

    const gapX = settings.gapXmm ?? settings.gapMm;
    const gapY = settings.gapYmm ?? settings.gapMm;

    const totalGapX = Math.max(0, settings.cols - 1) * gapX;
    const totalGapY = Math.max(0, settings.rows - 1) * gapY;

    const cellW = Math.max(5, (usableW - totalGapX) / settings.cols);
    const cellH = Math.max(5, (usableH - totalGapY) / settings.rows);

    const newElements: FreeformElement[] = [];
    let z = 1;

    for (let r = 0; r < settings.rows; r++) {
      for (let c = 0; c < settings.cols; c++) {
        const cellIdx = r * settings.cols + c;
        const imgId = page.cells ? page.cells[cellIdx] : null;
        if (imgId) {
          const xMm = settings.margins.leftMm + c * (cellW + gapX);
          const yMm = settings.margins.topMm + r * (cellH + gapY);
          newElements.push({
            id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
            imageId: imgId,
            xMm: Math.round(xMm * 10) / 10,
            yMm: Math.round(yMm * 10) / 10,
            widthMm: Math.round(cellW * 10) / 10,
            heightMm: Math.round(cellH * 10) / 10,
            rotation: 0,
            zIndex: z++,
            aspectRatioLocked: true,
          });
        }
      }
    }

    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      nextPages[activePageIndex] = {
        ...nextPages[activePageIndex],
        mode: 'freeform',
        elements: newElements,
      };
      return nextPages;
    });
    addToast('Converted grid cells to freeform elements', 'info');
  };

  const handleToggleMode = (mode: CanvasMode) => {
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = nextPages[activePageIndex];

      if (mode === 'freeform' && (!page.elements || page.elements.length === 0)) {
        const paper = PAPER_SIZES[settings.paperSize];
        const isL = settings.orientation === 'landscape';
        const paperW = isL ? paper.heightMm : paper.widthMm;
        const paperH = isL ? paper.widthMm : paper.heightMm;

        const usableW = Math.max(10, paperW - settings.margins.leftMm - settings.margins.rightMm);
        const usableH = Math.max(10, paperH - settings.margins.topMm - settings.margins.bottomMm);

        const gapX = settings.gapXmm ?? settings.gapMm;
        const gapY = settings.gapYmm ?? settings.gapMm;

        const totalGapX = Math.max(0, settings.cols - 1) * gapX;
        const totalGapY = Math.max(0, settings.rows - 1) * gapY;

        const cellW = Math.max(5, (usableW - totalGapX) / settings.cols);
        const cellH = Math.max(5, (usableH - totalGapY) / settings.rows);

        const newElements: FreeformElement[] = [];
        let z = 1;

        for (let r = 0; r < settings.rows; r++) {
          for (let c = 0; c < settings.cols; c++) {
            const cellIdx = r * settings.cols + c;
            const imgId = page.cells ? page.cells[cellIdx] : null;
            if (imgId) {
              const xMm = settings.margins.leftMm + c * (cellW + gapX);
              const yMm = settings.margins.topMm + r * (cellH + gapY);
              newElements.push({
                id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
                imageId: imgId,
                xMm: Math.round(xMm * 10) / 10,
                yMm: Math.round(yMm * 10) / 10,
                widthMm: Math.round(cellW * 10) / 10,
                heightMm: Math.round(cellH * 10) / 10,
                rotation: 0,
                zIndex: z++,
                aspectRatioLocked: true,
              });
            }
          }
        }

        if (newElements.length === 0 && images.length > 0) {
          const firstImg = images[0];
          newElements.push({
            id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
            imageId: firstImg.id,
            xMm: Math.round(((paperW - 80) / 2) * 10) / 10,
            yMm: Math.round(((paperH - 60) / 2) * 10) / 10,
            widthMm: 80,
            heightMm: 60,
            rotation: 0,
            zIndex: 1,
            aspectRatioLocked: true,
          });
        }

        nextPages[activePageIndex] = {
          ...page,
          mode: 'freeform',
          elements: newElements,
        };
        if (newElements.length > 0) {
          setTimeout(() => setSelectedElementId(newElements[0].id), 50);
        }
      } else {
        nextPages[activePageIndex] = {
          ...page,
          mode,
        };
        setSelectedElementId(null);
      }

      return nextPages;
    });
  };

  // Multi-page navigation actions
  const handleAddPage = () => {
    pushSnapshot();
    const newPageNum = pages.length + 1;
    const newPage: DocumentPage = {
      id: `page_${Date.now()}`,
      pageNumber: newPageNum,
      mode: activePage.mode,
      cells: {},
      elements: [],
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageIndex(pages.length);
    setSelectedElementId(null);
    addToast(`Added Page ${newPageNum}`, 'info');
  };

  const handleDuplicatePage = (index: number) => {
    const source = pages[index];
    if (!source) return;
    pushSnapshot();
    const newPage: DocumentPage = {
      id: `page_${Date.now()}`,
      pageNumber: pages.length + 1,
      mode: source.mode,
      cells: { ...(source.cells || {}) },
      elements: (source.elements || []).map((el) => ({
        ...el,
        id: 'elem_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      })),
    };
    const nextPages = [...pages];
    nextPages.splice(index + 1, 0, newPage);
    nextPages.forEach((p, idx) => (p.pageNumber = idx + 1));
    setPages(nextPages);
    setActivePageIndex(index + 1);
    addToast(`Duplicated Sheet ${index + 1}`, 'info');
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    pushSnapshot();
    const nextPages = pages.filter((_, idx) => idx !== index);
    nextPages.forEach((p, idx) => (p.pageNumber = idx + 1));
    setPages(nextPages);
    setActivePageIndex((prev) => Math.min(prev, nextPages.length - 1));
    setSelectedElementId(null);
    addToast('Deleted sheet', 'info');
  };

  // Element nudging helper
  const handleNudge = useCallback((deltaX: number, deltaY: number) => {
    if (!selectedElementId) return;
    pushSnapshot();
    setPages((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[activePageIndex] };
      page.elements = (page.elements || []).map((el) => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            xMm: Math.round((el.xMm + deltaX) * 10) / 10,
            yMm: Math.round((el.yMm + deltaY) * 10) / 10,
          };
        }
        return el;
      });
      nextPages[activePageIndex] = page;
      return nextPages;
    });
  }, [selectedElementId, activePageIndex, pushSnapshot]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      // Help modal toggle
      if (e.key === '?' && !isEditingText) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Escape closes shortcuts or deselects element
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (selectedElementId) {
          setSelectedElementId(null);
          return;
        }
      }

      if (isEditingText) return;

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save project file: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
        return;
      }

      // Duplicate element: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedElementId) {
          e.preventDefault();
          handleDuplicateFreeformElement(selectedElementId);
        }
        return;
      }

      // Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteFreeformElement(selectedElementId);
        }
        return;
      }

      // Arrow keys nudge
      if (selectedElementId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5;
        if (e.key === 'ArrowLeft') handleNudge(-step, 0);
        if (e.key === 'ArrowRight') handleNudge(step, 0);
        if (e.key === 'ArrowUp') handleNudge(0, -step);
        if (e.key === 'ArrowDown') handleNudge(0, step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsOpen,
    selectedElementId,
    handleUndo,
    handleRedo,
    handleSaveProject,
    handleDuplicateFreeformElement,
    handleDeleteFreeformElement,
    handleNudge,
  ]);

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newItems: ImageItem[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const item = await fileToImageItem(file);
              newItems.push(item);
            } catch (err) {
              console.error('Failed to parse pasted image', err);
            }
          }
        }
      }

      if (newItems.length > 0) {
        handleAddImages(newItems);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleAddImages]);

  // Export PDF Handler
  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportProgress('Compiling print PDF...');

    try {
      const { blob } = await generatePrintPdf(
        pages,
        imagesMap,
        settings,
        (progress: GenerationProgress) => {
          setExportProgress(progress.status);
        }
      );

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const safeProjectName = projectName.trim().replace(/[^a-z0-9_-]/gi, '_') || 'PrintCraft';
      link.download = `${safeProjectName}_${settings.paperSize}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      addToast('Print PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('PDF compilation failed. Check images.', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // Direct Print Handler
  const handleQuickPrint = async () => {
    setIsExporting(true);
    setExportProgress('Rendering for print...');

    try {
      const { url } = await generatePrintPdf(pages, imagesMap, settings);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
        addToast('Opened print preview tab', 'info');
      }
    } catch (err) {
      console.error('Print generation failed:', err);
      addToast('Print preview failed', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const selectedElement = (activePage.elements || []).find((el) => el.id === selectedElementId) || null;
  const isGridEmpty = Object.values(activePage.cells || {}).filter(Boolean).length === 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f1012] text-zinc-100 font-sans">
      {/* Precision Workstation Header */}
      <Header
        settings={settings}
        pageCount={pages.length}
        totalImagesCount={images.length}
        zoom={zoom}
        setZoom={setZoom}
        currentMode={activePage.mode}
        onToggleMode={handleToggleMode}
        onExportPdf={handleExportPdf}
        onQuickPrint={handleQuickPrint}
        isExporting={isExporting}
        exportStatus={exportProgress}
        projectName={projectName}
        onUpdateProjectName={setProjectName}
        canUndo={undoStack.length > 0}
        onUndo={handleUndo}
        canRedo={redoStack.length > 0}
        onRedo={handleRedo}
        saveStatus={saveStatus}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isLeftPanelOpen={isLeftPanelOpen}
        setIsLeftPanelOpen={setIsLeftPanelOpen}
        isRightPanelOpen={isRightPanelOpen}
        setIsRightPanelOpen={setIsRightPanelOpen}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Image Asset Tray */}
        <ImageTray
          images={images}
          onAddImages={handleAddImages}
          onRemoveImage={handleRemoveImage}
          onRotateImage={handleRotateImage}
          onDuplicateImage={handleDuplicateImage}
          onFillGridWithImage={handleFillGridWithImage}
          onAutoDistributeAll={handleAutoDistributeAll}
          onClearAll={handleClearAll}
          onLoadSamples={handleLoadSamples}
          onPlaceOnSheet={handlePlaceOnSheet}
          isOpen={isLeftPanelOpen}
        />

        {/* Center: Stage with Freeform or Grid Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activePage.mode === 'freeform' && (
            <FreeformToolbar
              selectedElement={selectedElement}
              onUpdateSelected={(updates) => {
                if (selectedElementId) handleUpdateFreeformElement(selectedElementId, updates);
              }}
              onDuplicate={handleDuplicateFreeformElement}
              onDelete={handleDeleteFreeformElement}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              onAlign={handleAlign}
              onConvertGridToFreeform={handleConvertGridToFreeform}
              isGridEmpty={isGridEmpty}
            />
          )}

          {activePage.mode === 'freeform' ? (
            <FreeformCanvas
              elements={activePage.elements || []}
              settings={settings}
              imagesMap={imagesMap}
              zoom={zoom}
              selectedId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={handleUpdateFreeformElement}
              onAddElement={handleAddFreeformElement}
              onDeleteElement={handleDeleteFreeformElement}
              onDuplicateElement={handleDuplicateFreeformElement}
            />
          ) : (
            <PrintCanvas
              currentPage={activePage}
              settings={settings}
              imagesMap={imagesMap}
              zoom={zoom}
              onSetCellImage={handleSetCellImage}
              onSwapCells={handleSwapCells}
              onRotateImage={handleRotateImage}
              onToggleCellFit={handleToggleCellFit}
              onFillGridWithImage={handleFillGridWithImage}
            />
          )}
        </div>

        {/* Right: Technical Inspector Panel */}
        <ControlsPanel
          settings={settings}
          images={images}
          onUpdateSettings={handleUpdateSettings}
          onApplySmartGrid={handleApplySmartGrid}
          onAutoDistributeAll={handleAutoDistributeAll}
          onGenerateMultipleSheets={handleGenerateMultipleSheets}
          onRepeatFillSheet={handleRepeatFillCurrentSheet}
          isOpen={isRightPanelOpen}
        />
      </div>

      {/* Bottom: Sheet Pagination Strip */}
      <PageNavigator
        pages={pages}
        activePageIndex={activePageIndex}
        onSelectPage={(idx) => {
          setActivePageIndex(idx);
          setSelectedElementId(null);
        }}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
      />

      {/* Ephemeral Feedback Toasts */}
      <Toast 
        toasts={toasts} 
        onDismiss={removeToast} 
      />
    </div>
  );
};

export default App;
