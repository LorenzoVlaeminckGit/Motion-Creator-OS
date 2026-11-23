import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Layers, Sliders, Sparkles } from 'lucide-react';
import { AiDirectorPanel } from './components/AiDirectorPanel';
import { CanvasStage } from './components/CanvasStage';
import { ExportStudioModal } from './components/ExportStudioModal';
import { HeaderBar, type StudioTheme, type WorkspaceView } from './components/HeaderBar';
import { LeftAssetDock, type LeftDockTab } from './components/LeftAssetDock';
import { RightInspector } from './components/RightInspector';
import { ShortcutsCheatSheetModal } from './components/ShortcutsCheatSheetModal';
import { TemplatesView } from './components/TemplatesView';
import { TimelineDock } from './components/TimelineDock';
import { applyMotionPresetToObject } from './data/motionPresets';
import { MOTION_TEMPLATES } from './data/templates';
import {
  createDefaultObject,
  createId,
  removeKeyframe,
  upsertKeyframe,
} from './engine/motionEngine';
import {
  AUTOSAVE_INTERVAL_MS,
  COMP_STORAGE_KEY,
  loadSavedTimestamp,
  saveCompositionSnapshot,
} from './engine/quickSave';
import {
  DEFAULT_SMART_SNAP_SETTINGS,
  type SmartSnapSettings,
} from './engine/smartSnap';
import type {
  AnimatableProperty,
  EasingType,
  MotionComposition,
  MotionObject,
  MotionObjectType,
} from './types/motion';

const THEME_STORAGE_KEY = 'kinetik_studio_theme_v1';
const SNAP_SETTINGS_STORAGE_KEY = 'kinetik_studio_snap_settings_v1';

type MobileDockPanel = 'timeline' | 'objects' | 'presets' | 'inspector';

function loadInitialTheme(): StudioTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

function loadInitialComposition(): MotionComposition {
  try {
    const raw = localStorage.getItem(COMP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MotionComposition;
      if (parsed && Array.isArray(parsed.objects) && typeof parsed.width === 'number') {
        return parsed;
      }
    }
  } catch {
    // fallback to default template
  }
  return MOTION_TEMPLATES[0].build();
}

function loadInitialSnapSettings(): SmartSnapSettings {
  try {
    const raw = localStorage.getItem(SNAP_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SmartSnapSettings>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SMART_SNAP_SETTINGS.enabled,
        canvasCenter:
          typeof parsed.canvasCenter === 'boolean'
            ? parsed.canvasCenter
            : DEFAULT_SMART_SNAP_SETTINGS.canvasCenter,
        objectCenter:
          typeof parsed.objectCenter === 'boolean'
            ? parsed.objectCenter
            : DEFAULT_SMART_SNAP_SETTINGS.objectCenter,
        objectEdge:
          typeof parsed.objectEdge === 'boolean'
            ? parsed.objectEdge
            : DEFAULT_SMART_SNAP_SETTINGS.objectEdge,
        threshold:
          typeof parsed.threshold === 'number' && Number.isFinite(parsed.threshold)
            ? Math.max(4, Math.min(48, Math.round(parsed.threshold)))
            : DEFAULT_SMART_SNAP_SETTINGS.threshold,
      };
    }
  } catch {
    // fallback to defaults
  }
  return { ...DEFAULT_SMART_SNAP_SETTINGS };
}

export default function App() {
  const [theme, setTheme] = useState<StudioTheme>(loadInitialTheme);
  const [composition, setComposition] = useState<MotionComposition>(loadInitialComposition);
  const [historyPast, setHistoryPast] = useState<MotionComposition[]>([]);
  const [historyFuture, setHistoryFuture] = useState<MotionComposition[]>([]);

  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
  const [mobileDockPanel, setMobileDockPanel] = useState<MobileDockPanel>('timeline');
  const [leftDockTab, setLeftDockTab] = useState<LeftDockTab>('objects');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => composition.objects[composition.objects.length - 1]?.id ?? null,
  );

  const [currentTime, setCurrentTime] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [autoKeyframe, setAutoKeyframe] = useState<boolean>(false);

  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportInitialTab, setExportInitialTab] = useState<'video' | 'project'>('video');
  const [cheatSheetOpen, setCheatSheetOpen] = useState<boolean>(false);
  const [draggingPresetId, setDraggingPresetId] = useState<string | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => loadSavedTimestamp());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [snapSettings, setSnapSettings] = useState<SmartSnapSettings>(loadInitialSnapSettings);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number | null>(null);
  const compositionRef = useRef<MotionComposition>(composition);
  const lastSavedJsonRef = useRef<string>(JSON.stringify(composition));
  const lastSavedAtRef = useRef<number | null>(lastSavedAt);

  const selectedObject =
    composition.objects.find((o) => o.id === selectedId) ?? null;

  const performQuickSave = useCallback(() => {
    const now = Date.now();
    const res = saveCompositionSnapshot(compositionRef.current, now);
    if (res.saved && res.savedAt !== null) {
      lastSavedJsonRef.current = res.serialized;
      lastSavedAtRef.current = res.savedAt;
      setLastSavedAt(res.savedAt);
      setNowMs(res.savedAt);
      setHasUnsavedChanges(false);
    }
  }, []);

  // Sync theme class on <html> and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Persist Smart Snap settings
  useEffect(() => {
    try {
      localStorage.setItem(SNAP_SETTINGS_STORAGE_KEY, JSON.stringify(snapSettings));
    } catch {
      // ignore storage errors
    }
  }, [snapSettings]);

  // Preload Google Fonts for HTML5 Canvas text rendering
  useEffect(() => {
    if (!document.fonts?.load) return;
    void Promise.all([
      document.fonts.load('700 48px "Plus Jakarta Sans"'),
      document.fonts.load('800 48px "Plus Jakarta Sans"'),
      document.fonts.load('700 48px "Playfair Display"'),
      document.fonts.load('700 48px "JetBrains Mono"'),
    ]);
  }, []);

  // Track unsaved composition changes relative to the last saved snapshot
  useEffect(() => {
    compositionRef.current = composition;
    const serialized = JSON.stringify(composition);
    setHasUnsavedChanges(serialized !== lastSavedJsonRef.current);
  }, [composition]);

  // Initialize initial snapshot if none saved yet, run periodic autosave, and keep relative time fresh
  useEffect(() => {
    if (lastSavedAtRef.current === null) {
      performQuickSave();
    }

    const autosaveTimer = window.setInterval(() => {
      const currentSerialized = JSON.stringify(compositionRef.current);
      if (currentSerialized !== lastSavedJsonRef.current || lastSavedAtRef.current === null) {
        performQuickSave();
      }
    }, AUTOSAVE_INTERVAL_MS);

    const clockTimer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 5000);

    const flushUnsaved = () => {
      const currentSerialized = JSON.stringify(compositionRef.current);
      if (currentSerialized !== lastSavedJsonRef.current) {
        performQuickSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushUnsaved();
    };

    window.addEventListener('beforeunload', flushUnsaved);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(autosaveTimer);
      window.clearInterval(clockTimer);
      window.removeEventListener('beforeunload', flushUnsaved);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performQuickSave]);

  const commitComposition = useCallback(
    (updater: (prev: MotionComposition) => MotionComposition, recordHistory = true) => {
      setComposition((prev) => {
        const next = updater(prev);
        if (recordHistory) {
          setHistoryPast((past) => [...past.slice(-24), prev]);
          setHistoryFuture([]);
        }
        return next;
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [composition, ...future]);
    setComposition(previous);
  }, [composition, historyPast]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, composition]);
    setComposition(next);
  }, [composition, historyFuture]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastFrameMsRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastFrameMsRef.current === null) {
        lastFrameMsRef.current = now;
      }
      const dt = ((now - lastFrameMsRef.current) / 1000) * playbackSpeed;
      lastFrameMsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= composition.duration) {
          if (loop) {
            return next % composition.duration;
          }
          setIsPlaying(false);
          return composition.duration;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, loop, playbackSpeed, composition.duration]);

  const handleAddObject = (type: MotionObjectType) => {
    const obj = createDefaultObject(type, composition);
    commitComposition((c) => ({
      ...c,
      objects: [...c.objects, obj],
    }));
    setSelectedId(obj.id);
  };

  const handleUpdateObject = (
    id: string,
    updater: (obj: MotionObject) => MotionObject,
  ) => {
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) => {
        if (o.id !== id) return o;
        let updated = updater(o);
        if (autoKeyframe) {
          const props: AnimatableProperty[] = [
            'x',
            'y',
            'scaleX',
            'scaleY',
            'rotation',
            'opacity',
            'width',
            'height',
          ];
          for (const p of props) {
            if (updated.transform[p] !== o.transform[p]) {
              updated = upsertKeyframe(
                updated,
                p,
                currentTime,
                updated.transform[p],
                'easeInOutCubic',
              );
            }
          }
        }
        return updated;
      }),
    }), false);
  };

  const handleMoveObject = (id: string, x: number, y: number) => {
    commitComposition(
      (c) => ({
        ...c,
        objects: c.objects.map((o) => {
          if (o.id !== id) return o;
          let next: MotionObject = {
            ...o,
            transform: { ...o.transform, x, y },
          };
          if (autoKeyframe) {
            next = upsertKeyframe(next, 'x', currentTime, x, 'easeInOutCubic');
            next = upsertKeyframe(next, 'y', currentTime, y, 'easeInOutCubic');
          }
          return next;
        }),
      }),
      false,
    );
  };

  const handleToggleVisible = (id: string) => {
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) =>
        o.id === id ? { ...o, visible: !o.visible } : o,
      ),
    }));
  };

  const handleToggleLock = (id: string) => {
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) =>
        o.id === id ? { ...o, locked: !o.locked } : o,
      ),
    }));
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    commitComposition((c) => {
      const idx = c.objects.findIndex((o) => o.id === id);
      if (idx < 0) return c;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= c.objects.length) return c;
      const next = [...c.objects];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...c, objects: next };
    });
  };

  const handleDuplicateObject = useCallback(
    (id: string) => {
      const src = composition.objects.find((o) => o.id === id);
      if (!src) return;
      const copy: MotionObject = {
        ...JSON.parse(JSON.stringify(src)),
        id: createId('layer'),
        name: `${src.name} Copy`,
        transform: {
          ...src.transform,
          x: src.transform.x + 36,
          y: src.transform.y + 36,
        },
      };
      commitComposition((c) => ({
        ...c,
        objects: [...c.objects, copy],
      }));
      setSelectedId(copy.id);
    },
    [commitComposition, composition.objects],
  );

  const handleDeleteObject = useCallback(
    (id: string) => {
      commitComposition((c) => {
        const remaining = c.objects.filter((o) => o.id !== id);
        if (selectedId === id) {
          setSelectedId(remaining[remaining.length - 1]?.id ?? null);
        }
        return { ...c, objects: remaining };
      });
    },
    [commitComposition, selectedId],
  );

  const handleAddKeyframe = (
    id: string,
    prop: AnimatableProperty,
    value: number,
    easing: EasingType,
  ) => {
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) =>
        o.id === id ? upsertKeyframe(o, prop, currentTime, value, easing) : o,
      ),
    }));
  };

  const handleRemoveKeyframe = (
    id: string,
    prop: AnimatableProperty,
    kfId: string,
  ) => {
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) =>
        o.id === id ? removeKeyframe(o, prop, kfId) : o,
      ),
    }));
  };

  const handleAddKeyframeAtCurrentTime = useCallback(() => {
    if (!selectedObject) return;
    commitComposition((c) => ({
      ...c,
      objects: c.objects.map((o) => {
        if (o.id !== selectedObject.id) return o;
        let next = upsertKeyframe(o, 'x', currentTime, o.transform.x, 'easeOutExpo');
        next = upsertKeyframe(next, 'y', currentTime, o.transform.y, 'easeOutExpo');
        next = upsertKeyframe(next, 'rotation', currentTime, o.transform.rotation, 'easeOutExpo');
        next = upsertKeyframe(next, 'opacity', currentTime, o.transform.opacity, 'easeOutExpo');
        return next;
      }),
    }));
  }, [commitComposition, currentTime, selectedObject]);

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Space, frame step, duplicate/delete, ?)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cheatSheetOpen) {
          e.preventDefault();
          setCheatSheetOpen(false);
          return;
        }
        if (exportModalOpen) {
          e.preventDefault();
          setExportModalOpen(false);
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        Boolean(target?.isContentEditable);
      if (isEditing) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === '?' && !mod && !e.altKey) {
        e.preventDefault();
        setCheatSheetOpen((open) => !open);
        return;
      }

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (mod && key === 's') {
        e.preventDefault();
        performQuickSave();
        return;
      }

      if (cheatSheetOpen || exportModalOpen) return;

      if (mod && key === 'd') {
        if (selectedId) {
          e.preventDefault();
          handleDuplicateObject(selectedId);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteObject(selectedId);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const frames = e.shiftKey ? 10 : 1;
        setIsPlaying(false);
        setCurrentTime((t) =>
          Math.max(0, +(t - frames / composition.fps).toFixed(3)),
        );
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const frames = e.shiftKey ? 10 : 1;
        setIsPlaying(false);
        setCurrentTime((t) =>
          Math.min(composition.duration, +(t + frames / composition.fps).toFixed(3)),
        );
      } else if (e.code === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime(0);
      } else if (!mod && !e.altKey && e.code === 'KeyL') {
        e.preventDefault();
        setLoop((l) => !l);
      } else if (!mod && !e.altKey && e.code === 'KeyK') {
        e.preventDefault();
        handleAddKeyframeAtCurrentTime();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    cheatSheetOpen,
    composition.duration,
    composition.fps,
    exportModalOpen,
    handleAddKeyframeAtCurrentTime,
    handleDeleteObject,
    handleDuplicateObject,
    handleRedo,
    handleUndo,
    performQuickSave,
    selectedId,
  ]);

  const handleApplyMotionPreset = useCallback(
    (objectId: string, presetId: string) => {
      const target = composition.objects.find((o) => o.id === objectId);
      if (!target) return;
      commitComposition(
        (c) => ({
          ...c,
          objects: c.objects.map((o) =>
            o.id === objectId
              ? applyMotionPresetToObject(o, presetId, c.duration)
              : o,
          ),
        }),
        true,
      );
      setSelectedId(objectId);
      setCurrentTime(target.startTime);
      setIsPlaying(true);
    },
    [commitComposition, composition.objects],
  );

  const handleApplyComposition = (nextComp: MotionComposition) => {
    commitComposition(() => nextComp);
    setSelectedId(nextComp.objects[nextComp.objects.length - 1]?.id ?? null);
    setCurrentTime(Math.min(1.2, nextComp.duration * 0.25));
    setIsPlaying(true);
  };

  const handleSelectMobileDock = (panel: MobileDockPanel) => {
    setMobileDockPanel(panel);
    if (panel === 'objects') setLeftDockTab('objects');
    if (panel === 'presets') setLeftDockTab('presets');
  };

  const timelineProps = {
    composition,
    currentTime,
    isPlaying,
    loop,
    playbackSpeed,
    autoKeyframe,
    selectedId,
    onTogglePlay: () => setIsPlaying((p) => !p),
    onResetTime: () => {
      setIsPlaying(false);
      setCurrentTime(0);
    },
    onStepFrame: (delta: number) => {
      setIsPlaying(false);
      setCurrentTime((t) =>
        Math.max(
          0,
          Math.min(
            composition.duration,
            +(t + delta / composition.fps).toFixed(3),
          ),
        ),
      );
    },
    onSeek: (t: number) => {
      setIsPlaying(false);
      setCurrentTime(t);
    },
    onToggleLoop: () => setLoop((l) => !l),
    onChangeSpeed: setPlaybackSpeed,
    onToggleAutoKeyframe: () => setAutoKeyframe((a) => !a),
    onAddKeyframeAtCurrentTime: handleAddKeyframeAtCurrentTime,
    onSelectObject: setSelectedId,
    onRemoveKeyframe: handleRemoveKeyframe,
  };

  return (
    <div
      data-playing={isPlaying ? 'true' : 'false'}
      data-theme={theme}
      className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-[#0D0F13] text-slate-900 dark:text-[#EEF1F6]"
    >
      <HeaderBar
        activeView={activeView}
        theme={theme}
        lastSavedAt={lastSavedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        nowMs={nowMs}
        onSelectView={setActiveView}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onQuickSave={performQuickSave}
        onOpenProjectMenu={() => {
          setExportInitialTab('project');
          setExportModalOpen(true);
        }}
        onOpenExport={() => {
          setExportInitialTab('video');
          setExportModalOpen(true);
        }}
        onOpenCheatSheet={() => setCheatSheetOpen(true)}
      />

      {activeView === 'editor' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Left Objects & Presets Dock: sidebar on desktop, active panel on mobile */}
            <div
              className={`${
                mobileDockPanel === 'objects' || mobileDockPanel === 'presets'
                  ? 'flex-1 min-h-0 order-2'
                  : 'hidden'
              } lg:block lg:order-1 lg:flex-none lg:min-h-0`}
            >
              <LeftAssetDock
                objects={composition.objects}
                selectedId={selectedId}
                draggingPresetId={draggingPresetId}
                controlledTab={leftDockTab}
                onDockTabChange={(tab) => {
                  setLeftDockTab(tab);
                  if (mobileDockPanel === 'objects' || mobileDockPanel === 'presets') {
                    setMobileDockPanel(tab);
                  }
                }}
                onAddObject={handleAddObject}
                onSelectObject={setSelectedId}
                onToggleVisible={handleToggleVisible}
                onToggleLock={handleToggleLock}
                onMoveLayer={handleMoveLayer}
                onDuplicateObject={handleDuplicateObject}
                onDeleteObject={handleDeleteObject}
                onPresetDragStart={setDraggingPresetId}
                onPresetDragEnd={() => setDraggingPresetId(null)}
                onApplyMotionPreset={handleApplyMotionPreset}
              />
            </div>

            {/* Canvas Stage: always visible at top on mobile, center column on desktop */}
            <div className="order-1 lg:order-2 lg:flex-1 flex flex-col min-w-0 lg:min-h-0 shrink-0 lg:shrink">
              <CanvasStage
                composition={composition}
                currentTime={currentTime}
                selectedId={selectedId}
                canUndo={historyPast.length > 0}
                canRedo={historyFuture.length > 0}
                snapSettings={snapSettings}
                onToggleSmartSnap={() =>
                  setSnapSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSelectObject={setSelectedId}
                onMoveObject={handleMoveObject}
                onChangeResolution={(width, height) =>
                  commitComposition((c) => ({ ...c, width, height }))
                }
                onRenameComposition={(name) =>
                  commitComposition((c) => ({ ...c, name }), false)
                }
                onQuickAddTitle={() => handleAddObject('text')}
                onOpenAi={() => setActiveView('ai')}
                draggingPresetId={draggingPresetId}
                onPresetDragEnd={() => setDraggingPresetId(null)}
                onApplyMotionPreset={handleApplyMotionPreset}
                canvasRefExternal={canvasRef}
              />
            </div>

            {/* Right Properties Inspector: sidebar on desktop, active panel on mobile */}
            <div
              className={`${
                mobileDockPanel === 'inspector' ? 'flex-1 min-h-0 order-2' : 'hidden'
              } lg:block lg:order-3 lg:flex-none lg:min-h-0`}
            >
              <RightInspector
                composition={composition}
                selectedObject={selectedObject}
                currentTime={currentTime}
                snapSettings={snapSettings}
                onChangeSnapSettings={setSnapSettings}
                onUpdateObject={handleUpdateObject}
                onUpdateComposition={(updater) => commitComposition(updater, false)}
                onAddKeyframe={handleAddKeyframe}
                onRemoveKeyframe={handleRemoveKeyframe}
              />
            </div>

            {/* Mobile Timeline Panel */}
            {mobileDockPanel === 'timeline' && (
              <div className="flex-1 min-h-0 order-2 lg:hidden flex flex-col border-t border-slate-200 dark:border-slate-800/80">
                <TimelineDock {...timelineProps} />
              </div>
            )}
          </div>

          {/* Desktop Timeline Dock */}
          <div className="hidden lg:block shrink-0">
            <TimelineDock {...timelineProps} />
          </div>

          {/* Mobile Thumb-Zone Bottom Tab Bar */}
          <nav
            aria-label="Mobile studio panels"
            className="lg:hidden h-14 shrink-0 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#11141B]/95 backdrop-blur-md grid grid-cols-4 px-1 pb-[env(safe-area-inset-bottom)]"
          >
            {(
              [
                { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
                { id: 'objects', label: 'Objects', icon: <Layers className="w-4 h-4" /> },
                { id: 'presets', label: 'Presets', icon: <Sparkles className="w-4 h-4" /> },
                { id: 'inspector', label: 'Inspect', icon: <Sliders className="w-4 h-4" /> },
              ] as { id: MobileDockPanel; label: string; icon: React.ReactNode }[]
            ).map((tab) => {
              const active = mobileDockPanel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectMobileDock(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-md text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : activeView === 'ai' ? (
        <AiDirectorPanel
          composition={composition}
          selectedObject={selectedObject}
          onApplyScene={handleApplyComposition}
          onAddAiObjects={(objs) => {
            if (objs.length === 0) return;
            commitComposition((c) => ({
              ...c,
              objects: [...c.objects, ...objs],
            }));
            setSelectedId(objs[objs.length - 1].id);
          }}
          onUpdateObject={(id, updater) => commitComposition((c) => ({
            ...c,
            objects: c.objects.map((o) => (o.id === id ? updater(o) : o)),
          }))}
          onApplyPalette={(palette) => {
            commitComposition((c) => ({
              ...c,
              background: {
                ...c.background,
                type: palette.backgroundType || c.background.type,
                color1: palette.bgColor1 || c.background.color1,
                color2: palette.bgColor2 || c.background.color2,
                color3: palette.bgColor3 || c.background.color3,
              },
              objects: c.objects.map((o) => ({
                ...o,
                style: {
                  ...o.style,
                  fillColor:
                    o.type === 'text' || o.type === 'counter'
                      ? palette.textColor || o.style.fillColor
                      : palette.primaryAccent || o.style.fillColor,
                  fillColor2: palette.secondaryAccent || o.style.fillColor2,
                  strokeColor: palette.primaryAccent || o.style.strokeColor,
                },
                textProps: {
                  ...o.textProps,
                  fontFamily: palette.fontFamily || o.textProps.fontFamily,
                },
              })),
            }));
          }}
          onReturnToEditor={() => setActiveView('editor')}
        />
      ) : (
        <TemplatesView
          onLoadTemplate={handleApplyComposition}
          onReturnToEditor={() => setActiveView('editor')}
        />
      )}

      <ExportStudioModal
        isOpen={exportModalOpen}
        initialTab={exportInitialTab}
        composition={composition}
        currentTime={currentTime}
        onClose={() => setExportModalOpen(false)}
        onImportComposition={handleApplyComposition}
      />

      <ShortcutsCheatSheetModal
        isOpen={cheatSheetOpen}
        onClose={() => setCheatSheetOpen(false)}
      />
    </div>
  );
}
