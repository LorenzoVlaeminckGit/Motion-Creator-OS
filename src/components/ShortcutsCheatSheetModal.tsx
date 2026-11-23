import React, { useEffect, useState } from 'react';
import { Keyboard, Search, X } from 'lucide-react';
import {
  SHORTCUT_CATEGORIES,
  filterKeyboardShortcuts,
} from '../data/keyboardShortcuts';

interface ShortcutsCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsCheatSheetModal: React.FC<ShortcutsCheatSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = filterKeyboardShortcuts(query);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheat-sheet-modal-title"
      data-testid="cheat-sheet-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131720] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2
              id="cheat-sheet-modal-title"
              className="font-display text-base font-bold text-slate-900 dark:text-white truncate"
            >
              Keyboard Shortcuts Cheat Sheet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cheat sheet"
            data-testid="cheat-sheet-close"
            className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#10131B] shrink-0">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter shortcuts by action or key (e.g. Ctrl+Z, Space)..."
              aria-label="Filter keyboard shortcuts"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-[#171B24] pl-8 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear shortcut filter"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcut Groups */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No shortcuts match "{query}"
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Reset search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SHORTCUT_CATEGORIES.map((category) => {
                const items = filtered.filter((s) => s.category === category);
                if (items.length === 0) return null;
                return (
                  <section key={category} className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-200 dark:border-slate-800/80">
                      {category}
                    </h3>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="py-2.5 first:pt-1 last:pb-0 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {item.label}
                            </p>
                            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {item.keys.map((keyLabel, idx) => (
                              <React.Fragment key={`${item.id}-${keyLabel}`}>
                                {idx > 0 && (
                                  <span
                                    aria-hidden="true"
                                    className="text-[10px] font-mono text-slate-400 dark:text-slate-500"
                                  >
                                    +
                                  </span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#1B202C] text-[11px] font-mono font-medium text-slate-800 dark:text-slate-100 shadow-xs whitespace-nowrap">
                                  {keyLabel}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#10131B] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            On macOS, use <span className="font-mono font-medium text-slate-800 dark:text-slate-200">⌘ Cmd</span> in place of <span className="font-mono font-medium text-slate-800 dark:text-slate-200">Ctrl</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-[#171B24] dark:hover:bg-[#1E2430] text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
