import React from 'react';
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DocumentPage } from '../types';

interface PageNavigatorProps {
  pages: DocumentPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  return (
    <div className="h-10 bg-zinc-900 border-t border-zinc-800 px-3 flex items-center justify-between select-none z-20 text-zinc-300 font-mono text-xs">
      {/* Pagination arrows */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onSelectPage(Math.max(0, activePageIndex - 1))}
          disabled={activePageIndex === 0}
          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 border border-zinc-700 transition-colors"
          title="Previous Sheet"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] text-zinc-400 px-1.5">
          Sheet {activePageIndex + 1} / {pages.length}
        </span>

        <button
          onClick={() => onSelectPage(Math.min(pages.length - 1, activePageIndex + 1))}
          disabled={activePageIndex === pages.length - 1}
          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 border border-zinc-700 transition-colors"
          title="Next Sheet"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sheet list */}
      <div className="flex items-center space-x-1 overflow-x-auto max-w-md py-0.5">
        {pages.map((page, idx) => {
          const isActive = idx === activePageIndex;
          const assignedCount = Object.values(page.cells).filter(Boolean).length;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`h-7 px-2.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1.5 shrink-0 border ${
                isActive
                  ? 'bg-zinc-800 border-zinc-500 text-zinc-100 font-medium'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span>Sheet {idx + 1}</span>
              {assignedCount > 0 && (
                <span className="text-[9px] px-1 rounded bg-zinc-900 text-zinc-400">
                  {assignedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sheet management buttons */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onAddPage}
          className="h-7 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] flex items-center gap-1 transition-colors"
          title="Add empty sheet"
        >
          <Plus className="w-3 h-3" />
          <span>New Sheet</span>
        </button>

        <button
          onClick={() => onDuplicatePage(activePageIndex)}
          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
          title="Duplicate current sheet"
        >
          <Copy className="w-3 h-3" />
        </button>

        {pages.length > 1 && (
          <button
            onClick={() => onDeletePage(activePageIndex)}
            className="p-1.5 rounded bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition-colors"
            title="Delete current sheet"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
