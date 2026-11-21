import React from 'react';
import {
  Diamond,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type {
  AnimatableProperty,
  MotionComposition,
  MotionObject,
} from '../types/motion';

interface TimelineDockProps {
  composition: MotionComposition;
  currentTime: number;
  isPlaying: boolean;
  loop: boolean;
  playbackSpeed: number;
  autoKeyframe: boolean;
  selectedId: string | null;
  onTogglePlay: () => void;
  onResetTime: () => void;
  onStepFrame: (delta: number) => void;
  onSeek: (time: number) => void;
  onToggleLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleAutoKeyframe: () => void;
  onAddKeyframeAtCurrentTime: () => void;
  onSelectObject: (id: string) => void;
  onRemoveKeyframe: (
    objectId: string,
    prop: AnimatableProperty,
    kfId: string,
  ) => void;
}

function formatTimecode(sec: number): string {
  const mins = Math.floor(sec / 60);
  const rem = sec - mins * 60;
  return `${String(mins).padStart(2, '0')}:${rem.toFixed(2).padStart(5, '0')}`;
}

export const TimelineDock: React.FC<TimelineDockProps> = ({
  composition,
  currentTime,
  isPlaying,
  loop,
  playbackSpeed,
  autoKeyframe,
  selectedId,
  onTogglePlay,
  onResetTime,
  onStepFrame,
  onSeek,
  onToggleLoop,
  onChangeSpeed,
  onToggleAutoKeyframe,
  onAddKeyframeAtCurrentTime,
  onSelectObject,
  onRemoveKeyframe,
}) => {
  const { duration, fps, objects } = composition;
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const currentFrame = Math.min(totalFrames, Math.round(currentTime * fps));
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const collectKeyframes = (obj: MotionObject) => {
    const items: {
      id: string;
      prop: AnimatableProperty;
      time: number;
    }[] = [];
    (Object.keys(obj.keyframes) as AnimatableProperty[]).forEach((prop) => {
      const list = obj.keyframes[prop] ?? [];
      list.forEach((kf) => items.push({ id: kf.id, prop, time: kf.time }));
    });
    return items;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
    onSeek(+(pct * duration).toFixed(2));
  };

  return (
    <section
      aria-label="Animation timeline"
      className="h-[228px] shrink-0 border-t border-slate-800/80 bg-[#11141B] flex flex-col"
    >
      {/* Transport Controls */}
      <div className="h-11 shrink-0 px-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onResetTime}
            aria-label="Jump to start"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            aria-label="Previous frame"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Play composition'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(1)}
            aria-label="Next frame"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1.5" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleLoop}
            aria-pressed={loop}
            aria-label="Toggle loop playback"
            className={`p-1.5 rounded cursor-pointer ${
              loop ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <select
            aria-label="Playback speed"
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="bg-[#181C26] border border-slate-800 rounded px-2 py-1 text-[11px] font-mono-tabular text-slate-300 outline-none"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>

        {/* Center Timecode */}
        <div className="flex items-center gap-4 text-xs font-mono-tabular">
          <span data-testid="timecode-readout" className="text-slate-100 font-medium">
            {formatTimecode(currentTime)} <span className="text-slate-500">/ {formatTimecode(duration)}</span>
          </span>
          <span className="text-slate-400">
            F {String(currentFrame).padStart(3, '0')} / {totalFrames}
          </span>
          <span className="text-slate-500">{fps} fps</span>
        </div>

        {/* Keyframe Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoKeyframe}
            aria-pressed={autoKeyframe}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
              autoKeyframe
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-[#181C26] text-slate-400 hover:text-slate-200'
            }`}
          >
            Auto-Key {autoKeyframe ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={onAddKeyframeAtCurrentTime}
            disabled={!selectedId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-medium text-slate-100 cursor-pointer"
          >
            <Diamond className="w-3 h-3 text-blue-400" />
            <span>Add Keyframe</span>
          </button>
        </div>
      </div>

      {/* Scrubbable Ruler */}
      <div className="h-7 shrink-0 border-b border-slate-800/80 flex items-center">
        <div className="w-48 shrink-0 px-3 text-[11px] font-medium text-slate-500 border-r border-slate-800/80 h-full flex items-center">
          Track Layer
        </div>
        <div className="flex-1 relative h-full px-3 flex items-center">
          <input
            type="range"
            aria-label="Timeline scrubber"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Layer Keyframe Tracks */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {objects.map((obj) => {
          const isSelected = obj.id === selectedId;
          const leftPct = duration > 0 ? (obj.startTime / duration) * 100 : 0;
          const widthPct =
            duration > 0 ? Math.max(2, ((obj.endTime - obj.startTime) / duration) * 100) : 100;
          const kfs = collectKeyframes(obj);

          return (
            <div
              key={obj.id}
              className={`h-9 flex items-center ${
                isSelected ? 'bg-blue-500/8' : 'hover:bg-slate-900/50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectObject(obj.id)}
                className="w-48 shrink-0 px-3 h-full border-r border-slate-800/80 text-left flex items-center justify-between gap-2 cursor-pointer"
              >
                <span
                  className={`text-xs truncate ${
                    isSelected ? 'text-white font-medium' : 'text-slate-400'
                  }`}
                >
                  {obj.name}
                </span>
                <span className="text-[10px] font-mono-tabular text-slate-500">
                  {kfs.length}k
                </span>
              </button>

              <div
                onClick={handleTrackClick}
                className="flex-1 relative h-full mx-3 cursor-pointer"
              >
                {/* Playhead line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-500/80 pointer-events-none z-10"
                  style={{ left: `${playheadPct}%` }}
                />

                {/* Active span bar */}
                <div
                  className={`absolute top-2 bottom-2 rounded-sm border ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-slate-800/70 border-slate-700/70'
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                />

                {/* Keyframe diamonds */}
                {kfs.map((kf) => {
                  const kfPct = duration > 0 ? (kf.time / duration) * 100 : 0;
                  return (
                    <button
                      key={kf.id}
                      type="button"
                      title={`${kf.prop} @ ${kf.time.toFixed(2)}s (click to seek, double-click to remove)`}
                      aria-label={`Keyframe ${kf.prop} at ${kf.time.toFixed(2)}s`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectObject(obj.id);
                        onSeek(kf.time);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRemoveKeyframe(obj.id, kf.prop, kf.id);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-amber-400 hover:bg-white border border-slate-950 z-20 cursor-pointer"
                      style={{ left: `${kfPct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
