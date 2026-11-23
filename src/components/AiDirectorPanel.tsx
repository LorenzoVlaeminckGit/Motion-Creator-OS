import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Cpu,
  ImagePlus,
  LayoutGrid,
  Layers,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_AI_MODEL_ID,
  FREE_AI_MODELS,
  type AiModelAvailability,
  type AiModelFamily,
} from '../data/aiModels';
import {
  applyAutoComposePlan,
  applyStyleTransferResult,
  normalizeAiAssetBundle,
  normalizeAiScene,
} from '../engine/aiNormalizer';
import {
  sampleStyleReferenceFile,
  type SampledStyleReference,
} from '../utils/mediaSampler';
import type { MotionComposition, MotionObject } from '../types/motion';

type AiMode =
  | 'style-transfer'
  | 'auto-compose'
  | 'assets'
  | 'scene'
  | 'choreograph'
  | 'palette';

interface AiDirectorPanelProps {
  composition: MotionComposition;
  selectedObject: MotionObject | null;
  onApplyScene: (scene: MotionComposition) => void;
  onAddAiObjects: (objs: MotionObject[]) => void;
  onUpdateObject: (id: string, updater: (obj: MotionObject) => MotionObject) => void;
  onApplyPalette: (palette: {
    backgroundType: MotionComposition['background']['type'];
    bgColor1: string;
    bgColor2: string;
    bgColor3: string;
    primaryAccent: string;
    secondaryAccent: string;
    textColor: string;
    fontFamily: MotionObject['textProps']['fontFamily'];
  }) => void;
  onReturnToEditor: () => void;
}

const SCENE_PROMPTS = [
  'Fintech product launch intro with glowing orbital rings, bold +240% metric counter, and cobalt radial mesh',
  'Minimalist botanical fashion title sequence with organic floating blobs and editorial serif typography',
  'Cyber-clean telemetry broadcast HUD with emerald waveform bars, dashed progress arc, and cipher text',
  'High-energy SaaS keynote countdown with particle burst and kinetic typography',
];

const ASSET_KEYWORDS = [
  'Diagonal neon wipe transition beam, cipher scramble headline, and rotating compass SVG badge',
  'Editorial serif pull-quote with staggered fade-up reveal and warm floating organic blob',
  'Audio equalizer spectrum, dashed orbital progress ring, and burst particle accent',
  'Geometric hex shield emblem, +180% growth counter, and sleek lower-third reveal bar',
];

export const AiDirectorPanel: React.FC<AiDirectorPanelProps> = ({
  composition,
  selectedObject,
  onApplyScene,
  onAddAiObjects,
  onUpdateObject,
  onApplyPalette,
  onReturnToEditor,
}) => {
  const [mode, setMode] = useState<AiMode>('style-transfer');
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('Modern Kinetic');

  // Style transfer state
  const [styleRef, setStyleRef] = useState<SampledStyleReference | null>(null);
  const [samplingMedia, setSamplingMedia] = useState(false);
  const [styleIntensity, setStyleIntensity] = useState(0.85);
  const [adaptMotion, setAdaptMotion] = useState(true);
  const [styleDirective, setStyleDirective] = useState('');
  const styleFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-compose state
  const [layoutGoal, setLayoutGoal] = useState('Hero Centerpiece');
  const [pacing, setPacing] = useState('Balanced Studio');
  const [transitionStyle, setTransitionStyle] = useState('Staggered Wave');
  const [composeNotesInput, setComposeNotesInput] = useState('');

  // Intelligent asset generation state
  const [assetCategory, setAssetCategory] = useState('All Diverse Elements');
  const [assetAesthetic, setAssetAesthetic] = useState('Modern Kinetic');
  const [assetEnergy, setAssetEnergy] = useState('Dynamic');
  const [assetCount, setAssetCount] = useState(3);
  const [generatedAssets, setGeneratedAssets] = useState<MotionObject[]>([]);
  const [addedAssetIds, setAddedAssetIds] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Multi-provider free model selector state
  const [models, setModels] = useState<AiModelAvailability[]>(() =>
    FREE_AI_MODELS.map((m) => ({ ...m, configured: m.keyless })),
  );
  const [familyFilter, setFamilyFilter] = useState<'all' | AiModelFamily>('all');
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_AI_MODEL_ID);

  useEffect(() => {
    let active = true;
    fetch('/api/ai/models')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!active || !payload || !Array.isArray(payload.models)) return;
        setModels(payload.models);
      })
      .catch(() => {
        // retain built-in catalog fallback
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredModels = useMemo(() => {
    if (familyFilter === 'all') return models;
    return models.filter((m) => m.family === familyFilter);
  }, [models, familyFilter]);

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) ?? models[0],
    [models, selectedModelId],
  );

  const visionModels = useMemo(() => models.filter((m) => m.supportsVision), [models]);

  const handleFamilySelect = (nextFamily: 'all' | AiModelFamily) => {
    setFamilyFilter(nextFamily);
    setError(null);
    if (nextFamily !== 'all') {
      const candidates = models.filter((m) => m.family === nextFamily);
      if (candidates.length > 0 && !candidates.some((m) => m.id === selectedModelId)) {
        const preferred = candidates.find((m) => m.configured) ?? candidates[0];
        setSelectedModelId(preferred.id);
      }
    }
  };

  const handleStyleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSamplingMedia(true);
    try {
      const sampled = await sampleStyleReferenceFile(file);
      setStyleRef(sampled);
      setStatusNote(
        `Loaded ${sampled.kind} reference "${sampled.fileName}" (${sampled.frames.length} frame${
          sampled.frames.length > 1 ? 's' : ''
        } ready for style analysis).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process uploaded style file.');
    } finally {
      setSamplingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusNote(null);

    if (mode === 'style-transfer') {
      if (!styleRef || styleRef.frames.length === 0) {
        setError('Upload an image or video style reference first.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/ai/style-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: selectedModelId,
            mediaKind: styleRef.kind,
            frames: styleRef.frames.map((f) => ({
              mimeType: f.mimeType,
              data: f.base64,
            })),
            directive: styleDirective,
            adaptMotion,
            intensity: styleIntensity,
            layersSummary: composition.objects.map((o) => ({
              id: o.id,
              name: o.name,
              type: o.type,
              style: { fillMode: o.style.fillMode, fillColor: o.style.fillColor },
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Style transfer failed');
        const nextComp = applyStyleTransferResult(composition, data.styleTransfer ?? {}, {
          intensity: styleIntensity,
          adaptMotion,
        });
        onApplyScene(nextComp);
        const usedTag = data.modelUsed?.label ? ` (${data.modelUsed.label})` : '';
        setStatusNote(
          `${
            data.styleTransfer?.styleSummary ||
            `Applied style transfer from "${styleRef.fileName}" across ${nextComp.objects.length} layers.`
          }${usedTag}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Style transfer failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'auto-compose') {
      if (composition.objects.length === 0) {
        setError('Add at least one object on the stage before running Auto-Compose.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/ai/auto-compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: selectedModelId,
            width: composition.width,
            height: composition.height,
            duration: composition.duration,
            layoutGoal,
            pacing,
            transitionStyle,
            instructions: composeNotesInput,
            layers: composition.objects.map((o) => ({
              id: o.id,
              name: o.name,
              type: o.type,
              transform: o.transform,
              textContent: o.type === 'text' || o.type === 'counter' ? o.textProps.content : undefined,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Auto-compose failed');
        const nextComp = applyAutoComposePlan(composition, data.compositionPlan ?? {});
        onApplyScene(nextComp);
        const usedTag = data.modelUsed?.label ? ` (${data.modelUsed.label})` : '';
        setStatusNote(
          `${
            data.compositionPlan?.compositionNotes ||
            `Re-composed ${nextComp.objects.length} layers with "${layoutGoal}" arrangement.`
          }${usedTag}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auto-compose failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'assets') {
      if (!prompt.trim()) {
        setError('Enter descriptive keywords or a motion brief to generate assets.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/ai/generate-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: selectedModelId,
            keywords: prompt,
            category: assetCategory,
            aesthetic: assetAesthetic,
            energy: assetEnergy,
            count: assetCount,
            width: composition.width,
            height: composition.height,
            duration: composition.duration,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Asset generation failed');
        const normalized = normalizeAiAssetBundle(data.assets ?? [], composition);
        if (normalized.length === 0) {
          throw new Error('No motion assets were returned. Try refining your keywords.');
        }
        setGeneratedAssets(normalized);
        setAddedAssetIds({});
        const usedTag = data.modelUsed?.label ? ` (${data.modelUsed.label})` : '';
        setStatusNote(
          `${
            data.designNotes ||
            `Generated ${normalized.length} diverse motion graphic asset${normalized.length > 1 ? 's' : ''}. Add them below.`
          }${usedTag}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Asset generation failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!prompt.trim()) {
      setError('Enter a creative prompt to run AI generation.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'scene') {
        const res = await fetch('/api/ai/generate-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: selectedModelId,
            prompt,
            stylePreset,
            width: composition.width,
            height: composition.height,
            duration: composition.duration,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Scene generation failed');
        const nextComp = normalizeAiScene(
          data.scene,
          composition.width,
          composition.height,
        );
        onApplyScene(nextComp);
        const usedTag = data.modelUsed?.label ? ` via ${data.modelUsed.label}` : '';
        setStatusNote(`Generated "${nextComp.name}" with ${nextComp.objects.length} animated layers${usedTag}.`);
        onReturnToEditor();
      } else if (mode === 'choreograph') {
        const target = selectedObject ?? composition.objects[0];
        if (!target) {
          throw new Error('Select or add at least one layer before choreographing motion.');
        }
        const res = await fetch('/api/ai/choreograph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: selectedModelId,
            prompt,
            duration: composition.duration,
            objectSummary: {
              name: target.name,
              type: target.type,
              transform: target.transform,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Choreography failed');
        const [hydrated] = normalizeAiAssetBundle(
          [
            {
              ...target,
              behavior: data.choreography?.behavior ?? target.behavior,
              keyframes: data.choreography?.keyframes ?? [],
            },
          ],
          composition,
        );
        if (hydrated) {
          onUpdateObject(target.id, (prev) => ({
            ...prev,
            behavior: hydrated.behavior,
            keyframes:
              Object.keys(hydrated.keyframes).length > 0
                ? hydrated.keyframes
                : prev.keyframes,
          }));
        }
        setStatusNote(
          data.choreography?.rationale || `Updated keyframes & physics on "${target.name}".`,
        );
        onReturnToEditor();
      } else if (mode === 'palette') {
        const res = await fetch('/api/ai/style-palette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId: selectedModelId, prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Palette styling failed');
        onApplyPalette(data.palette);
        setStatusNote(`Applied "${data.palette?.paletteName ?? 'Custom'}" art direction.`);
        onReturnToEditor();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected AI request error.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingleGenerated = (asset: MotionObject) => {
    onAddAiObjects([asset]);
    setAddedAssetIds((prev) => ({ ...prev, [asset.id]: true }));
  };

  const handleAddAllGenerated = () => {
    const remaining = generatedAssets.filter((a) => !addedAssetIds[a.id]);
    if (remaining.length === 0) return;
    onAddAiObjects(remaining);
    const nextMap: Record<string, boolean> = { ...addedAssetIds };
    remaining.forEach((a) => {
      nextMap[a.id] = true;
    });
    setAddedAssetIds(nextMap);
    onReturnToEditor();
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-[#0D0F13] px-4 py-5 sm:px-8 sm:py-7">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              AI Motion Director
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Transfer visual & motion styles from image or video references, auto-compose stage arrangements, and forge diverse kinetic assets.
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="min-h-[40px] sm:min-h-0 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-[#151922] dark:hover:bg-[#1C212D] text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to Stage
          </button>
        </div>

        {/* Free AI Engine & Model Selector */}
        <section
          aria-label="Free AI model engine selector"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141821] p-4 space-y-3 shadow-sm dark:shadow-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
              <label
                htmlFor="ai-model-select"
                className="text-xs font-semibold text-slate-900 dark:text-white"
              >
                Free AI Model Engine
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter models by family">
              {(
                [
                  { id: 'all', label: `All Free (${models.length})` },
                  { id: 'deepseek', label: 'DeepSeek' },
                  { id: 'glm', label: 'Z.ai GLM' },
                  { id: 'gemini', label: 'Gemini' },
                  { id: 'more', label: 'Qwen · Nemotron · Llama' },
                ] as const
              ).map((tab) => {
                const active = familyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFamilySelect(tab.id)}
                    className={`min-h-[34px] sm:min-h-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-[#0D1017] dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6">
              <select
                id="ai-model-select"
                value={selectedModelId}
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
              >
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.providerLabel} ({m.tierLabel} · {m.supportsVision ? 'Vision + Motion' : 'Text/JSON'})
                    {!m.configured && m.envVar ? ` [Needs ${m.envVar}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedModel && (
              <div className="md:col-span-6 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white">{selectedModel.label}</span>
                <span className="text-slate-400 dark:text-slate-500"> · </span>
                <span>{selectedModel.providerLabel}</span>
                <span className="text-slate-400 dark:text-slate-500"> · </span>
                <span className={selectedModel.configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}>
                  {selectedModel.keyless
                    ? 'Keyless Free Ready'
                    : selectedModel.configured
                      ? 'Ready'
                      : `Requires ${selectedModel.envVar} Secret`}
                </span>
                <span className="text-slate-400 dark:text-slate-500"> · </span>
                <span className="text-slate-500 dark:text-slate-400">{selectedModel.contextLabel}</span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 truncate">{selectedModel.bestFor}</p>
              </div>
            )}
          </div>

          {selectedModel &&
            (mode === 'style-transfer' && !selectedModel.supportsVision ? (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-800 dark:text-blue-200">
                <span>
                  {!selectedModel.configured && selectedModel.envVar
                    ? `${selectedModel.label} is text-only and requires ${selectedModel.envVar}. Style Transfer requires a vision-capable model:`
                    : `${selectedModel.label} is text-only. Style Transfer inspects uploaded images & video frames and requires a vision-capable model:`}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {visionModels.slice(0, 3).map((vm) => (
                    <button
                      key={vm.id}
                      type="button"
                      onClick={() => setSelectedModelId(vm.id)}
                      className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 dark:bg-[#0D1017] dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100 font-medium cursor-pointer whitespace-nowrap"
                    >
                      Switch to {vm.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : !selectedModel.configured && selectedModel.envVar ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-200">
                <span>
                  Server secret{' '}
                  <code className="font-mono-tabular text-amber-900 dark:text-amber-100">{selectedModel.envVar}</code> is
                  not set yet. Add it in Settings &gt; Secrets to run {selectedModel.label}, or
                  switch to a configured model right now.
                </span>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedModelId(DEFAULT_AI_MODEL_ID)}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 dark:bg-[#0D1017] dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100 font-medium cursor-pointer whitespace-nowrap"
                  >
                    Use Gemini 4 Hydrogen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModelId('gemini:gemini-3.8-flash')}
                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 dark:bg-[#0D1017] dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-100 font-medium cursor-pointer whitespace-nowrap"
                  >
                    Use Gemini 3.8 Flash
                  </button>
                </div>
              </div>
            ) : null)}
        </section>

        {/* 6-Mode Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {(
            [
              {
                id: 'style-transfer',
                label: 'Style Transfer',
                desc: 'Image or video look-dev',
                icon: <ImagePlus className="w-4 h-4 text-pink-400" />,
              },
              {
                id: 'auto-compose',
                label: 'Auto-Compose',
                desc: 'Layout, timing & choreography',
                icon: <LayoutGrid className="w-4 h-4 text-emerald-400" />,
              },
              {
                id: 'assets',
                label: 'Asset Generator',
                desc: 'Shapes, text FX & transitions',
                icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
              },
              {
                id: 'scene',
                label: 'Scene Generator',
                desc: 'Prompt to full composition',
                icon: <Layers className="w-4 h-4 text-blue-400" />,
              },
              {
                id: 'choreograph',
                label: 'Choreographer',
                desc: 'Keyframes for active layer',
                icon: <Zap className="w-4 h-4 text-amber-400" />,
              },
              {
                id: 'palette',
                label: 'Art Director',
                desc: 'Text-to-palette & fonts',
                icon: <Palette className="w-4 h-4 text-indigo-400" />,
              },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  setError(null);
                  setStatusNote(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#141821] dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{item.label}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{item.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Active Mode Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141821] p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-none"
        >
          {mode === 'style-transfer' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Reference Image or Video Upload
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Upload any frame, poster, moodboard image, or motion clip (MP4/WebM) to transfer its palette, glow, grain, typography, and motion energy onto your current composition.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => styleFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 min-h-[40px] sm:min-h-0 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-[#1B202C] dark:hover:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white cursor-pointer shrink-0"
                >
                  <ImagePlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{styleRef ? 'Replace Reference' : 'Upload Image or Video'}</span>
                </button>
                <input
                  ref={styleFileInputRef}
                  type="file"
                  aria-label="Upload style reference image or video"
                  accept="image/*,video/*"
                  onChange={handleStyleFileChange}
                  className="hidden"
                />
              </div>

              {samplingMedia && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1017] p-4 text-xs text-slate-700 dark:text-slate-300">
                  Sampling reference frames...
                </div>
              )}

              {styleRef ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1017] p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                      {styleRef.fileName}{' '}
                      <span className="text-slate-500">
                        · {styleRef.kind === 'video' ? `Video (${styleRef.frames.length} sampled frames)` : 'Image'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStyleRef(null)}
                      aria-label="Clear style reference"
                      className="p-1 text-slate-600 dark:text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {styleRef.frames.map((frame) => (
                      <div key={frame.label} className="space-y-1">
                        <img
                          src={frame.previewUrl}
                          alt={frame.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-24 object-cover rounded border border-slate-800 bg-black"
                        />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono-tabular">
                          {frame.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => styleFileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500/70 bg-slate-50 dark:bg-[#0D1017] py-7 px-4 text-center transition-colors cursor-pointer"
                >
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Click to select a PNG, JPG, WebP, MP4, or WebM style reference
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Video references automatically sample start, mid, and end frames for temporal look & motion analysis.
                  </p>
                </button>
              )}

              {/* Artistic Customization Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                    <label htmlFor="style-intensity">Style Transfer Strength</label>
                    <span className="font-mono-tabular text-blue-400">
                      {Math.round(styleIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    id="style-intensity"
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={styleIntensity}
                    onChange={(e) => setStyleIntensity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1017] px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                  <span>Adapt motion pacing &amp; entrance FX from reference</span>
                  <input
                    type="checkbox"
                    checked={adaptMotion}
                    onChange={(e) => setAdaptMotion(e.target.checked)}
                  />
                </label>
              </div>

              <div>
                <label htmlFor="style-directive" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Artistic Customization Note (Optional)
                </label>
                <input
                  id="style-directive"
                  type="text"
                  value={styleDirective}
                  onChange={(e) => setStyleDirective(e.target.value)}
                  placeholder="e.g. Preserve crisp white headline, emphasize film grain and warm rim glow..."
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'auto-compose' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1017] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 dark:text-slate-300">
                  Analyzing{' '}
                  <strong className="text-slate-900 dark:text-white font-mono-tabular">
                    {composition.objects.length}
                  </strong>{' '}
                  active stage assets ({composition.width}×{composition.height} ·{' '}
                  {composition.duration}s)
                </span>
                <span className="text-slate-600 dark:text-slate-400 truncate max-w-md">
                  {composition.objects.map((o) => o.name).join(' · ') || 'No layers on stage'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ac-layout" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Layout Arrangement
                  </label>
                  <select
                    id="ac-layout"
                    value={layoutGoal}
                    onChange={(e) => setLayoutGoal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Hero Centerpiece">Hero Centerpiece</option>
                    <option value="Split Editorial">Split Editorial (Left/Right)</option>
                    <option value="Radial Orbit">Radial Orbit Hierarchy</option>
                    <option value="Stacked Telemetry">Stacked Telemetry HUD</option>
                    <option value="Dynamic Diagonal">Dynamic Diagonal Flow</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ac-pacing" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Animation Pacing
                  </label>
                  <select
                    id="ac-pacing"
                    value={pacing}
                    onChange={(e) => setPacing(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Calm Filmic">Calm Filmic</option>
                    <option value="Balanced Studio">Balanced Studio</option>
                    <option value="High-Energy Beat">High-Energy Beat</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ac-trans" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Timing & Transitions
                  </label>
                  <select
                    id="ac-trans"
                    value={transitionStyle}
                    onChange={(e) => setTransitionStyle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Staggered Wave">Staggered Wave</option>
                    <option value="Simultaneous Pop">Simultaneous Impact</option>
                    <option value="Sequential Story">Sequential Beat Reveal</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ac-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Composition Preferences (Optional)
                </label>
                <input
                  id="ac-notes"
                  type="text"
                  value={composeNotesInput}
                  onChange={(e) => setComposeNotesInput(e.target.value)}
                  placeholder="e.g. Keep headline prominent at top third, orbit shapes cleanly behind text, stagger entries by 0.2s..."
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            </div>
          )}

          {mode === 'assets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="ag-category" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Element Focus
                  </label>
                  <select
                    id="ag-category"
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="All Diverse Elements">All Diverse Elements</option>
                    <option value="Animated Shapes & SVG">Animated Shapes &amp; SVG</option>
                    <option value="Kinetic Text Effects">Kinetic Text Effects</option>
                    <option value="Transition Styles & Wipes">Transition Styles &amp; Wipes</option>
                    <option value="Procedural & Data Rigs">Procedural &amp; Data Rigs</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ag-aesthetic" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Style Preset
                  </label>
                  <select
                    id="ag-aesthetic"
                    value={assetAesthetic}
                    onChange={(e) => setAssetAesthetic(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Modern Kinetic">Modern Kinetic</option>
                    <option value="Editorial Luxury">Editorial Luxury</option>
                    <option value="Tech Telemetry HUD">Tech Telemetry HUD</option>
                    <option value="Organic Fluid">Organic Fluid</option>
                    <option value="Geometric Minimal">Geometric Minimal</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ag-energy" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Motion Energy
                  </label>
                  <select
                    id="ag-energy"
                    value={assetEnergy}
                    onChange={(e) => setAssetEnergy(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Subtle">Subtle &amp; Calm</option>
                    <option value="Dynamic">Dynamic</option>
                    <option value="High-Impact">High-Impact</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ag-count" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Assets to Generate
                  </label>
                  <select
                    id="ag-count"
                    value={assetCount}
                    onChange={(e) => setAssetCount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value={1}>1 Hero Asset</option>
                    <option value={3}>3 Coordinated Assets</option>
                    <option value={4}>4 Full Pack Assets</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ai-prompt-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Descriptive Keywords or Element Brief
                </label>
                <textarea
                  id="ai-prompt-input"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the shapes, text effects, transition wipes, or procedural motion objects to generate..."
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 focus:border-blue-500 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Keyword Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {ASSET_KEYWORDS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setPrompt(sample)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-md border bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-[#181D27] dark:hover:border-slate-600 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(mode === 'scene' || mode === 'choreograph' || mode === 'palette') && (
            <>
              {mode === 'scene' && (
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="ai-style-preset" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Style Direction
                  </label>
                  <select
                    id="ai-style-preset"
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="bg-slate-50 dark:bg-[#1B202C] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="Modern Kinetic">Modern Kinetic</option>
                    <option value="Fintech Broadcast">Fintech Broadcast</option>
                    <option value="Editorial Luxury">Editorial Luxury</option>
                    <option value="Geometric Minimal">Geometric Minimal</option>
                    <option value="High-Energy Social">High-Energy Social</option>
                  </select>
                </div>
              )}

              {mode === 'choreograph' && (
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1A1F2B] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                  Target Layer:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedObject?.name ?? composition.objects[0]?.name ?? 'None selected'}
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="ai-prompt-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Creative Prompt
                </label>
                <textarea
                  id="ai-prompt-input"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'scene'
                      ? 'Describe the motion graphic video scene, objects, text, colors, and pacing...'
                      : mode === 'choreograph'
                        ? 'Describe how the selected layer should move (e.g. "Slide in from the left with elastic bounce, float gently, and fade out at 5s")...'
                        : 'Describe a brand mood or visual direction (e.g. "Nordic clean-tech slate and glacier cyan with editorial serif headings")...'
                  }
                  className="w-full rounded-lg bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-slate-800 focus:border-blue-500 p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
                />
              </div>

              {mode === 'scene' && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Quick Prompts
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SCENE_PROMPTS.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setPrompt(sample)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-md border bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-[#181D27] dark:hover:border-slate-600 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {statusNote && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              {statusNote}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || samplingMedia}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[42px] sm:min-h-0 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>
                {loading
                  ? 'Running AI Engine...'
                  : mode === 'style-transfer'
                    ? 'Apply Style Transfer'
                    : mode === 'auto-compose'
                      ? 'Auto-Compose Scene'
                      : mode === 'assets'
                        ? 'Generate Motion Assets'
                        : mode === 'scene'
                          ? 'Generate Scene'
                          : mode === 'choreograph'
                            ? 'Apply Choreography'
                            : 'Apply Art Direction'}
              </span>
            </button>
          </div>
        </form>

        {/* Generated Asset Staging Tray */}
        {mode === 'assets' && generatedAssets.length > 0 && (
          <section
            aria-label="Generated motion assets"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141821] p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Generated Motion Elements
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Add individual elements or import the full coordinated set onto your stage.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAllGenerated}
                className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add All to Stage</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generatedAssets.map((asset) => {
                const isAdded = Boolean(addedAssetIds[asset.id]);
                const kfCount = Object.values(asset.keyframes).reduce(
                  (acc, list) => acc + (list?.length ?? 0),
                  0,
                );
                return (
                  <div
                    key={asset.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1017] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0 border border-slate-900/15 dark:border-white/20"
                          style={{
                            backgroundColor:
                              asset.style.fillMode === 'none'
                                ? asset.style.strokeColor
                                : asset.style.fillColor,
                          }}
                        />
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {asset.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {asset.type} · {asset.behavior.entrancePreset} · {kfCount} keyframes
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddSingleGenerated(asset)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-xs font-medium dark:text-white shrink-0 cursor-pointer"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Layer</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
