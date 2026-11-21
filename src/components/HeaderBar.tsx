import React from 'react';
import { Film } from 'lucide-react';

export type WorkspaceView = 'editor' | 'ai' | 'templates';

interface HeaderBarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  onOpenProjectMenu: () => void;
  onOpenExport: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeView,
  onSelectView,
  onOpenProjectMenu,
  onOpenExport,
}) => {
  const navItems: { id: WorkspaceView; label: string }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'ai', label: 'AI Director' },
    { id: 'templates', label: 'Templates' },
  ];

  return (
    <header className="h-14 shrink-0 border-b border-slate-800/80 bg-[#11141B] px-5 flex items-center justify-between gap-8">
      {/* Zone 1: Single-element brand wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectView('editor');
        }}
        className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 hover:text-white transition-colors"
      >
        Kinetik Studio
      </a>

      {/* Zone 2: Concise single-line navigation links */}
      <nav aria-label="Workspace navigation" className="flex items-center gap-6">
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
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenProjectMenu}
          className="py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          Project JSON
        </button>
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Film className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
