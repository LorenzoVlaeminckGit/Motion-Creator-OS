import React, { useState } from 'react';
import { Diamond, Magnet, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  DEFAULT_SMART_SNAP_SETTINGS,
  type SmartSnapSettings,
} from '../engine/smartSnap';
import type {
  AnimatableProperty,
  BackgroundType,
  BlendModeType,
  EasingType,
  EntrancePreset,
  ExitPreset,
  FillMode,
  MotionComposition,
  MotionObject,
  TextRevealMode,
} from '../types/motion';

type InspectorTab = 'object' | 'motion' | 'scene' | 'snap';

interface RightInspectorProps {
  composition: MotionComposition;
  selectedObject: MotionObject | null;
  currentTime: number;
  snapSettings: SmartSnapSettings;
  onChangeSnapSettings: (updater: (prev: SmartSnapSettings) => SmartSnapSettings) => void;
  onUpdateObject: (id: string, updater: (obj: MotionObject) => MotionObject) => void;
  onUpdateComposition: (updater: (comp: MotionComposition) => MotionComposition) => void;
  onAddKeyframe: (id: string, prop: AnimatableProperty, value: number, easing: EasingType) => void;
  onRemoveKeyframe: (id: string, prop: AnimatableProperty, kfId: string) => void;
}

const INPUT_CLASS =
  'w-full bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded px-2.5 py-2 lg:px-2 lg:py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono-tabular outline-none';

const LABEL_CLASS = 'block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1';

export const RightInspector: React.FC<RightInspectorProps> = ({
  composition,
  selectedObject,
  currentTime,
  snapSettings,
  onChangeSnapSettings,
  onUpdateObject,
  onUpdateComposition,
  onAddKeyframe,
  onRemoveKeyframe,
}) => {
  const [tab, setTab] = useState<InspectorTab>('object');
  const [selectedEasing, setSelectedEasing] = useState<EasingType>('easeOutExpo');
  const [kfProp, setKfProp] = useState<AnimatableProperty>('x');

  const updateObj = (patch: Partial<MotionObject>) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, (obj) => ({ ...obj, ...patch }));
  };

  const updateTransform = (key: keyof MotionObject['transform'], val: number) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, (obj) => ({
      ...obj,
      transform: { ...obj.transform, [key]: val },
    }));
  };

  const updateStyle = <K extends keyof MotionObject['style']>(
    key: K,
    val: MotionObject['style'][K],
  ) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, (obj) => ({
      ...obj,
      style: { ...obj.style, [key]: val },
    }));
  };

  return (
    <aside
      aria-label="Properties inspector"
      className="w-full lg:w-[316px] h-full shrink-0 lg:border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151D] flex flex-col min-h-0"
    >
      {/* Inspector Tabs */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800/80 grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#11141B] shrink-0">
        {(
          [
            { id: 'object', label: 'Object' },
            { id: 'motion', label: 'Motion' },
            { id: 'scene', label: 'Scene' },
            { id: 'snap', label: 'Snap' },
          ] as { id: InspectorTab; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`inspector-tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`min-h-[40px] lg:min-h-0 py-1.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
              tab === item.id
                ? 'bg-white text-slate-900 shadow-sm dark:shadow-none dark:bg-[#1D2330] dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {tab === 'snap' ? (
          <div data-testid="inspector-snap-panel" className="space-y-5">
            {/* Master Smart Snap Toggle */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    Smart Snap Settings
                  </h3>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={snapSettings.enabled}
                  aria-label="Enable Smart Snap"
                  data-testid="snap-master-toggle"
                  onClick={() =>
                    onChangeSnapSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                    snapSettings.enabled
                      ? 'bg-cyan-600 border-cyan-500'
                      : 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                      snapSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Highlight magnetic alignment guides when dragging objects on the stage. Synced with the Canvas toolbar Snap button.
              </p>
            </div>

            {/* Guide Types */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Active Guide Types
              </h3>

              {(
                [
                  {
                    key: 'canvasCenter' as const,
                    title: 'Canvas Center Guides',
                    description: 'Snap to vertical & horizontal stage midlines',
                    testId: 'snap-toggle-canvas-center',
                  },
                  {
                    key: 'objectCenter' as const,
                    title: 'Center-to-Center Alignment',
                    description: 'Align layer centers with sibling objects',
                    testId: 'snap-toggle-object-center',
                  },
                  {
                    key: 'objectEdge' as const,
                    title: 'Edge-to-Edge Alignment',
                    description: 'Align left, right, top & bottom bounding edges',
                    testId: 'snap-toggle-object-edge',
                  },
                ]
              ).map((item) => {
                const checked = snapSettings[item.key];
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                      snapSettings.enabled
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#171B24]'
                        : 'border-slate-200/70 dark:border-slate-800/60 bg-slate-50/40 dark:bg-[#141821] opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={item.title}
                      data-testid={item.testId}
                      onClick={() =>
                        onChangeSnapSettings((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                        checked
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
                          checked ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sensitivity Threshold */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="snap-threshold-slider"
                  className="text-xs font-semibold text-slate-900 dark:text-slate-200"
                >
                  Snap Sensitivity Threshold
                </label>
                <span
                  data-testid="snap-threshold-value"
                  className="text-xs font-mono tabular-nums font-semibold text-cyan-700 dark:text-cyan-400"
                >
                  {snapSettings.threshold} px
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  id="snap-threshold-slider"
                  data-testid="snap-threshold-slider"
                  type="range"
                  min={4}
                  max={48}
                  step={1}
                  value={snapSettings.threshold}
                  onChange={(e) => {
                    const nextVal = Math.max(4, Math.min(48, Number(e.target.value) || 16));
                    onChangeSnapSettings((prev) => ({ ...prev, threshold: nextVal }));
                  }}
                  className="flex-1 cursor-pointer accent-cyan-500"
                />
                <input
                  type="number"
                  aria-label="Snap threshold pixels"
                  data-testid="snap-threshold-input"
                  min={4}
                  max={48}
                  value={snapSettings.threshold}
                  onChange={(e) => {
                    const nextVal = Math.max(4, Math.min(48, Number(e.target.value) || 16));
                    onChangeSnapSettings((prev) => ({ ...prev, threshold: nextVal }));
                  }}
                  className="w-16 bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-xs text-right text-slate-900 dark:text-slate-100 font-mono tabular-nums outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Fine · 6px', value: 6 },
                  { label: 'Balanced · 16px', value: 16 },
                  { label: 'Strong · 32px', value: 32 },
                ].map((preset) => {
                  const active = snapSettings.threshold === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        onChangeSnapSettings((prev) => ({ ...prev, threshold: preset.value }))
                      }
                      className={`min-h-[34px] lg:min-h-0 px-2 py-1.5 rounded border text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181C26] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hold <span className="font-mono font-medium">Alt</span> while dragging to bypass.
                </p>
                <button
                  type="button"
                  onClick={() => onChangeSnapSettings(() => ({ ...DEFAULT_SMART_SNAP_SETTINGS }))}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        ) : tab === 'scene' ? (
          <>
            {/* Composition Settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Composition & Timing
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="scene-width" className={LABEL_CLASS}>
                    Width (px)
                  </label>
                  <input
                    id="scene-width"
                    type="number"
                    min={320}
                    max={3840}
                    value={composition.width}
                    onChange={(e) =>
                      onUpdateComposition((c) => ({
                        ...c,
                        width: Math.max(320, Number(e.target.value) || 1920),
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="scene-height" className={LABEL_CLASS}>
                    Height (px)
                  </label>
                  <input
                    id="scene-height"
                    type="number"
                    min={320}
                    max={3840}
                    value={composition.height}
                    onChange={(e) =>
                      onUpdateComposition((c) => ({
                        ...c,
                        height: Math.max(320, Number(e.target.value) || 1080),
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="scene-duration" className={LABEL_CLASS}>
                    Duration (s)
                  </label>
                  <input
                    id="scene-duration"
                    type="number"
                    min={1}
                    max={30}
                    step={0.5}
                    value={composition.duration}
                    onChange={(e) =>
                      onUpdateComposition((c) => ({
                        ...c,
                        duration: Math.max(1, Math.min(30, Number(e.target.value) || 6)),
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="scene-fps" className={LABEL_CLASS}>
                    Frame Rate
                  </label>
                  <select
                    id="scene-fps"
                    value={composition.fps}
                    onChange={(e) =>
                      onUpdateComposition((c) => ({
                        ...c,
                        fps: Number(e.target.value),
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="scene-bpm" className={LABEL_CLASS}>
                  Beat Tempo (BPM)
                </label>
                <input
                  id="scene-bpm"
                  type="number"
                  min={40}
                  max={220}
                  value={composition.bpm}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      bpm: Math.max(40, Math.min(220, Number(e.target.value) || 120)),
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Background */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Backdrop Engine
              </h3>
              <div>
                <label htmlFor="bg-type" className={LABEL_CLASS}>
                  Background Mode
                </label>
                <select
                  id="bg-type"
                  value={composition.background.type}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      background: {
                        ...c.background,
                        type: e.target.value as BackgroundType,
                      },
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="radial-mesh">Radial Mesh</option>
                  <option value="linear-gradient">Linear Gradient</option>
                  <option value="grid-studio">Studio Grid</option>
                  <option value="starfield">Starfield Drift</option>
                  <option value="solid">Solid Matte</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['color1', 'color2', 'color3'] as const).map((ck, idx) => (
                  <div key={ck}>
                    <label htmlFor={`bg-${ck}`} className={LABEL_CLASS}>
                      Color {idx + 1}
                    </label>
                    <input
                      id={`bg-${ck}`}
                      type="color"
                      value={composition.background[ck]}
                      onChange={(e) =>
                        onUpdateComposition((c) => ({
                          ...c,
                          background: { ...c.background, [ck]: e.target.value },
                        }))
                      }
                      className="w-full h-8 rounded bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
              <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span>Animate Backdrop</span>
                <input
                  type="checkbox"
                  checked={composition.background.animate}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      background: { ...c.background, animate: e.target.checked },
                    }))
                  }
                  className="rounded border-slate-700"
                />
              </label>
            </div>

            {/* Camera & Post FX */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Camera Rig & Post-FX
              </h3>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <label htmlFor="cam-zoom">Camera Zoom</label>
                  <span className="font-mono-tabular">{composition.camera.zoom.toFixed(2)}x</span>
                </div>
                <input
                  id="cam-zoom"
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.02}
                  value={composition.camera.zoom}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      camera: { ...c.camera, zoom: Number(e.target.value) },
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <label htmlFor="cam-drift">Handheld Drift</label>
                  <span className="font-mono-tabular">
                    {Math.round(composition.camera.handheldDrift * 100)}%
                  </span>
                </div>
                <input
                  id="cam-drift"
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={composition.camera.handheldDrift}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      camera: { ...c.camera, handheldDrift: Number(e.target.value) },
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <label htmlFor="cam-vignette">Vignette</label>
                  <span className="font-mono-tabular">
                    {Math.round(composition.camera.vignette * 100)}%
                  </span>
                </div>
                <input
                  id="cam-vignette"
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.02}
                  value={composition.camera.vignette}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      camera: { ...c.camera, vignette: Number(e.target.value) },
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <label htmlFor="cam-grain">Film Grain</label>
                  <span className="font-mono-tabular">
                    {Math.round(composition.camera.filmGrain * 100)}%
                  </span>
                </div>
                <input
                  id="cam-grain"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={composition.camera.filmGrain}
                  onChange={(e) =>
                    onUpdateComposition((c) => ({
                      ...c,
                      camera: { ...c.camera, filmGrain: Number(e.target.value) },
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </>
        ) : !selectedObject ? (
          <div className="py-12 text-center">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              No Layer Selected
            </p>
            <p className="text-[11px] text-slate-500">
              Select an object on the canvas or in the Layer Stack to edit its properties.
            </p>
          </div>
        ) : tab === 'object' ? (
          <>
            {/* Identity & Timing */}
            <div className="space-y-3">
              <div>
                <label htmlFor="layer-name" className={LABEL_CLASS}>
                  Layer Name
                </label>
                <input
                  id="layer-name"
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) => updateObj({ name: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="layer-start" className={LABEL_CLASS}>
                    Start (s)
                  </label>
                  <input
                    id="layer-start"
                    type="number"
                    min={0}
                    max={composition.duration}
                    step={0.05}
                    value={selectedObject.startTime}
                    onChange={(e) =>
                      updateObj({
                        startTime: Math.max(0, Math.min(selectedObject.endTime - 0.1, Number(e.target.value))),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="layer-end" className={LABEL_CLASS}>
                    End (s)
                  </label>
                  <input
                    id="layer-end"
                    type="number"
                    min={0.2}
                    max={composition.duration}
                    step={0.05}
                    value={selectedObject.endTime}
                    onChange={(e) =>
                      updateObj({
                        endTime: Math.min(
                          composition.duration,
                          Math.max(selectedObject.startTime + 0.1, Number(e.target.value)),
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            {/* Transform */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Transform</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="tr-x" className={LABEL_CLASS}>X</label>
                  <input
                    id="tr-x"
                    type="number"
                    value={Math.round(selectedObject.transform.x)}
                    onChange={(e) => updateTransform('x', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="tr-y" className={LABEL_CLASS}>Y</label>
                  <input
                    id="tr-y"
                    type="number"
                    value={Math.round(selectedObject.transform.y)}
                    onChange={(e) => updateTransform('y', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="tr-w" className={LABEL_CLASS}>Width</label>
                  <input
                    id="tr-w"
                    type="number"
                    min={4}
                    value={Math.round(selectedObject.transform.width)}
                    onChange={(e) => updateTransform('width', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="tr-h" className={LABEL_CLASS}>Height</label>
                  <input
                    id="tr-h"
                    type="number"
                    min={4}
                    value={Math.round(selectedObject.transform.height)}
                    onChange={(e) => updateTransform('height', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="tr-rot" className={LABEL_CLASS}>Rotation (°)</label>
                  <input
                    id="tr-rot"
                    type="number"
                    value={Math.round(selectedObject.transform.rotation)}
                    onChange={(e) => updateTransform('rotation', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="tr-op" className={LABEL_CLASS}>Opacity</label>
                  <input
                    id="tr-op"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedObject.transform.opacity}
                    onChange={(e) => updateTransform('opacity', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            {/* Type-Specific Settings: Text / Counter */}
            {(selectedObject.type === 'text' || selectedObject.type === 'counter') && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  {selectedObject.type === 'counter' ? 'Counter & Typography' : 'Kinetic Typography'}
                </h3>
                <div>
                  <label htmlFor="txt-content" className={LABEL_CLASS}>
                    {selectedObject.type === 'counter' ? 'Caption Label' : 'Text Content'}
                  </label>
                  <textarea
                    id="txt-content"
                    rows={2}
                    value={selectedObject.textProps.content}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        textProps: { ...o.textProps, content: e.target.value },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="txt-font" className={LABEL_CLASS}>Font</label>
                    <select
                      id="txt-font"
                      value={selectedObject.textProps.fontFamily}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, (o) => ({
                          ...o,
                          textProps: {
                            ...o.textProps,
                            fontFamily: e.target.value as MotionObject['textProps']['fontFamily'],
                          },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta</option>
                      <option value="DM Sans">DM Sans</option>
                      <option value="Playfair Display">Playfair Serif</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="txt-size" className={LABEL_CLASS}>Font Size</label>
                    <input
                      id="txt-size"
                      type="number"
                      min={14}
                      max={260}
                      value={selectedObject.textProps.fontSize}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, (o) => ({
                          ...o,
                          textProps: { ...o.textProps, fontSize: Number(e.target.value) },
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                {selectedObject.type === 'text' ? (
                  <div>
                    <label htmlFor="txt-reveal" className={LABEL_CLASS}>Reveal Mode</label>
                    <select
                      id="txt-reveal"
                      value={selectedObject.textProps.revealMode}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, (o) => ({
                          ...o,
                          textProps: {
                            ...o.textProps,
                            revealMode: e.target.value as TextRevealMode,
                          },
                        }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="fade-up">Fade Up Lines</option>
                      <option value="word-pop">Elastic Pop</option>
                      <option value="typewriter">Typewriter</option>
                      <option value="scramble">Cipher Scramble</option>
                      <option value="none">Instant</option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="cnt-from" className={LABEL_CLASS}>From</label>
                      <input
                        id="cnt-from"
                        type="number"
                        value={selectedObject.textProps.counterFrom}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            textProps: { ...o.textProps, counterFrom: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="cnt-to" className={LABEL_CLASS}>To</label>
                      <input
                        id="cnt-to"
                        type="number"
                        value={selectedObject.textProps.counterTo}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            textProps: { ...o.textProps, counterTo: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="cnt-pre" className={LABEL_CLASS}>Prefix</label>
                      <input
                        id="cnt-pre"
                        type="text"
                        value={selectedObject.textProps.counterPrefix}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            textProps: { ...o.textProps, counterPrefix: e.target.value },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="cnt-suf" className={LABEL_CLASS}>Suffix</label>
                      <input
                        id="cnt-suf"
                        type="text"
                        value={selectedObject.textProps.counterSuffix}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            textProps: { ...o.textProps, counterSuffix: e.target.value },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Type-Specific Settings: SVG Path / Shape */}
            {selectedObject.type === 'path' && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                <label htmlFor="svg-path-input" className={LABEL_CLASS}>
                  SVG Path (0–100 ViewBox)
                </label>
                <textarea
                  id="svg-path-input"
                  rows={3}
                  value={selectedObject.shapeProps.svgPath}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, (o) => ({
                      ...o,
                      shapeProps: { ...o.shapeProps, svgPath: e.target.value },
                    }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {/* Procedural Generator Controls */}
            {(selectedObject.type === 'particles' ||
              selectedObject.type === 'waveform' ||
              selectedObject.type === 'orbit' ||
              selectedObject.type === 'blob' ||
              selectedObject.type === 'grid') && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Procedural Generator
                </h3>
                {selectedObject.type === 'particles' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="p-count" className={LABEL_CLASS}>Count</label>
                      <input
                        id="p-count"
                        type="number"
                        min={6}
                        max={160}
                        value={selectedObject.proceduralProps.particleCount}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, particleCount: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="p-speed" className={LABEL_CLASS}>Velocity</label>
                      <input
                        id="p-speed"
                        type="number"
                        min={10}
                        max={400}
                        value={selectedObject.proceduralProps.particleSpeed}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, particleSpeed: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                )}
                {selectedObject.type === 'waveform' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="w-bars" className={LABEL_CLASS}>Bars</label>
                      <input
                        id="w-bars"
                        type="number"
                        min={6}
                        max={64}
                        value={selectedObject.proceduralProps.waveBars}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, waveBars: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="w-freq" className={LABEL_CLASS}>Frequency</label>
                      <input
                        id="w-freq"
                        type="number"
                        min={0.5}
                        max={10}
                        step={0.2}
                        value={selectedObject.proceduralProps.waveFrequency}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, waveFrequency: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                )}
                {selectedObject.type === 'orbit' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="o-rings" className={LABEL_CLASS}>Rings</label>
                      <input
                        id="o-rings"
                        type="number"
                        min={1}
                        max={8}
                        value={selectedObject.proceduralProps.orbitRings}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, orbitRings: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="o-speed" className={LABEL_CLASS}>Orbit °/s</label>
                      <input
                        id="o-speed"
                        type="number"
                        min={-240}
                        max={240}
                        value={selectedObject.proceduralProps.orbitSpeed}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, (o) => ({
                            ...o,
                            proceduralProps: { ...o.proceduralProps, orbitSpeed: Number(e.target.value) },
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance & FX */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Appearance & FX</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="st-fillmode" className={LABEL_CLASS}>Fill Mode</label>
                  <select
                    id="st-fillmode"
                    value={selectedObject.style.fillMode}
                    onChange={(e) => updateStyle('fillMode', e.target.value as FillMode)}
                    className={INPUT_CLASS}
                  >
                    <option value="solid">Solid</option>
                    <option value="linear-gradient">Linear Grad</option>
                    <option value="radial-gradient">Radial Grad</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="st-blend" className={LABEL_CLASS}>Blend</label>
                  <select
                    id="st-blend"
                    value={selectedObject.style.blendMode}
                    onChange={(e) => updateStyle('blendMode', e.target.value as BlendModeType)}
                    className={INPUT_CLASS}
                  >
                    <option value="source-over">Normal</option>
                    <option value="screen">Screen</option>
                    <option value="lighter">Additive</option>
                    <option value="overlay">Overlay</option>
                    <option value="multiply">Multiply</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="st-c1" className={LABEL_CLASS}>Fill 1</label>
                  <input
                    id="st-c1"
                    type="color"
                    value={selectedObject.style.fillColor}
                    onChange={(e) => updateStyle('fillColor', e.target.value)}
                    className="w-full h-8 rounded bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="st-c2" className={LABEL_CLASS}>Fill 2</label>
                  <input
                    id="st-c2"
                    type="color"
                    value={selectedObject.style.fillColor2}
                    onChange={(e) => updateStyle('fillColor2', e.target.value)}
                    className="w-full h-8 rounded bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="st-sc" className={LABEL_CLASS}>Stroke</label>
                  <input
                    id="st-sc"
                    type="color"
                    value={selectedObject.style.strokeColor}
                    onChange={(e) => updateStyle('strokeColor', e.target.value)}
                    className="w-full h-8 rounded bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="st-sw" className={LABEL_CLASS}>Stroke Width</label>
                  <input
                    id="st-sw"
                    type="number"
                    min={0}
                    max={48}
                    value={selectedObject.style.strokeWidth}
                    onChange={(e) => updateStyle('strokeWidth', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="st-glow" className={LABEL_CLASS}>Glow Blur</label>
                  <input
                    id="st-glow"
                    type="number"
                    min={0}
                    max={80}
                    value={selectedObject.style.shadowBlur}
                    onChange={(e) => updateStyle('shadowBlur', Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Motion Tab */
          <>
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Entrance & Exit
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="beh-ent" className={LABEL_CLASS}>Entrance</label>
                  <select
                    id="beh-ent"
                    value={selectedObject.behavior.entrancePreset}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          entrancePreset: e.target.value as EntrancePreset,
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="scale-pop">Scale Pop</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="slide-left">Slide Left</option>
                    <option value="rotate-in">Rotate In</option>
                    <option value="blur-in">Blur Focus</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="beh-ent-dur" className={LABEL_CLASS}>Duration (s)</label>
                  <input
                    id="beh-ent-dur"
                    type="number"
                    min={0.1}
                    max={3}
                    step={0.05}
                    value={selectedObject.behavior.entranceDuration}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          entranceDuration: Number(e.target.value),
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="beh-exit" className={LABEL_CLASS}>Exit</label>
                  <select
                    id="beh-exit"
                    value={selectedObject.behavior.exitPreset}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          exitPreset: e.target.value as ExitPreset,
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="none">None</option>
                    <option value="fade">Fade Out</option>
                    <option value="scale-down">Scale Down</option>
                    <option value="slide-down">Slide Down</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="beh-exit-dur" className={LABEL_CLASS}>Exit (s)</label>
                  <input
                    id="beh-exit-dur"
                    type="number"
                    min={0.1}
                    max={3}
                    step={0.05}
                    value={selectedObject.behavior.exitDuration}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          exitDuration: Number(e.target.value),
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            {/* Continuous Kinetic Physics */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                Continuous Kinetic Modifiers
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="beh-spin" className={LABEL_CLASS}>Spin (°/sec)</label>
                  <input
                    id="beh-spin"
                    type="number"
                    min={-360}
                    max={360}
                    value={selectedObject.behavior.spinSpeed}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: { ...o.behavior, spinSpeed: Number(e.target.value) },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="beh-pulse" className={LABEL_CLASS}>Beat Pulse</label>
                  <input
                    id="beh-pulse"
                    type="number"
                    min={0}
                    max={0.5}
                    step={0.02}
                    value={selectedObject.behavior.pulseAmp}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: { ...o.behavior, pulseAmp: Number(e.target.value) },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="beh-ox" className={LABEL_CLASS}>Float X (px)</label>
                  <input
                    id="beh-ox"
                    type="number"
                    min={0}
                    max={250}
                    value={selectedObject.behavior.oscillateX.amp}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          oscillateX: { ...o.behavior.oscillateX, amp: Number(e.target.value) },
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="beh-oy" className={LABEL_CLASS}>Float Y (px)</label>
                  <input
                    id="beh-oy"
                    type="number"
                    min={0}
                    max={250}
                    value={selectedObject.behavior.oscillateY.amp}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, (o) => ({
                        ...o,
                        behavior: {
                          ...o.behavior,
                          oscillateY: { ...o.behavior.oscillateY, amp: Number(e.target.value) },
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>

            {/* Keyframe Inspector */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Keyframes @ {currentTime.toFixed(2)}s
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Keyframe property"
                  value={kfProp}
                  onChange={(e) => setKfProp(e.target.value as AnimatableProperty)}
                  className={INPUT_CLASS}
                >
                  <option value="x">Position X</option>
                  <option value="y">Position Y</option>
                  <option value="scaleX">Scale X</option>
                  <option value="scaleY">Scale Y</option>
                  <option value="rotation">Rotation</option>
                  <option value="opacity">Opacity</option>
                  <option value="width">Width</option>
                </select>
                <select
                  aria-label="Keyframe easing"
                  value={selectedEasing}
                  onChange={(e) => setSelectedEasing(e.target.value as EasingType)}
                  className={INPUT_CLASS}
                >
                  <option value="easeOutExpo">Expo Out</option>
                  <option value="easeOutBack">Back Out</option>
                  <option value="easeInOutCubic">Cubic InOut</option>
                  <option value="springElastic">Spring</option>
                  <option value="bounceOut">Bounce</option>
                  <option value="linear">Linear</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onAddKeyframe(
                      selectedObject.id,
                      kfProp,
                      selectedObject.transform[kfProp],
                      selectedEasing,
                    )
                  }
                  aria-label="Insert keyframe"
                  className="p-2 rounded bg-blue-600 hover:bg-blue-500 text-white shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {(Object.keys(selectedObject.keyframes) as AnimatableProperty[]).flatMap((prop) =>
                  (selectedObject.keyframes[prop] ?? []).map((kf) => (
                    <div
                      key={kf.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-50 dark:bg-[#181C26] border border-slate-200 dark:border-slate-800/80 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Diamond className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">{prop}</span>
                        <span className="font-mono-tabular text-slate-600 dark:text-slate-400">
                          {kf.time.toFixed(2)}s → {kf.value}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveKeyframe(selectedObject.id, prop, kf.id)}
                        aria-label={`Remove ${prop} keyframe at ${kf.time.toFixed(2)}s`}
                        className="p-1.5 lg:p-0.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )),
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
