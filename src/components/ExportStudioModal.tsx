import React, { useRef, useState } from 'react';
import {
  Camera,
  Code2,
  Download,
  FileJson,
  Film,
  Upload,
  X,
} from 'lucide-react';
import { renderCompositionFrame } from '../engine/canvasRenderer';
import type { MotionComposition } from '../types/motion';

interface ExportStudioModalProps {
  isOpen: boolean;
  initialTab?: 'video' | 'project';
  composition: MotionComposition;
  currentTime: number;
  onClose: () => void;
  onImportComposition: (comp: MotionComposition) => void;
}

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({
  isOpen,
  initialTab = 'video',
  composition,
  currentTime,
  onClose,
  onImportComposition,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'project'>(initialTab);
  const [bitrateMbps, setBitrateMbps] = useState(14);
  const [exportScale, setExportScale] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportPng = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(composition.width * exportScale);
    offscreen.height = Math.round(composition.height * exportScale);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.scale(exportScale, exportScale);
    renderCompositionFrame(ctx, composition, currentTime, {
      interactiveOverlay: false,
    });
    const url = offscreen.toDataURL('image/png');
    triggerDownload(url, `${composition.name.toLowerCase().replace(/\s+/g, '-')}-frame.png`);
  };

  const handleExportSvg = () => {
    const lines = composition.objects
      .filter((o) => o.visible)
      .map((o) => {
        if (o.type === 'text' || o.type === 'counter') {
          return `<text x="${o.transform.x}" y="${o.transform.y}" fill="${o.style.fillColor}" font-size="${o.textProps.fontSize}" text-anchor="middle">${o.textProps.content}</text>`;
        }
        if (o.type === 'circle') {
          return `<ellipse cx="${o.transform.x}" cy="${o.transform.y}" rx="${o.transform.width / 2}" ry="${o.transform.height / 2}" fill="${o.style.fillColor}" />`;
        }
        return `<rect x="${o.transform.x - o.transform.width / 2}" y="${o.transform.y - o.transform.height / 2}" width="${o.transform.width}" height="${o.transform.height}" rx="${o.style.cornerRadius}" fill="${o.style.fillColor}" />`;
      })
      .join('\n  ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${composition.width} ${composition.height}">
  <rect width="100%" height="100%" fill="${composition.background.color1}" />
  ${lines}
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${composition.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportVideo = async () => {
    setError(null);
    setVideoUrl(null);
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is unavailable in this browser environment.');
      return;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(composition.width * exportScale);
    offscreen.height = Math.round(composition.height * exportScale);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      setError('Could not initialize offscreen rendering context.');
      return;
    }

    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

    setRendering(true);
    setProgress(0);

    try {
      const fps = Math.min(60, Math.max(24, composition.fps));
      const stream = offscreen.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: bitrateMbps * 1_000_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      const donePromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
        };
      });

      recorder.start(100);

      const startMs = performance.now();
      const durationMs = composition.duration * 1000;

      await new Promise<void>((resolve) => {
        const tick = () => {
          const elapsed = performance.now() - startMs;
          const tSec = Math.min(composition.duration, elapsed / 1000);

          ctx.save();
          ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0);
          renderCompositionFrame(ctx, composition, tSec, {
            interactiveOverlay: false,
          });
          ctx.restore();

          setProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));

          if (elapsed < durationMs) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(tick);
      });

      recorder.stop();
      const blob = await donePromise;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video encoding failed.');
    } finally {
      setRendering(false);
    }
  };

  const handleExportProjectJson = () => {
    const json = JSON.stringify(composition, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${composition.name.toLowerCase().replace(/\s+/g, '-')}.kinetik.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportProjectJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as MotionComposition;
      if (!parsed || !Array.isArray(parsed.objects) || typeof parsed.width !== 'number') {
        throw new Error('Invalid Kinetik project JSON file.');
      }
      onImportComposition(parsed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import project JSON.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131720] shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="export-modal-title" className="font-display text-base font-bold text-slate-900 dark:text-white">
            Export & Project Studio
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`pb-2.5 text-xs font-semibold border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'video'
                ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Video & Frame Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('project')}
            className={`pb-2.5 text-xs font-semibold border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'project'
                ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Project JSON Backup
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeTab === 'video' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-scale" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Resolution Scale
                  </label>
                  <select
                    id="exp-scale"
                    value={exportScale}
                    onChange={(e) => setExportScale(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#1B202C] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value={0.5}>
                      0.5x ({Math.round(composition.width * 0.5)}×{Math.round(composition.height * 0.5)})
                    </option>
                    <option value={1}>
                      1.0x Native ({composition.width}×{composition.height})
                    </option>
                  </select>
                </div>
                <div>
                  <label htmlFor="exp-bitrate" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Video Bitrate
                  </label>
                  <select
                    id="exp-bitrate"
                    value={bitrateMbps}
                    onChange={(e) => setBitrateMbps(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#1B202C] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value={8}>8 Mbps (Web)</option>
                    <option value={14}>14 Mbps (High)</option>
                    <option value={24}>24 Mbps (Master)</option>
                  </select>
                </div>
              </div>

              {rendering && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono-tabular">
                    <span>Rendering WebM frames...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {videoUrl && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Render complete ({composition.duration}s WebM)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        triggerDownload(
                          videoUrl,
                          `${composition.name.toLowerCase().replace(/\s+/g, '-')}.webm`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .webm</span>
                    </button>
                  </div>
                  <video
                    src={videoUrl}
                    controls
                    loop
                    className="w-full rounded border border-slate-300 dark:border-slate-800 max-h-48 bg-black"
                  />
                </div>
              )}

              {error && (
                <div role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-[#1B202C] dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>PNG Frame</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-[#1B202C] dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>SVG Snapshot</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportVideo}
                  disabled={rendering}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>{rendering ? 'Encoding Video...' : 'Render WebM Video'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Save your entire motion composition—including objects, procedural generators, keyframes, and camera settings—as a portable JSON file.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExportProjectJson}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <FileJson className="w-4 h-4" />
                  <span>Download .kinetik.json</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-[#1B202C] dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Project JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportProjectJson}
                  className="hidden"
                />
              </div>
              {error && (
                <div role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
