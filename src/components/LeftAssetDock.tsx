import React, { useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Check,
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
import {
  buildPresetSparklinePoints,
  MOTION_PRESETS,
} from '../data/motionPresets';
import type { MotionObject, MotionObjectType } from '../types/motion';

export type LeftDockTab = 'objects' | 'presets';

interface LeftAssetDockProps {
  objects: MotionObject[];
  selectedId: string | null;
  draggingPresetId: string | null;
  controlledTab?: LeftDockTab;
  onDockTabChange?: (tab: LeftDockTab) => void;
  onAddObject: (type: MotionObjectType) => void;
  onSelectObject: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onPresetDragStart: (presetId: string) => void;
  onPresetDragEnd: () => void;
  onApplyMotionPreset: (objectId: string, presetId: string) => void;
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
  draggingPresetId,
  controlledTab,
  onDockTabChange,
  onAddObject,
  onSelectObject,
  onToggleVisible,
  onToggleLock,
  onMoveLayer,
  onDuplicateObject,
  onDeleteObject,
  onPresetDragStart,
  onPresetDragEnd,
  onApplyMotionPreset,
}) => {
  const [internalTab, setInternalTab] = useState<LeftDockTab>('objects');
  const [dropHoverLayerId, setDropHoverLayerId] = useState<string | null>(null);
  const [justAppliedPresetId, setJustAppliedPresetId] = useState<string | null>(null);

  const dockTab = controlledTab ?? internalTab;
  const setDockTab = (next: LeftDockTab) => {
    setInternalTab(next);
    onDockTabChange?.(next);
  };

  // Display top-most z-order layer first
  const reversedLayers = [...objects].reverse();
  const selectedLayer = objects.find((o) => o.id === selectedId) ?? null;

  const triggerAppliedFeedback = (presetId: string) => {
    setJustAppliedPresetId(presetId);
    window.setTimeout(() => {
      setJustAppliedPresetId((prev) => (prev === presetId ? null : prev));
    }, 1200);
  };

  return (
    <aside
      aria-label="Motion objects and layers"
      className="w-full lg:w-[268px] h-full shrink-0 lg:border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151D] flex flex-col min-h-0"
    >
      {/* Top Dock Switcher: Objects | Motion Presets */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-1 bg-slate-100 dark:bg-[#11141B] shrink-0">
        <button
          type="button"
          onClick={() => setDockTab('objects')}
          className={`min-h-[40px] lg:min-h-0 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            dockTab === 'objects'
              ? 'bg-white text-slate-900 shadow-sm dark:shadow-none dark:bg-[#1D2330] dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Objects
        </button>
        <button
          type="button"
          onClick={() => setDockTab('presets')}
          className={`min-h-[40px] lg:min-h-0 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            dockTab === 'presets'
              ? 'bg-white text-slate-900 shadow-sm dark:shadow-none dark:bg-[#1D2330] dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Motion Presets
        </button>
      </div>

      {/* Objects OR Motion Presets Panel */}
      {dockTab === 'objects' ? (
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide mb-2.5">
            Add Motion Object
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
            {PRIMITIVE_TOOLS.map((tool) => (
              <button
                key={tool.type}
                type="button"
                onClick={() => onAddObject(tool.type)}
                className="flex items-center gap-2 min-h-[42px] lg:min-h-0 px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 dark:bg-[#171B24] dark:hover:bg-[#1E2430] dark:hover:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors text-left cursor-pointer whitespace-nowrap overflow-hidden"
              >
                <span className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
                  {tool.icon}
                </span>
                <span className="truncate">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
              Easing &amp; Keyframe Presets
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono-tabular">
              {MOTION_PRESETS.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {selectedLayer
              ? `Drag or tap to apply onto "${selectedLayer.name}".`
              : 'Select a layer below, then tap or drag a preset.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5" role="list" aria-label="Motion presets library">
            {MOTION_PRESETS.map((preset) => {
              const points = buildPresetSparklinePoints(preset.easing, 36, 18);
              const applied = justAppliedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="listitem"
                  draggable
                  data-preset-id={preset.id}
                  title={`${preset.name}: ${preset.summary}`}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-kinetik-preset', preset.id);
                    e.dataTransfer.setData('text/plain', preset.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    onPresetDragStart(preset.id);
                  }}
                  onDragEnd={() => {
                    setDropHoverLayerId(null);
                    onPresetDragEnd();
                  }}
                  onClick={() => {
                    if (!selectedLayer) return;
                    onApplyMotionPreset(selectedLayer.id, preset.id);
                    triggerAppliedFeedback(preset.id);
                  }}
                  disabled={!selectedLayer}
                  className="group flex flex-col gap-1.5 min-h-[54px] lg:min-h-0 p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 dark:bg-[#171B24] dark:hover:bg-[#1E2430] dark:hover:border-slate-600 disabled:opacity-45 disabled:cursor-not-allowed text-left transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {preset.name}
                    </span>
                    {applied && (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <svg
                      width="36"
                      height="18"
                      viewBox="0 0 36 18"
                      className="shrink-0 overflow-visible"
                      aria-hidden="true"
                    >
                      <line
                        x1="0"
                        y1="14"
                        x2="36"
                        y2="14"
                        stroke="rgba(100,116,139,0.28)"
                        strokeWidth="1"
                      />
                      <polyline
                        fill="none"
                        stroke={preset.accentColor}
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {preset.propsSummary}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Layer Stack */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
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
              const isDropTarget = dropHoverLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  onDragOver={(e) => {
                    const hasPreset =
                      Boolean(draggingPresetId) ||
                      e.dataTransfer.types.includes('application/x-kinetik-preset');
                    if (!hasPreset) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dropHoverLayerId !== layer.id) {
                      setDropHoverLayerId(layer.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropHoverLayerId === layer.id) {
                      setDropHoverLayerId(null);
                    }
                  }}
                  onDrop={(e) => {
                    const presetId =
                      e.dataTransfer.getData('application/x-kinetik-preset') ||
                      e.dataTransfer.getData('text/plain') ||
                      draggingPresetId;
                    setDropHoverLayerId(null);
                    if (!presetId) return;
                    e.preventDefault();
                    onSelectObject(layer.id);
                    onApplyMotionPreset(layer.id, presetId);
                    triggerAppliedFeedback(presetId);
                    onPresetDragEnd();
                  }}
                  className={`group rounded-md border px-2.5 py-2 transition-colors ${
                    isDropTarget
                      ? 'border-cyan-500 bg-cyan-500/15 dark:border-cyan-400'
                      : isSelected
                        ? 'border-blue-500/70 bg-blue-500/10'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-[#171B24]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectObject(layer.id)}
                      className="flex-1 min-w-0 min-h-[36px] lg:min-h-0 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-slate-900/15 dark:border-white/20"
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
                          layer.visible
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500 line-through'
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
                        className="p-2 lg:p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
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
                        className="p-2 lg:p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {layer.locked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/70 flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="capitalize truncate">{layer.type}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMoveLayer(layer.id, 'up')}
                          aria-label={`Bring '${layer.name}' forward`}
                          className="p-2 lg:p-1 rounded hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveLayer(layer.id, 'down')}
                          aria-label={`Send '${layer.name}' backward`}
                          className="p-2 lg:p-1 rounded hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateObject(layer.id)}
                          aria-label={`Duplicate '${layer.name}'`}
                          className="p-2 lg:p-1 rounded hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObject(layer.id)}
                          aria-label={`Delete '${layer.name}'`}
                          className="p-2 lg:p-1 rounded hover:bg-red-500/15 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 cursor-pointer"
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
