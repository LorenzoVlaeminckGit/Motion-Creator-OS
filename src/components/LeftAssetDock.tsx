import React from 'react';
import {
  Activity,
  ArrowUp,
  ArrowDown,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  Hash,
  Hexagon,
  Lock,
  Minus,
  Orbit,
  PenTool,
  Sparkles,
  Square,
  Star,
  Trash2,
  Type,
  Unlock,
  Waves,
} from 'lucide-react';
import type { MotionObject, MotionObjectType } from '../types/motion';

interface LeftAssetDockProps {
  objects: MotionObject[];
  selectedId: string | null;
  onAddObject: (type: MotionObjectType) => void;
  onSelectObject: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
}

const PRIMITIVE_TOOLS: { type: MotionObjectType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Title', icon: <Type className="w-3.5 h-3.5" /> },
  { type: 'counter', label: 'Counter', icon: <Hash className="w-3.5 h-3.5" /> },
  { type: 'rect', label: 'Rect', icon: <Square className="w-3.5 h-3.5" /> },
  { type: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
  { type: 'polygon', label: 'Polygon', icon: <Hexagon className="w-3.5 h-3.5" /> },
  { type: 'star', label: 'Star', icon: <Star className="w-3.5 h-3.5" /> },
  { type: 'ring', label: 'Arc Ring', icon: <Circle className="w-3.5 h-3.5 stroke-[2.5]" /> },
  { type: 'line', label: 'Beam', icon: <Minus className="w-3.5 h-3.5" /> },
  { type: 'path', label: 'SVG Path', icon: <PenTool className="w-3.5 h-3.5" /> },
  { type: 'particles', label: 'Particles', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { type: 'waveform', label: 'Waveform', icon: <Activity className="w-3.5 h-3.5" /> },
  { type: 'orbit', label: 'Orbit Rig', icon: <Orbit className="w-3.5 h-3.5" /> },
  { type: 'blob', label: 'Blob', icon: <Waves className="w-3.5 h-3.5" /> },
  { type: 'grid', label: 'Dot Grid', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
];

export const LeftAssetDock: React.FC<LeftAssetDockProps> = ({
  objects,
  selectedId,
  onAddObject,
  onSelectObject,
  onToggleVisible,
  onToggleLock,
  onMoveLayer,
  onDuplicateObject,
  onDeleteObject,
}) => {
  // Display top-most z-order layer first
  const reversedLayers = [...objects].reverse();

  return (
    <aside
      aria-label="Motion objects and layers"
      className="w-[268px] shrink-0 border-r border-slate-800/80 bg-[#12151D] flex flex-col min-h-0"
    >
      {/* Add Motion Objects */}
      <div className="p-3.5 border-b border-slate-800/80">
        <h2 className="text-xs font-semibold text-slate-300 tracking-wide mb-2.5">
          Add Motion Object
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIMITIVE_TOOLS.map((tool) => (
            <button
              key={tool.type}
              type="button"
              onClick={() => onAddObject(tool.type)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-slate-800 bg-[#171B24] hover:bg-[#1E2430] hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors text-left cursor-pointer whitespace-nowrap overflow-hidden"
            >
              <span className="text-blue-400 shrink-0" aria-hidden="true">
                {tool.icon}
              </span>
              <span className="truncate">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Stack */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3.5 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-300 tracking-wide">
            Layers
          </h2>
          <span className="text-xs text-slate-500 font-mono-tabular">
            {objects.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {reversedLayers.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-6 text-center">
              No layers yet. Add an object above or use AI Director.
            </p>
          ) : (
            reversedLayers.map((layer) => {
              const isSelected = layer.id === selectedId;
              return (
                <div
                  key={layer.id}
                  className={`group rounded-md border px-2.5 py-2 transition-colors ${
                    isSelected
                      ? 'border-blue-500/70 bg-blue-500/10'
                      : 'border-transparent hover:border-slate-800 hover:bg-[#171B24]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectObject(layer.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                        style={{
                          backgroundColor:
                            layer.style.fillMode === 'none'
                              ? layer.style.strokeColor
                              : layer.style.fillColor,
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-xs font-medium truncate ${
                          layer.visible ? 'text-slate-100' : 'text-slate-500 line-through'
                        }`}
                      >
                        {layer.name}
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleVisible(layer.id)}
                        aria-label={
                          layer.visible
                            ? `Hide '${layer.name}'`
                            : `Show '${layer.name}'`
                        }
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLock(layer.id)}
                        aria-label={
                          layer.locked
                            ? `Unlock '${layer.name}'`
                            : `Lock '${layer.name}'`
                        }
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      >
                        {layer.locked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between gap-1 text-[11px] text-slate-400">
                      <span className="capitalize truncate">{layer.type}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMoveLayer(layer.id, 'up')}
                          aria-label={`Bring '${layer.name}' forward`}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveLayer(layer.id, 'down')}
                          aria-label={`Send '${layer.name}' backward`}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateObject(layer.id)}
                          aria-label={`Duplicate '${layer.name}'`}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObject(layer.id)}
                          aria-label={`Delete '${layer.name}'`}
                          className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
