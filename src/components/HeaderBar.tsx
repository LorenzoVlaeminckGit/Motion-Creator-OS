import React, { useState } from 'react';
import { Check, Film, HelpCircle, Menu, Moon, Save, Sun, X } from 'lucide-react';
import { formatLastSavedStatus } from '../engine/quickSave';

export type WorkspaceView = 'editor' | 'ai' | 'templates';
export type StudioTheme = 'dark' | 'light';

interface HeaderBarProps {
  activeView: WorkspaceView;
  theme: StudioTheme;
  lastSavedAt: number | null;
  hasUnsavedChanges: boolean;
  nowMs: number;
  onSelectView: (view: WorkspaceView) => void;
  onToggleTheme: () => void;
  onQuickSave: () => void;
  onOpenProjectMenu: () => void;
  onOpenExport: () => void;
  onOpenCheatSheet: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  theme,
  lastSavedAt,
  hasUnsavedChanges,
  nowMs,
  onSelectView,
  onToggleTheme,
  onQuickSave,
  onOpenProjectMenu,
  onOpenExport,
  onOpenCheatSheet,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const lastSavedText = formatLastSavedStatus(lastSavedAt, nowMs, hasUnsavedChanges);

  const navItems: { id: WorkspaceView; label: string }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'ai', label: 'AI Director' },
    { id: 'templates', label: 'Templates' },
  ];

  const handleSelectMobileView = (view: WorkspaceView) => {
    onSelectView(view);
    setMobileNavOpen(false);
  };

  return (
    <header className="relative h-13 md:h-14 shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#11141B] px-3 sm:px-5 flex items-center justify-between gap-3 md:gap-8 z-30">
      {/* Zone 1: Single-element brand wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectView('editor');
          setMobileNavOpen(false);
        }}
        className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 hover:text-blue-600 dark:hover:text-white"
      >
        Kinetik Studio
      </a>

      {/* Zone 2: Concise single-line desktop navigation links */}
      <nav aria-label="Workspace navigation" className="hidden md:flex items-center gap-6">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'text-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-600 dark:bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenProjectMenu}
          className="py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          Project JSON
        </button>
      </nav>

      {/* Zone 3: Quick Save, Cheat sheet, theme switcher, mobile nav menu, and primary export action */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="last-saved-indicator"
            aria-live="polite"
            className="hidden lg:inline text-[11px] font-medium font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
          >
            {lastSavedText}
          </span>
          <button
            type="button"
            onClick={onQuickSave}
            data-testid="quick-save-button"
            aria-label={`Quick Save (${lastSavedText})`}
            title={`Quick Save to browser storage (Ctrl+S) — ${lastSavedText}`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] sm:min-w-0 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-[#171B24] dark:hover:bg-[#1E2430] text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {hasUnsavedChanges ? (
              <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Quick Save</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            onOpenCheatSheet();
          }}
          data-testid="cheat-sheet-button"
          aria-label="Keyboard shortcuts cheat sheet"
          title="Keyboard shortcuts (?)"
          className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-[#171B24] dark:hover:bg-[#1E2430] text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          data-testid="theme-toggle"
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] min-w-[38px] sm:min-w-0 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-[#171B24] dark:hover:bg-[#1E2430] text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Film className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Export Video</span>
          <span className="sm:hidden">Export</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? 'Close workspace menu' : 'Open workspace menu'}
          data-testid="mobile-menu-toggle"
          className="md:hidden inline-flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-[#171B24] dark:hover:bg-[#1E2430] text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          {mobileNavOpen ? (
            <X className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Menu className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Workspace Switcher Popover */}
      {mobileNavOpen && (
        <div
          role="dialog"
          aria-label="Mobile workspace navigation"
          className="md:hidden absolute top-full left-0 right-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#11141B]/95 backdrop-blur-md p-3 shadow-xl z-50 space-y-2.5"
        >
          <div className="flex items-center justify-between px-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
            <span>{lastSavedText}</span>
            <button
              type="button"
              onClick={() => {
                onQuickSave();
                setMobileNavOpen(false);
              }}
              className="font-sans font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              Quick Save
            </button>
          </div>
          <nav className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMobileView(item.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold text-left border transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 bg-blue-600/10 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171B24] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onOpenProjectMenu();
              }}
              className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold text-left border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171B24] text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              Project JSON
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
