import React, { useRef } from 'react';
import { 
  Printer, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  SlidersHorizontal, 
  FolderOpen,
  Grid,
  Move,
  Undo2,
  Redo2,
  Save,
  FolderUp,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import type { CanvasMode, LayoutSettings } from '../types';

interface HeaderProps {
  settings: LayoutSettings;
  pageCount: number;
  totalImagesCount: number;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  currentMode: CanvasMode;
  onToggleMode: (mode: CanvasMode) => void;
  onExportPdf: () => void;
  onQuickPrint: () => void;
  isExporting: boolean;
  exportStatus?: string;
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  saveStatus: string;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onOpenShortcuts: () => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  pageCount,
  zoom,
  setZoom,
  currentMode,
  onToggleMode,
  onExportPdf,
  onQuickPrint,
  isExporting,
  exportStatus,
  projectName,
  onUpdateProjectName,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  saveStatus,
  onSaveProject,
  onLoadProject,
  onOpenShortcuts,
  isLeftPanelOpen,
  setIsLeftPanelOpen,
  isRightPanelOpen,
  setIsRightPanelOpen,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between z-30 select-none text-zinc-300 font-mono text-xs">
      {/* Hidden File Input for Project Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.printcraft"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Left: App Identity, Project Name & History Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={() => setIsLeftPanelOpen((prev) => !prev)}
          title="Toggle Image Tray (Ctrl+B)"
          className={`h-7 px-2.5 rounded border flex items-center gap-1.5 transition-colors ${
            isLeftPanelOpen
              ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
              : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Files</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Editable Project Name */}
        <div className="flex items-center space-x-1.5">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onUpdateProjectName(e.target.value)}
            className="h-7 px-2 bg-transparent hover:bg-zinc-950/60 focus:bg-zinc-950 focus:border-zinc-600 border border-transparent rounded font-semibold text-xs text-zinc-100 transition-colors w-40 truncate"
            title="Click to rename project"
            placeholder="Project Name"
          />

          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/80">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            <span className="truncate max-w-[80px]">{saveStatus}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Project Save / Load Icons */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={onSaveProject}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Save Project File (.json)"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Open / Import Project (.json)"
          >
            <FolderUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Precision Scale & Canvas Mode */}
      <div className="flex items-center space-x-3">
        {/* Paper Format Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
          <span className="font-semibold text-zinc-300">{settings.paperSize}</span>
          <span className="text-zinc-600">·</span>
          <span className="uppercase">{settings.orientation}</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs text-zinc-200 w-12 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
            className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setZoom(0.85)}
            className="px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
            title="Reset Zoom to 85%"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit</span>
          </button>
        </div>

        {/* Mode Switcher: Grid vs Freeform */}
        <div className="flex items-center bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[11px]">
          <button
            onClick={() => onToggleMode('grid')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              currentMode === 'grid'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Structured N-Up Grid Layout Mode"
          >
            <Grid className="w-3 h-3" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => onToggleMode('freeform')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
              currentMode === 'freeform'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Freeform Drag, Resize & Position Canvas Mode"
          >
            <Move className="w-3 h-3" />
            <span>Freeform</span>
          </button>
        </div>
      </div>

      {/* Right: Technical Output Controls */}
      <div className="flex items-center space-x-2">
        {/* Keyboard Shortcuts Trigger */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Settings Panel Toggle */}
        <button
          onClick={() => setIsRightPanelOpen((prev) => !prev)}
          title="Toggle Settings Inspector"
          className={`h-7 px-2.5 rounded border flex items-center gap-1.5 transition-colors ${
            isRightPanelOpen
              ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
              : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Quick Print */}
        <button
          onClick={onQuickPrint}
          disabled={isExporting}
          className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-zinc-100 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Send to OS Print Dialog"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>

        {/* Export PDF */}
        <button
          onClick={onExportPdf}
          disabled={isExporting}
          className="h-7 px-3 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          title="Compile and download print-ready PDF"
        >
          {isExporting ? (
            <>
              <div className="w-3 h-3 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              <span>{exportStatus || 'Rendering...'}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
              <span className="text-[10px] text-zinc-600 bg-zinc-200 px-1 rounded">
                {pageCount}p
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
export default Header;
