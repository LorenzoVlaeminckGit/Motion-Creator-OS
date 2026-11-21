import { useCallback, useEffect, useRef, useState } from 'react';
import { AiDirectorPanel } from './components/AiDirectorPanel';
import { CanvasStage } from './components/CanvasStage';
import { ExportStudioModal } from './components/ExportStudioModal';
import { HeaderBar, type WorkspaceView } from './components/HeaderBar';
import { LeftAssetDock } from './components/LeftAssetDock';
import { RightInspector } from './components/RightInspector';
import { TemplatesView } from './components/TemplatesView';
import { TimelineDock } from './components/TimelineDock';
import { MOTION_TEMPLATES } from './data/templates';
import {
  createDefaultObject,
  createId,
  removeKeyframe,
  upsertKeyframe,
} from './engine/motionEngine';
import type {
  AnimatableProperty,
  EasingType,
  MotionComposition,
  MotionObject,
  MotionObjectType,
} from './types/motion';

const STORAGE_KEY = 'kinetik_studio_active_comp_v1';

function loadInitialComposition(): MotionComposition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

export default function App() {
  const [composition, setComposition] = useState<MotionComposition>(loadInitialComposition);
  const [historyPast, setHistoryPast] = useState<MotionComposition[]>([]);
  const [historyFuture, setHistoryFuture] = useState<MotionComposition[]>([]);

  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number | null>(null);

  const selectedObject =
    composition.objects.find((o) => o.id === selectedId) ?? null;

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

  // Persist active composition locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(composition));
    } catch {
      // ignore quota errors
    }
  }, [composition]);

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
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      setHistoryFuture((future) => [composition, ...future]);
      setComposition(previous);
      return past.slice(0, -1);
    });
  }, [composition]);

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[0];
      setHistoryPast((past) => [...past, composition]);
      setComposition(next);
      return future.slice(1);
    });
  }, [composition]);

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

  // Keyboard shortcuts (Space to play/pause, Left/Right to step frame)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isEditing) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime((t) => Math.max(0, +(t - 1 / composition.fps).toFixed(3)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTime((t) =>
          Math.min(composition.duration, +(t + 1 / composition.fps).toFixed(3)),
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [composition.duration, composition.fps]);

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

  const handleDuplicateObject = (id: string) => {
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
  };

  const handleDeleteObject = (id: string) => {
    commitComposition((c) => {
      const remaining = c.objects.filter((o) => o.id !== id);
      if (selectedId === id) {
        setSelectedId(remaining[remaining.length - 1]?.id ?? null);
      }
      return { ...c, objects: remaining };
    });
  };

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

  const handleAddKeyframeAtCurrentTime = () => {
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
  };

  const handleApplyComposition = (nextComp: MotionComposition) => {
    commitComposition(() => nextComp);
    setSelectedId(nextComp.objects[nextComp.objects.length - 1]?.id ?? null);
    setCurrentTime(Math.min(1.2, nextComp.duration * 0.25));
    setIsPlaying(true);
  };

  return (
    <div
      data-playing={isPlaying ? 'true' : 'false'}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#0D0F13] text-[#EEF1F6]"
    >
      <HeaderBar
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenProjectMenu={() => {
          setExportInitialTab('project');
          setExportModalOpen(true);
        }}
        onOpenExport={() => {
          setExportInitialTab('video');
          setExportModalOpen(true);
        }}
      />

      {activeView === 'editor' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex min-h-0">
            <LeftAssetDock
              objects={composition.objects}
              selectedId={selectedId}
              onAddObject={handleAddObject}
              onSelectObject={setSelectedId}
              onToggleVisible={handleToggleVisible}
              onToggleLock={handleToggleLock}
              onMoveLayer={handleMoveLayer}
              onDuplicateObject={handleDuplicateObject}
              onDeleteObject={handleDeleteObject}
            />

            <CanvasStage
              composition={composition}
              currentTime={currentTime}
              selectedId={selectedId}
              canUndo={historyPast.length > 0}
              canRedo={historyFuture.length > 0}
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
              canvasRefExternal={canvasRef}
            />

            <RightInspector
              composition={composition}
              selectedObject={selectedObject}
              currentTime={currentTime}
              onUpdateObject={handleUpdateObject}
              onUpdateComposition={(updater) => commitComposition(updater, false)}
              onAddKeyframe={handleAddKeyframe}
              onRemoveKeyframe={handleRemoveKeyframe}
            />
          </div>

          <TimelineDock
            composition={composition}
            currentTime={currentTime}
            isPlaying={isPlaying}
            loop={loop}
            playbackSpeed={playbackSpeed}
            autoKeyframe={autoKeyframe}
            selectedId={selectedId}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onResetTime={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onStepFrame={(delta) => {
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
            }}
            onSeek={(t) => {
              setIsPlaying(false);
              setCurrentTime(t);
            }}
            onToggleLoop={() => setLoop((l) => !l)}
            onChangeSpeed={setPlaybackSpeed}
            onToggleAutoKeyframe={() => setAutoKeyframe((a) => !a)}
            onAddKeyframeAtCurrentTime={handleAddKeyframeAtCurrentTime}
            onSelectObject={setSelectedId}
            onRemoveKeyframe={handleRemoveKeyframe}
          />
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
    </div>
  );
}
