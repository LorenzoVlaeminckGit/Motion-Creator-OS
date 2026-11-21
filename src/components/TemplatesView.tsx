import React, { useEffect, useRef } from 'react';
import { MOTION_TEMPLATES, type MotionTemplateMeta } from '../data/templates';
import { renderCompositionFrame } from '../engine/canvasRenderer';
import type { MotionComposition } from '../types/motion';

interface TemplatesViewProps {
  onLoadTemplate: (comp: MotionComposition) => void;
  onReturnToEditor: () => void;
}

const TemplatePreviewCanvas: React.FC<{ template: MotionTemplateMeta }> = ({ template }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const comp = template.build();
      renderCompositionFrame(ctx, comp, Math.min(1.6, comp.duration * 0.35), {
        interactiveOverlay: false,
      });
    };
    draw();
    document.fonts?.ready?.then(draw);
    return () => {
      cancelled = true;
    };
  }, [template]);

  const comp = template.build();
  return (
    <div className="w-full h-48 bg-[#080A0F] rounded-lg border border-slate-800/80 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={comp.width}
        height={comp.height}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onLoadTemplate,
  onReturnToEditor,
}) => {
  return (
    <main className="flex-1 overflow-y-auto bg-[#0D0F13] px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Motion Templates
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Start from a production-ready kinetic composition and customize every layer, keyframe, and shader setting.
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-[#151922] hover:bg-[#1C212D] text-xs font-medium text-slate-200 cursor-pointer"
          >
            Back to Stage
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MOTION_TEMPLATES.map((tpl) => (
            <article
              key={tpl.id}
              className="rounded-xl border border-slate-800 bg-[#141821] p-4 flex flex-col gap-3.5"
            >
              <TemplatePreviewCanvas template={tpl} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{tpl.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tpl.aspectLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{tpl.durationLabel}</span>
                </div>
                <h2 className="font-display text-base font-semibold text-white">
                  {tpl.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {tpl.description}
                </p>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onLoadTemplate(tpl.build());
                    onReturnToEditor();
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                >
                  Use Template
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};
