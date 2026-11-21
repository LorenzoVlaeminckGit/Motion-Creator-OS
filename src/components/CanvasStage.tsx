import React, { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Frame,
  Redo2,
  Sparkles,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { renderCompositionFrame } from '../engine/canvasRenderer';
import { evaluateObjectState } from '../engine/motionEngine';
import type { MotionComposition } from '../types/motion';

interface CanvasStageProps {
  composition: MotionComposition;
  currentTime: number;
  selectedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSelectObject: (id: string | null) => void;
  onMoveObject: (id: string, x: number, y: number) => void;
  onChangeResolution: (width: number, height: number) => void;
  onRenameComposition: (name: string) => void;
  onQuickAddTitle: () => void;
  onOpenAi: () => void;
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
  onUndo,
  onRedo,
  onSelectObject,
  onMoveObject,
  onChangeResolution,
  onRenameComposition,
  onQuickAddTitle,
  onOpenAi,
  canvasRefExternal,
}) => {
  const [showGuides, setShowGuides] = useState(true);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const dragStateRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
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
        selectedObjectId: selectedId,
        showGuides,
        showSafeZones,
        interactiveOverlay: true,
      });
    };
    draw();
    document.fonts?.ready?.then(draw);
    return () => {
      cancelled = true;
    };
  }, [composition, currentTime, selectedId, showGuides, showSafeZones, canvasRefExternal]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e.clientX, e.clientY);
    // Hit test top-most active layer first
    let hitId: string | null = null;
    for (let i = composition.objects.length - 1; i >= 0; i--) {
      const obj = composition.objects[i];
      if (!obj.visible) continue;
      const st = evaluateObjectState(obj, currentTime, composition);
      if (!st.isActive) continue;
      const hw = (st.width * Math.abs(st.scaleX)) / 2 + 20;
      const hh = (st.height * Math.abs(st.scaleY)) / 2 + 20;
      if (Math.abs(pt.x - st.x) <= hw && Math.abs(pt.y - st.y) <= hh) {
        hitId = obj.id;
        if (!obj.locked) {
          dragStateRef.current = {
            id: obj.id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origX: obj.transform.x,
            origY: obj.transform.y,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        break;
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

    let nextX = Math.round(drag.origX + dx);
    let nextY = Math.round(drag.origY + dy);

    // Subtle snap to center
    if (Math.abs(nextX - composition.width / 2) < 16) {
      nextX = composition.width / 2;
    }
    if (Math.abs(nextY - composition.height / 2) < 16) {
      nextY = composition.height / 2;
    }

    onMoveObject(drag.id, nextX, nextY);
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  const aspectRatio = composition.width / composition.height;

  return (
    <section
      aria-label="Motion canvas viewport"
      className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0B0D11]"
    >
      {/* Top Canvas Toolbar */}
      <div className="h-11 shrink-0 border-b border-slate-800/80 bg-[#12151D] px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <label htmlFor="comp-name-input" className="sr-only">
            Composition name
          </label>
          <input
            id="comp-name-input"
            type="text"
            value={composition.name}
            onChange={(e) => onRenameComposition(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 border border-transparent hover:border-slate-700 focus:border-blue-500 rounded px-2 py-1 outline-none w-48 truncate"
          />

          <div className="h-4 w-px bg-slate-800" aria-hidden="true" />

          <div className="flex items-center gap-1">
            {ASPECT_PRESETS.map((preset) => {
              const active =
                composition.width === preset.w && composition.height === preset.h;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChangeResolution(preset.w, preset.h)}
                  className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            aria-pressed={showGuides}
            aria-label="Toggle center guides"
            className={`px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
              showGuides
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Guides</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSafeZones((v) => !v)}
            aria-pressed={showSafeZones}
            aria-label="Toggle title safe zones"
            className={`px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
              showSafeZones
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Frame className="w-3.5 h-3.5" />
            <span>Safe</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setStageScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
            aria-label="Zoom out viewport"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-slate-400 font-mono-tabular w-10 text-center">
            {Math.round(stageScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.min(1.4, +(s + 0.15).toFixed(2)))}
            aria-label="Zoom in viewport"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Area */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-6 overflow-hidden">
        <div
          className="relative shadow-2xl border border-slate-800/90 rounded-sm overflow-hidden bg-black flex items-center justify-center"
          style={{
            aspectRatio: `${composition.width} / ${composition.height}`,
            maxHeight: aspectRatio < 1 ? '100%' : 'calc(100% - 8px)',
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
            className="w-full h-full block cursor-crosshair touch-none"
          />

          {composition.objects.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6 text-center">
              <p className="text-base font-display font-semibold text-white mb-1">
                Empty Motion Stage
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-xs">
                Add vector shapes, procedural generators, or describe a full animated scene with AI Director.
              </p>
              <div className="flex items-center gap-2.5">
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
