import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: 'Ctrl + V', desc: 'Paste image directly from clipboard' },
    { key: 'Ctrl + Z', desc: 'Undo last layout action' },
    { key: 'Ctrl + Y', desc: 'Redo previously undone action' },
    { key: 'Ctrl + D', desc: 'Duplicate selected freeform element' },
    { key: 'Delete / Backspace', desc: 'Delete selected element' },
    { key: 'Arrow Keys', desc: 'Nudge element by 0.5 mm' },
    { key: 'Shift + Arrow', desc: 'Nudge element by 2.5 mm' },
    { key: 'Ctrl + S', desc: 'Export full project file (.json)' },
    { key: '?', desc: 'Toggle keyboard shortcuts guide' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded shadow-2xl p-4 font-mono text-xs text-zinc-300 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            <span>Workstation Shortcuts</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {SHORTCUTS.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-1.5 rounded bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-zinc-300">{item.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-200 font-semibold shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-[10px] text-zinc-500 text-center border-t border-zinc-800">
          Press <kbd className="px-1 py-0.2 bg-zinc-800 rounded text-zinc-300">Esc</kbd> or click outside to dismiss
        </div>
      </div>
    </div>
  );
};
