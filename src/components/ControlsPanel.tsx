import React, { useState } from 'react';
import { PAPER_SIZES } from '../types';
import type { 
  ImageItem,
  LayoutSettings, 
  PaperSize, 
  PageOrientation 
} from '../types';
import { 
  PHYSICAL_PRESETS, 
  calculatePhysicalTiling, 
  calculateSmartGrid, 
  getDominantImageDimensions, 
  formatAspectRatio 
} from '../utils/smartGrid';
import { 
  Sparkles, 
  Check, 
  Ratio, 
  Link2, 
  Unlink, 
  Plus, 
  Minus, 
  Layers, 
  Copy, 
  RotateCcw 
} from 'lucide-react';

interface ControlsPanelProps {
  settings: LayoutSettings;
  images: ImageItem[];
  onUpdateSettings: (updater: (prev: LayoutSettings) => LayoutSettings) => void;
  onApplySmartGrid: () => void;
  onAutoDistributeAll?: () => void;
  onGenerateMultipleSheets?: (sheetCount: number, imageId?: string) => void;
  onRepeatFillSheet?: () => void;
  isOpen: boolean;
}

type TabType = 'grid' | 'paper' | 'trim' | 'output';

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  images,
  onUpdateSettings,
  onApplySmartGrid,
  onAutoDistributeAll,
  onGenerateMultipleSheets,
  onRepeatFillSheet,
  isOpen,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('grid');
  const [multiSheetCount, setMultiSheetCount] = useState<number>(2);

  if (!isOpen) return null;

  const paper = PAPER_SIZES[settings.paperSize];
  const isLandscape = settings.orientation === 'landscape';
  const paperW = isLandscape ? paper.heightMm : paper.widthMm;
  const paperH = isLandscape ? paper.widthMm : paper.heightMm;

  // Compute smart recommendation based on loaded images
  const dominant = getDominantImageDimensions(images);
  const smartRec = calculateSmartGrid(images, settings);

  const slotsPerPage = settings.rows * settings.cols;
  const requiredSheets = Math.max(1, Math.ceil(images.length / slotsPerPage));

  const GRID_PRESETS = [
    { label: '1 × 1', desc: 'Full Page', rows: 1, cols: 1 },
    { label: '1 × 2', desc: 'Half (2-Up)', rows: 1, cols: 2 },
    { label: '2 × 2', desc: 'Quarter (4-Up)', rows: 2, cols: 2 },
    { label: '2 × 3', desc: '6-Up Prints', rows: 2, cols: 3 },
    { label: '3 × 3', desc: '9-Up Cards', rows: 3, cols: 3 },
    { label: '3 × 4', desc: '12-Up Wallet', rows: 3, cols: 4 },
    { label: '4 × 4', desc: '16-Up Badges', rows: 4, cols: 4 },
    { label: '4 × 6', desc: '24-Up Stickers', rows: 4, cols: 6 },
  ];

  const handleApplyPhysicalPreset = (widthMm: number, heightMm: number) => {
    const tiling = calculatePhysicalTiling(
      widthMm,
      heightMm,
      paperW,
      paperH,
      settings.gapXmm ?? settings.gapMm,
      settings.margins
    );

    onUpdateSettings((prev) => ({
      ...prev,
      rows: tiling.rows,
      cols: tiling.cols,
      fitMode: 'contain',
    }));
  };

  const handleUpdateMargin = (side: 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm', value: number) => {
    const val = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
    onUpdateSettings((prev) => {
      if (prev.marginsLocked) {
        return {
          ...prev,
          margins: { topMm: val, bottomMm: val, leftMm: val, rightMm: val },
        };
      }
      return {
        ...prev,
        margins: { ...prev.margins, [side]: val },
      };
    });
  };

  const handleUpdatePadding = (side: 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm', value: number) => {
    const val = Math.max(0, Math.min(50, Math.round(value * 10) / 10));
    onUpdateSettings((prev) => {
      const current = prev.cellPadding || { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 };
      if (prev.cellPaddingLocked) {
        return {
          ...prev,
          cellPadding: { topMm: val, bottomMm: val, leftMm: val, rightMm: val },
        };
      }
      return {
        ...prev,
        cellPadding: { ...current, [side]: val },
      };
    });
  };

  const handleUpdateGap = (axis: 'gapXmm' | 'gapYmm', value: number) => {
    const val = Math.max(0, Math.min(50, Math.round(value * 10) / 10));
    onUpdateSettings((prev) => {
      if (prev.gapsLocked) {
        return {
          ...prev,
          gapMm: val,
          gapXmm: val,
          gapYmm: val,
        };
      }
      return {
        ...prev,
        [axis]: val,
        gapMm: axis === 'gapXmm' ? val : (prev.gapXmm ?? val),
      };
    });
  };

  const currentCellPadding = settings.cellPadding || { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 };
  const gapX = settings.gapXmm ?? settings.gapMm;
  const gapY = settings.gapYmm ?? settings.gapMm;

  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-900/95 flex flex-col h-[calc(100vh-3rem-2.5rem)] select-none shrink-0 text-zinc-300 font-mono text-xs">
      {/* Tab Navigation */}
      <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-950/70 p-1 text-[11px]">
        {[
          { id: 'grid', label: 'Grid' },
          { id: 'paper', label: 'Paper' },
          { id: 'trim', label: 'Trim' },
          { id: 'output', label: 'Output' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`py-1.5 text-center rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ========================================================= */}
        {/* --- TAB 1: SMART GRID, MULTI-PAGE & CAPACITY AUTO-FILL --- */}
        {/* ========================================================= */}
        {activeTab === 'grid' && (
          <div className="space-y-3.5">
            {/* 1. Page Capacity & Auto-Fill Sheets HUD */}
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Auto-Fill Sheets for Config</span>
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-200 px-1.5 py-0.2 rounded font-mono">
                  {slotsPerPage}/sheet
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span>Grid Capacity:</span>
                  <span className="text-zinc-200">{settings.rows}R × {settings.cols}C = {slotsPerPage} slots</span>
                </div>
                <div className="flex justify-between">
                  <span>Uploaded Images:</span>
                  <span className="text-zinc-200">{images.length} images</span>
                </div>
                <div className="flex justify-between text-zinc-300 font-medium">
                  <span>Required Sheets:</span>
                  <span className="text-zinc-100">{requiredSheets} sheet(s) ({requiredSheets * slotsPerPage} slots)</span>
                </div>
              </div>

              {/* Action 1: Auto-generate all sheets for current config */}
              <button
                onClick={onAutoDistributeAll}
                className="w-full h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-100 text-[11px] flex items-center justify-center gap-1.5 transition-colors font-medium shadow-xs"
                title="Automatically create as many sheets as needed and tile all uploaded images"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                <span>Auto-Generate All {requiredSheets} Sheet(s)</span>
              </button>

              {/* Action 2: Multi-Sheet Duplication Generator */}
              <div className="pt-1.5 border-t border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Multiply Across Sheets:</span>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setMultiSheetCount(cnt)}
                        className={`px-1.5 py-0.5 rounded border text-[9px] ${
                          multiSheetCount === cnt
                            ? 'bg-zinc-700 border-zinc-500 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {cnt}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => onGenerateMultipleSheets?.(multiSheetCount)}
                    className="h-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-200 flex items-center justify-center gap-1 transition-colors"
                    title={`Generate ${multiSheetCount} sheets repeating loaded photos`}
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Fill {multiSheetCount} Sheet(s)</span>
                  </button>

                  <button
                    onClick={onRepeatFillSheet}
                    className="h-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-200 flex items-center justify-center gap-1 transition-colors"
                    title="Fill all empty slots on the current sheet by repeating images"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-400" />
                    <span>Repeat-Fill Sheet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Smart Image-Adaptive Auto-Adjust Banner */}
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Ratio className="w-3 h-3 text-zinc-400" />
                  <span>Smart Aspect Adaptation</span>
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded">
                  {formatAspectRatio(dominant.width, dominant.height)}
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-0.5">
                <div>Source: <span className="text-zinc-200">{dominant.width}×{dominant.height}px ({dominant.isLandscape ? 'Landscape' : 'Portrait'})</span></div>
                <div>Optimal: <span className="text-zinc-100 font-medium">{smartRec.rows}R × {smartRec.cols}C ({smartRec.orientation})</span></div>
                <div className="text-[10px] text-zinc-500">{smartRec.coveragePercent}% paper coverage • minimal margin loss</div>
              </div>

              <button
                onClick={onApplySmartGrid}
                className="w-full h-7 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-100 text-[11px] flex items-center justify-center gap-1.5 transition-colors font-medium"
                title="Automatically adapt grid dimensions and sheet orientation to image aspect ratio"
              >
                <Ratio className="w-3.5 h-3.5 text-zinc-300" />
                <span>Auto-Fit Grid to Image Size</span>
              </button>
            </div>

            {/* 3. Standard Physical Print Dimensions (Passport, Wallet, Cards) */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Standard Physical Sizes (Auto-Pack)
              </span>
              <div className="grid grid-cols-2 gap-1">
                {PHYSICAL_PRESETS.map((preset) => {
                  const tiling = calculatePhysicalTiling(
                    preset.widthMm,
                    preset.heightMm,
                    paperW,
                    paperH,
                    gapX,
                    settings.margins
                  );
                  const isCurrent =
                    settings.rows === tiling.rows && settings.cols === tiling.cols;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPhysicalPreset(preset.widthMm, preset.heightMm)}
                      className={`p-1.5 rounded text-left border transition-colors ${
                        isCurrent
                          ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-zinc-200 text-[10px] truncate" title={preset.name}>
                        {preset.name.split(' (')[0]}
                      </div>
                      <div className="text-[9px] text-zinc-500 flex justify-between mt-0.5">
                        <span>{preset.widthMm}×{preset.heightMm}mm</span>
                        <span className="text-zinc-300">{tiling.totalPerPage}/sheet</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Manual Grid Presets */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Manual Grid Presets
              </span>
              <div className="grid grid-cols-2 gap-1">
                {GRID_PRESETS.map((preset) => {
                  const isCurrent =
                    settings.rows === preset.rows && settings.cols === preset.cols;
                  return (
                    <button
                      key={preset.label}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          rows: preset.rows,
                          cols: preset.cols,
                        }))
                      }
                      className={`p-1.5 rounded text-left border transition-colors ${
                        isCurrent
                          ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-zinc-200">{preset.label}</div>
                      <div className="text-[9px] text-zinc-500">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Fine-Tuning Rows & Columns */}
            <div className="p-2.5 rounded bg-zinc-950/50 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <span>Row & Column Adjust</span>
                <span className="text-zinc-400">{settings.rows}R × {settings.cols}C</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                  <span>Rows</span>
                  <span className="text-zinc-200">{settings.rows}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={settings.rows}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, rows: Number(e.target.value) }))
                  }
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                  <span>Columns</span>
                  <span className="text-zinc-200">{settings.cols}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={settings.cols}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({ ...prev, cols: Number(e.target.value) }))
                  }
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>
            </div>

            {/* 6. Scale Fitting */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Scale Fitting
              </span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({ ...prev, fitMode: 'contain' }))
                  }
                  className={`py-1.5 px-2 rounded border text-center transition-colors ${
                    settings.fitMode === 'contain'
                      ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-medium'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div>Fit (Contain)</div>
                  <div className="text-[9px] text-zinc-500">Preserve Aspect</div>
                </button>

                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({ ...prev, fitMode: 'cover' }))
                  }
                  className={`py-1.5 px-2 rounded border text-center transition-colors ${
                    settings.fitMode === 'cover'
                      ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-medium'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div>Fill (Cover)</div>
                  <div className="text-[9px] text-zinc-500">Crop to Cell</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* --- TAB 2: PAPER, 4-WAY MARGINS & EXTENSIVE PADDING --- */}
        {/* ========================================================= */}
        {activeTab === 'paper' && (
          <div className="space-y-3.5">
            {/* 1. Sheet Format */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                Sheet Format
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(PAPER_SIZES) as PaperSize[]).filter(k => k !== 'Custom').map((key) => {
                  const p = PAPER_SIZES[key];
                  const isSelected = settings.paperSize === key;
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        onUpdateSettings((prev) => ({ ...prev, paperSize: key }))
                      }
                      className={`p-1.5 rounded text-left border transition-colors ${
                        isSelected
                          ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-zinc-200">{key}</div>
                      <div className="text-[9px] text-zinc-500">
                        {p.widthMm} × {p.heightMm} mm
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Orientation */}
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                Orientation
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['portrait', 'landscape'] as PageOrientation[]).map((ori) => (
                  <button
                    key={ori}
                    onClick={() =>
                      onUpdateSettings((prev) => ({ ...prev, orientation: ori }))
                    }
                    className={`py-1.5 px-2 rounded border capitalize text-center transition-colors ${
                      settings.orientation === ori
                        ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Extensive 4-Side Page Margins */}
            <div className="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Page Margins (Outer Edge)
                </span>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      marginsLocked: !prev.marginsLocked,
                    }))
                  }
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                    settings.marginsLocked
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                      : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={settings.marginsLocked ? 'Unlock sides to adjust independently' : 'Lock sides to adjust together'}
                >
                  {settings.marginsLocked ? (
                    <>
                      <Link2 className="w-3 h-3 text-sky-400" />
                      <span>Linked</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3 h-3 text-zinc-500" />
                      <span>Separate</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Side Inputs */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { id: 'topMm', label: 'Top' },
                  { id: 'bottomMm', label: 'Bottom' },
                  { id: 'leftMm', label: 'Left' },
                  { id: 'rightMm', label: 'Right' },
                ].map(({ id, label }) => {
                  const sideKey = id as 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm';
                  const val = settings.margins[sideKey];

                  return (
                    <div key={id} className="p-1 rounded bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5 mb-1">
                        <span>{label}</span>
                        <span className="text-zinc-200 font-mono">{val} mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdateMargin(sideKey, val - 1)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={val}
                          onChange={(e) => handleUpdateMargin(sideKey, Number(e.target.value))}
                          className="w-full h-5 bg-zinc-950 border border-zinc-800 rounded text-center text-zinc-100 font-mono text-[10px] px-1"
                        />
                        <button
                          onClick={() => handleUpdateMargin(sideKey, val + 1)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Margin Presets */}
              <div className="pt-1">
                <span className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Margin Presets
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 5, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          margins: { topMm: m, bottomMm: m, leftMm: m, rightMm: m },
                        }))
                      }
                      className={`py-0.5 rounded border text-center text-[10px] ${
                        settings.margins.topMm === m && settings.margins.bottomMm === m && settings.margins.leftMm === m
                          ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                          : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {m}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Cell Gutters / Spacing (Gap X & Gap Y) */}
            <div className="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Cell Gutters (Spacings)
                </span>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      gapsLocked: !prev.gapsLocked,
                    }))
                  }
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                    settings.gapsLocked
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                      : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={settings.gapsLocked ? 'Unlock X & Y to adjust independently' : 'Lock X & Y together'}
                >
                  {settings.gapsLocked ? (
                    <>
                      <Link2 className="w-3 h-3 text-sky-400" />
                      <span>X=Y</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3 h-3 text-zinc-500" />
                      <span>Separate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Gap X Slider & Input */}
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
                  <span>Horizontal Gutter (X)</span>
                  <span className="text-zinc-200 font-mono">{gapX} mm</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={gapX}
                  onChange={(e) => handleUpdateGap('gapXmm', Number(e.target.value))}
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>

              {/* Gap Y Slider & Input */}
              <div>
                <div className="flex justify-between text-[10px] text-zinc-400 mb-0.5">
                  <span>Vertical Gutter (Y)</span>
                  <span className="text-zinc-200 font-mono">{gapY} mm</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={gapY}
                  onChange={(e) => handleUpdateGap('gapYmm', Number(e.target.value))}
                  className="w-full accent-zinc-400 cursor-pointer"
                />
              </div>

              {/* Quick Gap Presets */}
              <div className="grid grid-cols-4 gap-1">
                {[0, 2, 4, 8].map((g) => (
                  <button
                    key={g}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        gapMm: g,
                        gapXmm: g,
                        gapYmm: g,
                      }))
                    }
                    className={`py-0.5 rounded border text-center text-[10px] ${
                      gapX === g && gapY === g
                        ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {g}mm
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Cell Inner Padding (White Bleed / Frame Margin) */}
            <div className="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold block">
                    Cell Inner Padding (Frame Inset)
                  </span>
                  <span className="text-[9px] text-zinc-500">Creates white border inside cut line</span>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      cellPaddingLocked: !prev.cellPaddingLocked,
                    }))
                  }
                  className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                    settings.cellPaddingLocked
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                      : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={settings.cellPaddingLocked ? 'Unlock padding sides' : 'Lock padding sides together'}
                >
                  {settings.cellPaddingLocked ? (
                    <>
                      <Link2 className="w-3 h-3 text-sky-400" />
                      <span>Linked</span>
                    </>
                  ) : (
                    <>
                      <Unlink className="w-3 h-3 text-zinc-500" />
                      <span>Separate</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4-Side Padding Inputs */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { id: 'topMm', label: 'Top' },
                  { id: 'bottomMm', label: 'Bottom' },
                  { id: 'leftMm', label: 'Left' },
                  { id: 'rightMm', label: 'Right' },
                ].map(({ id, label }) => {
                  const sideKey = id as 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm';
                  const val = currentCellPadding[sideKey] ?? 0;

                  return (
                    <div key={id} className="p-1 rounded bg-zinc-900 border border-zinc-800/80">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5 mb-1">
                        <span>{label}</span>
                        <span className="text-zinc-200 font-mono">{val} mm</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdatePadding(sideKey, val - 0.5)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.5}
                          value={val}
                          onChange={(e) => handleUpdatePadding(sideKey, Number(e.target.value))}
                          className="w-full h-5 bg-zinc-950 border border-zinc-800 rounded text-center text-zinc-100 font-mono text-[10px] px-1"
                        />
                        <button
                          onClick={() => handleUpdatePadding(sideKey, val + 0.5)}
                          className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Padding Presets */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '0mm', val: 0 },
                  { label: '2mm', val: 2 },
                  { label: '4mm', val: 4 },
                  { label: '6mm', val: 6 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        cellPadding: {
                          topMm: item.val,
                          bottomMm: item.val,
                          leftMm: item.val,
                          rightMm: item.val,
                        },
                      }))
                    }
                    className={`py-0.5 rounded border text-center text-[10px] ${
                      currentCellPadding.topMm === item.val && currentCellPadding.leftMm === item.val
                        ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Centering Alignment */}
            <div className="flex items-center justify-between p-2 rounded bg-zinc-950/50 border border-zinc-800">
              <div>
                <div className="text-zinc-200">Center Grid on Paper</div>
                <div className="text-[9px] text-zinc-500">Evenly balance remaining margin space</div>
              </div>
              <input
                type="checkbox"
                checked={settings.centerGridOnPage ?? true}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    centerGridOnPage: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-zinc-400 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* --- TAB 3: TRIM & GUIDES --- */}
        {/* ========================================================= */}
        {activeTab === 'trim' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded bg-zinc-950/50 border border-zinc-800">
              <span className="text-zinc-200">Enable Trim Guides</span>
              <input
                type="checkbox"
                checked={settings.cutGuides.enabled}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    cutGuides: { ...prev.cutGuides, enabled: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-zinc-400 rounded cursor-pointer"
              />
            </div>

            {settings.cutGuides.enabled && (
              <>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Guide Type
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { id: 'dashed', label: 'Dashed Lines' },
                      { id: 'corner-marks', label: 'Corner Ticks' },
                      { id: 'solid', label: 'Solid Lines' },
                      { id: 'dots', label: 'Dotted' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            cutGuides: { ...prev.cutGuides, type: style.id as any },
                          }))
                        }
                        className={`py-1.5 px-2 rounded border text-center text-[10px] transition-colors ${
                          settings.cutGuides.type === style.id
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-medium'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-zinc-950/50 border border-zinc-800">
                  <div>
                    <div className="text-zinc-200">1px Cell Stroke Border</div>
                    <div className="text-[9px] text-zinc-500">Outlines each card</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cutGuides.showCardBorders}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        cutGuides: { ...prev.cutGuides, showCardBorders: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-zinc-400 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Guide Contrast
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: 'Light', color: '#cbd5e1' },
                      { label: 'Medium', color: '#71717a' },
                      { label: 'Black', color: '#18181b' },
                    ].map((col) => (
                      <button
                        key={col.label}
                        onClick={() =>
                          onUpdateSettings((prev) => ({
                            ...prev,
                            cutGuides: { ...prev.cutGuides, color: col.color },
                          }))
                        }
                        className={`py-1.5 rounded border text-center text-[10px] flex items-center justify-center gap-1.5 ${
                          settings.cutGuides.color === col.color
                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: col.color }}
                          className="w-2.5 h-2.5 rounded-full border border-zinc-600"
                        />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* --- TAB 4: OUTPUT & INK --- */}
        {/* ========================================================= */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Color & Ink Mode
              </span>
              <div className="space-y-1">
                {[
                  {
                    id: 'color',
                    label: 'Full Color Gamut',
                    desc: 'Standard output',
                    active: !settings.globalFilters.grayscale && !settings.globalFilters.highContrastBw,
                    apply: () => ({ grayscale: false, highContrastBw: false }),
                  },
                  {
                    id: 'gray',
                    label: 'Monochrome Grayscale',
                    desc: 'Smooth tone B&W',
                    active: settings.globalFilters.grayscale && !settings.globalFilters.highContrastBw,
                    apply: () => ({ grayscale: true, highContrastBw: false }),
                  },
                  {
                    id: 'bw',
                    label: 'Crisp 1-Bit B&W',
                    desc: 'Thresholded ink-saving',
                    active: settings.globalFilters.highContrastBw,
                    apply: () => ({ grayscale: false, highContrastBw: true }),
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        globalFilters: {
                          ...prev.globalFilters,
                          ...mode.apply(),
                        },
                      }))
                    }
                    className={`w-full p-2 rounded border text-left flex items-center justify-between transition-colors ${
                      mode.active
                        ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">{mode.label}</div>
                      <div className="text-[9px] text-zinc-500">{mode.desc}</div>
                    </div>
                    {mode.active && <Check className="w-3.5 h-3.5 text-zinc-300" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-zinc-950/50 border border-zinc-800">
              <div>
                <div className="text-zinc-200">Mirror Horizontal</div>
                <div className="text-[9px] text-zinc-500">Iron-on transfers & stamps</div>
              </div>
              <input
                type="checkbox"
                checked={settings.globalFilters.flipHorizontal}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    globalFilters: {
                      ...prev.globalFilters,
                      flipHorizontal: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 accent-zinc-400 rounded cursor-pointer"
              />
            </div>

            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Print Resolution
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { dpi: 150, label: '150 DPI', sub: 'Draft' },
                  { dpi: 300, label: '300 DPI', sub: 'Production' },
                  { dpi: 600, label: '600 DPI', sub: 'Hi-Res' },
                ].map((item) => (
                  <button
                    key={item.dpi}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        targetDpi: item.dpi as any,
                      }))
                    }
                    className={`py-1.5 px-1 rounded border text-center transition-colors ${
                      settings.targetDpi === item.dpi
                        ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-medium'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-[11px]">{item.label}</div>
                    <div className="text-[9px] text-zinc-500">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
export default ControlsPanel;
