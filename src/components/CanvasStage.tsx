import React, { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Frame,
  Magnet,
  Redo2,
  Sparkles,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { renderCompositionFrame } from '../engine/canvasRenderer';
import { evaluateObjectState } from '../engine/motionEngine';
import {
  computeSmartSnap,
  getDraggedVisualDimensions,
  type SmartSnapSettings,
  type SnapGuide,
} from '../engine/smartSnap';
import { findMotionPresetById } from '../data/motionPresets';
import type { MotionComposition } from '../types/motion';

interface CanvasStageProps {
  composition: MotionComposition;
  currentTime: number;
  selectedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  snapSettings: SmartSnapSettings;
  onToggleSmartSnap: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectObject: (id: string | null) => void;
  onMoveObject: (id: string, x: number, y: number) => void;
  onChangeResolution: (width: number, height: number) => void;
  onRenameComposition: (name: string) => void;
  onQuickAddTitle: () => void;
  onOpenAi: () => void;
  draggingPresetId?: string | null;
  onPresetDragEnd?: () => void;
  onApplyMotionPreset?: (objectId: string, presetId: string) => void;
  canvasRefExternal: React.RefObject<HTMLCanvasElement | null>;
}

const ASPECT_PRESETS = [
  { label: '16:9 HD', w: 1920, h: 1080 },
  { label: '9:16 Reel', w: 1080, h: 1920 },
  { label: '1:1 Square', w: 1080, h: 1080 },
  { label: '4:5 Feed', w: 1080, h: 1350 },
];

export const CanvasStage: React.FC<CanvasStageProps> = ({
  composition,
  currentTime,
  selectedId,
  canUndo,
  canRedo,
  snapSettings,
  onToggleSmartSnap,
  onUndo,
  onRedo,
  onSelectObject,
  onMoveObject,
  onChangeResolution,
  onRenameComposition,
  onQuickAddTitle,
  onOpenAi,
  draggingPresetId = null,
  onPresetDragEnd,
  onApplyMotionPreset,
  canvasRefExternal,
}) => {
  const [showGuides, setShowGuides] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [activeSnapGuides, setActiveSnapGuides] = useState<SnapGuide[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isPresetOverCanvas, setIsPresetOverCanvas] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const dragStateRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    visualOffsetX: number;
    visualOffsetY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRefExternal.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderCompositionFrame(ctx, composition, currentTime, {
        selectedObjectId: isPresetOverCanvas && dropTargetId ? dropTargetId : selectedId,
        showGuides,
        showSafeZones,
        interactiveOverlay: true,
        snapGuides: activeSnapGuides,
      });
    };
    draw();
    document.fonts?.ready?.then(draw);
    return () => {
      cancelled = true;
    };
  }, [
    composition,
    currentTime,
    selectedId,
    dropTargetId,
    isPresetOverCanvas,
    showGuides,
    showSafeZones,
    activeSnapGuides,
    canvasRefExternal,
  ]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRefExternal.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = composition.width / Math.max(1, rect.width);
    const scaleY = composition.height / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const hitTestObjectAtCanvasPoint = (pt: { x: number; y: number }) => {
    for (let i = composition.objects.length - 1; i >= 0; i--) {
      const obj = composition.objects[i];
      if (!obj.visible) continue;
      const st = evaluateObjectState(obj, currentTime, composition);
      if (!st.isActive) continue;
      const hw = (st.width * Math.abs(st.scaleX)) / 2 + 20;
      const hh = (st.height * Math.abs(st.scaleY)) / 2 + 20;
      if (Math.abs(pt.x - st.x) <= hw && Math.abs(pt.y - st.y) <= hh) {
        return { obj, st };
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e.clientX, e.clientY);
    const hit = hitTestObjectAtCanvasPoint(pt);
    let hitId: string | null = null;
    if (hit) {
      const { obj, st } = hit;
      hitId = obj.id;
      if (!obj.locked) {
        const dims = getDraggedVisualDimensions(obj, currentTime, composition);
        const hasXKeys = Boolean(obj.keyframes.x && obj.keyframes.x.length > 0);
        const hasYKeys = Boolean(obj.keyframes.y && obj.keyframes.y.length > 0);
        dragStateRef.current = {
          id: obj.id,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origX: obj.transform.x,
          origY: obj.transform.y,
          visualOffsetX: hasXKeys ? 0 : st.x - obj.transform.x,
          visualOffsetY: hasYKeys ? 0 : st.y - obj.transform.y,
          width: dims.width,
          height: dims.height,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    onSelectObject(hitId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    const canvas = canvasRefExternal.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = composition.width / Math.max(1, rect.width);
    const scaleY = composition.height / Math.max(1, rect.height);
    const dx = (e.clientX - drag.startClientX) * scaleX;
    const dy = (e.clientY - drag.startClientY) * scaleY;

    const rawTransformX = drag.origX + dx;
    const rawTransformY = drag.origY + dy;

    if (snapSettings.enabled && !e.altKey) {
      const snap = computeSmartSnap({
        draggedId: drag.id,
        rawX: rawTransformX + drag.visualOffsetX,
        rawY: rawTransformY + drag.visualOffsetY,
        draggedWidth: drag.width,
        draggedHeight: drag.height,
        composition,
        currentTime,
        threshold: Math.max(4, Math.round(snapSettings.threshold * Math.max(1, scaleX * 0.5))),
        enableCanvasCenter: snapSettings.canvasCenter,
        enableObjectCenter: snapSettings.objectCenter,
        enableObjectEdge: snapSettings.objectEdge,
      });
      setActiveSnapGuides(snap.guides);
      onMoveObject(
        drag.id,
        Math.round(snap.x - drag.visualOffsetX),
        Math.round(snap.y - drag.visualOffsetY),
      );
    } else {
      if (activeSnapGuides.length > 0) setActiveSnapGuides([]);
      onMoveObject(drag.id, Math.round(rawTransformX), Math.round(rawTransformY));
    }
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
    setActiveSnapGuides([]);
  };

  const handleStageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const hasPresetDrag =
      Boolean(draggingPresetId) ||
      e.dataTransfer.types.includes('application/x-kinetik-preset');
    if (!hasPresetDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const pt = toCanvasCoords(e.clientX, e.clientY);
    const hit = hitTestObjectAtCanvasPoint(pt);
    const resolvedTargetId = hit?.obj.id ?? selectedId;
    setIsPresetOverCanvas(true);
    setDropTargetId(resolvedTargetId);
  };

  const handleStageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsPresetOverCanvas(false);
      setDropTargetId(null);
    }
  };

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const presetId =
      e.dataTransfer.getData('application/x-kinetik-preset') ||
      e.dataTransfer.getData('text/plain') ||
      draggingPresetId;
    const pt = toCanvasCoords(e.clientX, e.clientY);
    const hit = hitTestObjectAtCanvasPoint(pt);
    const targetId = hit?.obj.id ?? selectedId;

    setIsPresetOverCanvas(false);
    setDropTargetId(null);

    if (presetId && targetId) {
      e.preventDefault();
      onApplyMotionPreset?.(targetId, presetId);
    }
    onPresetDragEnd?.();
  };

  const aspectRatio = composition.width / composition.height;
  const activeDraggedPreset = draggingPresetId
    ? findMotionPresetById(draggingPresetId)
    : undefined;
  const dropTargetObject = dropTargetId
    ? composition.objects.find((o) => o.id === dropTargetId) ?? null
    : null;

  return (
    <section
      aria-label="Motion canvas viewport"
      className="lg:flex-1 flex flex-col min-w-0 lg:min-h-0 bg-slate-200/80 dark:bg-[#0B0D11]"
    >
      {/* Top Canvas Toolbar (horizontally scrollable on narrow mobile) */}
      <div className="h-11 shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151D] px-2.5 sm:px-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-0 shrink-0 lg:flex-1">
          <label htmlFor="comp-name-input" className="sr-only">
            Composition name
          </label>
          <input
            id="comp-name-input"
            type="text"
            value={composition.name}
            onChange={(e) => onRenameComposition(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-200 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 rounded px-1.5 py-1 outline-none w-28 sm:w-32 xl:w-40 min-w-0 truncate shrink-0"
          />

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" aria-hidden="true" />

          <div className="flex items-center gap-0.5 shrink-0">
            {ASPECT_PRESETS.map((preset) => {
              const active =
                composition.width === preset.w && composition.height === preset.h;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChangeResolution(preset.w, preset.h)}
                  className={`px-2 py-1.5 lg:px-1.5 lg:py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="p-2 lg:p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="p-2 lg:p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none cursor-pointer shrink-0"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            aria-pressed={showGuides}
            aria-label="Toggle center guides"
            className={`px-2 py-1.5 lg:py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              showGuides
                ? 'bg-slate-200/80 text-blue-600 dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Guides</span>
          </button>
          <button
            type="button"
            onClick={onToggleSmartSnap}
            aria-pressed={snapSettings.enabled}
            aria-label="Toggle smart snap"
            title="Smart Snap alignment guides (configure in Inspector → Snap, or hold Alt while dragging to bypass)"
            className={`px-2 py-1.5 lg:py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              snapSettings.enabled
                ? 'bg-slate-200/80 text-cyan-700 dark:bg-slate-800 dark:text-cyan-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSafeZones((v) => !v)}
            aria-pressed={showSafeZones}
            aria-label="Toggle title safe zones"
            className={`px-2 py-1.5 lg:py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              showSafeZones
                ? 'bg-slate-200/80 text-blue-600 dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Frame className="w-3.5 h-3.5" />
            <span>Safe</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setStageScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
            aria-label="Zoom out viewport"
            className="p-2 lg:p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono-tabular w-10 text-center">
            {Math.round(stageScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.min(1.4, +(s + 0.15).toFixed(2)))}
            aria-label="Zoom in viewport"
            className="p-2 lg:p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Area */}
      <div className="relative flex-1 min-h-[200px] sm:min-h-[240px] lg:min-h-0 flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-hidden">
        <div
          onDragOver={handleStageDragOver}
          onDragLeave={handleStageDragLeave}
          onDrop={handleStageDrop}
          className={`relative shadow-2xl border rounded-sm overflow-hidden bg-black flex items-center justify-center transition-colors max-h-[30dvh] sm:max-h-[36dvh] lg:max-h-full ${
            isPresetOverCanvas
              ? 'border-cyan-400 ring-2 ring-cyan-400/40'
              : 'border-slate-300 dark:border-slate-800/90'
          }`}
          style={{
            aspectRatio: `${composition.width} / ${composition.height}`,
            maxWidth: '100%',
            height: aspectRatio < 1 ? `${Math.round(92 * stageScale)}%` : undefined,
            width: aspectRatio >= 1 ? `${Math.round(92 * stageScale)}%` : undefined,
          }}
        >
          <canvas
            ref={canvasRefExternal}
            data-testid="motion-canvas"
            width={composition.width}
            height={composition.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full block cursor-crosshair touch-none"
          />

          {isPresetOverCanvas && (
            <div
              data-testid="preset-drop-indicator"
              className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-slate-950/90 border border-cyan-400/60 text-xs font-medium text-cyan-200 shadow-lg whitespace-nowrap"
            >
              {dropTargetObject
                ? `Drop ${activeDraggedPreset?.name ?? 'Motion Preset'} onto "${dropTargetObject.name}"`
                : 'Select or hover over an object to apply Motion Preset'}
            </div>
          )}

          {composition.objects.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 text-center">
              <p className="text-sm sm:text-base font-display font-semibold text-white mb-1">
                Empty Motion Stage
              </p>
              <p className="text-xs text-slate-300 mb-3 sm:mb-4 max-w-xs">
                Add vector shapes, procedural generators, or describe a full animated scene with AI Director.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onQuickAddTitle}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Add Kinetic Title</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAi}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate with AI</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
