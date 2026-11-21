import { applyEasing, clamp, lerp } from './easing';
import type {
  AnimatableProperty,
  EasingType,
  EvaluatedObjectState,
  Keyframe,
  MotionComposition,
  MotionObject,
  MotionObjectType,
} from '../types/motion';

export function createId(prefix = 'obj'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function interpolateKeyframes(
  keyframes: Keyframe[] | undefined,
  time: number,
  fallback: number,
): number {
  if (!keyframes || keyframes.length === 0) {
    return fallback;
  }
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) {
    return sorted[0].value;
  }
  if (time >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (time >= k1.time && time <= k2.time) {
      const span = k2.time - k1.time;
      if (span <= 0.00001) return k2.value;
      const rawT = (time - k1.time) / span;
      const easedT = applyEasing(rawT, k2.easing);
      return lerp(k1.value, k2.value, easedT);
    }
  }

  return fallback;
}

export function evaluateObjectState(
  obj: MotionObject,
  time: number,
  composition: Pick<MotionComposition, 'duration' | 'bpm'>,
): EvaluatedObjectState {
  const activeDuration = Math.max(0.05, obj.endTime - obj.startTime);
  const localTime = time - obj.startTime;
  const isActive = obj.visible && time >= obj.startTime && time <= obj.endTime;
  const localProgress = clamp(localTime / activeDuration, 0, 1);

  let x = interpolateKeyframes(obj.keyframes.x, time, obj.transform.x);
  let y = interpolateKeyframes(obj.keyframes.y, time, obj.transform.y);
  let width = interpolateKeyframes(obj.keyframes.width, time, obj.transform.width);
  let height = interpolateKeyframes(obj.keyframes.height, time, obj.transform.height);
  let scaleX = interpolateKeyframes(obj.keyframes.scaleX, time, obj.transform.scaleX);
  let scaleY = interpolateKeyframes(obj.keyframes.scaleY, time, obj.transform.scaleY);
  let rotation = interpolateKeyframes(obj.keyframes.rotation, time, obj.transform.rotation);
  let opacity = interpolateKeyframes(obj.keyframes.opacity, time, obj.transform.opacity);
  let blur = 0;

  // Entrance preset evaluation
  const entDur = Math.max(0.05, obj.behavior.entranceDuration);
  if (obj.behavior.entrancePreset !== 'none' && localTime < entDur) {
    const t = clamp(localTime / entDur, 0, 1);
    const e = applyEasing(t, 'easeOutExpo');
    const eBack = applyEasing(t, 'easeOutBack');

    switch (obj.behavior.entrancePreset) {
      case 'fade':
        opacity *= e;
        break;
      case 'scale-pop':
        opacity *= clamp(t * 2, 0, 1);
        scaleX *= Math.max(0.001, eBack);
        scaleY *= Math.max(0.001, eBack);
        break;
      case 'slide-up':
        opacity *= e;
        y += (1 - e) * 90;
        break;
      case 'slide-left':
        opacity *= e;
        x += (1 - e) * 140;
        break;
      case 'rotate-in':
        opacity *= e;
        rotation += (1 - eBack) * -90;
        scaleX *= 0.65 + 0.35 * eBack;
        scaleY *= 0.65 + 0.35 * eBack;
        break;
      case 'blur-in':
        opacity *= e;
        blur += (1 - e) * 14;
        scaleX *= 1.12 - 0.12 * e;
        scaleY *= 1.12 - 0.12 * e;
        break;
    }
  }

  // Exit preset evaluation
  const exitDur = Math.max(0.05, obj.behavior.exitDuration);
  const timeToEnd = obj.endTime - time;
  if (obj.behavior.exitPreset !== 'none' && timeToEnd < exitDur && timeToEnd >= 0) {
    const t = clamp(1 - timeToEnd / exitDur, 0, 1);
    const e = applyEasing(t, 'easeInOutCubic');

    switch (obj.behavior.exitPreset) {
      case 'fade':
        opacity *= 1 - e;
        break;
      case 'scale-down':
        opacity *= 1 - e;
        scaleX *= 1 - 0.6 * e;
        scaleY *= 1 - 0.6 * e;
        break;
      case 'slide-down':
        opacity *= 1 - e;
        y += e * 80;
        break;
    }
  }

  // Continuous kinetic modifiers
  const tOsc = Math.max(0, localTime);
  if (obj.behavior.oscillateX.amp !== 0) {
    x +=
      Math.sin(tOsc * obj.behavior.oscillateX.freq * Math.PI * 2 + obj.behavior.oscillateX.phase) *
      obj.behavior.oscillateX.amp;
  }
  if (obj.behavior.oscillateY.amp !== 0) {
    y +=
      Math.sin(tOsc * obj.behavior.oscillateY.freq * Math.PI * 2 + obj.behavior.oscillateY.phase) *
      obj.behavior.oscillateY.amp;
  }
  if (obj.behavior.spinSpeed !== 0) {
    rotation += tOsc * obj.behavior.spinSpeed;
  }
  if (obj.behavior.pulseAmp !== 0) {
    const beatFreq = obj.behavior.pulseFreq > 0 ? obj.behavior.pulseFreq : composition.bpm / 60;
    const pulse = 1 + Math.sin(tOsc * beatFreq * Math.PI * 2) * obj.behavior.pulseAmp;
    scaleX *= pulse;
    scaleY *= pulse;
  }
  if (obj.behavior.orbitRadius !== 0 && obj.behavior.orbitSpeed !== 0) {
    const angle = (tOsc * obj.behavior.orbitSpeed * Math.PI) / 180;
    x += Math.cos(angle) * obj.behavior.orbitRadius;
    y += Math.sin(angle) * obj.behavior.orbitRadius;
  }

  return {
    x,
    y,
    width: Math.max(2, width),
    height: Math.max(2, height),
    scaleX,
    scaleY,
    rotation,
    opacity: clamp(opacity, 0, 1),
    blur,
    isActive,
    localTime,
    localProgress,
  };
}

export function upsertKeyframe(
  obj: MotionObject,
  prop: AnimatableProperty,
  time: number,
  value: number,
  easing: EasingType = 'easeInOutCubic',
): MotionObject {
  const roundedTime = Math.round(time * 100) / 100;
  const existing = obj.keyframes[prop] ?? [];
  const filtered = existing.filter((kf) => Math.abs(kf.time - roundedTime) > 0.02);
  const nextKf: Keyframe = {
    id: createId('kf'),
    time: roundedTime,
    value,
    easing,
  };
  const nextList = [...filtered, nextKf].sort((a, b) => a.time - b.time);

  return {
    ...obj,
    keyframes: {
      ...obj.keyframes,
      [prop]: nextList,
    },
  };
}

export function removeKeyframe(
  obj: MotionObject,
  prop: AnimatableProperty,
  keyframeId: string,
): MotionObject {
  const existing = obj.keyframes[prop] ?? [];
  const nextList = existing.filter((kf) => kf.id !== keyframeId);
  const nextKeyframes = { ...obj.keyframes };
  if (nextList.length === 0) {
    delete nextKeyframes[prop];
  } else {
    nextKeyframes[prop] = nextList;
  }
  return {
    ...obj,
    keyframes: nextKeyframes,
  };
}

// Deterministic pseudo-random helper [0, 1) for particle systems & grain
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const DEFAULT_NAMES: Record<MotionObjectType, string> = {
  rect: 'Rounded Frame',
  circle: 'Kinetic Sphere',
  polygon: 'Hex Polygon',
  star: 'Burst Star',
  ring: 'Progress Arc',
  line: 'Laser Beam',
  path: 'Vector Path',
  text: 'Kinetic Title',
  counter: 'Metric Counter',
  particles: 'Particle Emitter',
  waveform: 'Audio Spectrum',
  orbit: 'Orbital System',
  blob: 'Morphing Blob',
  grid: 'Dot Matrix',
};

export interface MotionObjectOverrides {
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  startTime?: number;
  endTime?: number;
  transform?: Partial<MotionObject['transform']>;
  style?: Partial<MotionObject['style']>;
  shapeProps?: Partial<MotionObject['shapeProps']>;
  textProps?: Partial<MotionObject['textProps']>;
  proceduralProps?: Partial<MotionObject['proceduralProps']>;
  behavior?: Partial<
    Omit<MotionObject['behavior'], 'oscillateX' | 'oscillateY'> & {
      oscillateX?: Partial<MotionObject['behavior']['oscillateX']>;
      oscillateY?: Partial<MotionObject['behavior']['oscillateY']>;
    }
  >;
  keyframes?: MotionObject['keyframes'];
}

export function createDefaultObject(
  type: MotionObjectType,
  composition: Pick<MotionComposition, 'width' | 'height' | 'duration'>,
  partial?: MotionObjectOverrides,
): MotionObject {
  const cx = composition.width / 2;
  const cy = composition.height / 2;

  const isWide = type === 'text' || type === 'counter' || type === 'waveform' || type === 'line';
  const baseWidth =
    type === 'waveform'
      ? 540
      : type === 'text'
        ? 720
        : type === 'counter'
          ? 420
          : type === 'line'
            ? 460
            : type === 'grid'
              ? 420
              : 240;
  const baseHeight =
    type === 'line' ? 8 : type === 'waveform' ? 180 : isWide ? 140 : 240;

  const base: MotionObject = {
    id: createId('layer'),
    name: DEFAULT_NAMES[type] ?? 'Motion Object',
    type,
    visible: true,
    locked: false,
    startTime: 0,
    endTime: composition.duration,
    transform: {
      x: cx,
      y: cy,
      width: baseWidth,
      height: baseHeight,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      fillMode:
        type === 'ring' || type === 'line' || type === 'orbit'
          ? 'none'
          : type === 'text' || type === 'counter'
            ? 'solid'
            : 'linear-gradient',
      fillColor: type === 'text' || type === 'counter' ? '#F8FAFC' : '#3B82F6',
      fillColor2: '#22D3EE',
      gradientAngle: 135,
      strokeColor: type === 'ring' || type === 'orbit' || type === 'line' ? '#60A5FA' : '#93C5FD',
      strokeWidth: type === 'ring' || type === 'line' || type === 'orbit' ? 10 : 0,
      strokeDash: 0,
      cornerRadius: type === 'rect' ? 28 : 0,
      blendMode: 'source-over',
      shadowBlur: type === 'particles' || type === 'ring' ? 18 : 0,
      shadowColor: '#3B82F6',
    },
    shapeProps: {
      sides: 6,
      points: 5,
      innerRadius: 0.45,
      startAngle: -90,
      endAngle: 185,
      svgPath: 'M 50 10 C 80 10 90 40 90 50 C 90 80 60 90 50 90 C 20 90 10 60 10 50 C 10 20 35 10 50 10 Z',
      pathViewBox: 100,
    },
    textProps: {
      content: type === 'counter' ? 'Revenue Growth' : 'Motion Crafted',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: type === 'counter' ? 84 : 76,
      fontWeight: 700,
      letterSpacing: -1.5,
      lineHeight: 1.1,
      align: 'center',
      revealMode: 'fade-up',
      counterFrom: 0,
      counterTo: 148,
      counterPrefix: '+',
      counterSuffix: '%',
      counterDecimals: 0,
    },
    proceduralProps: {
      particleCount: 42,
      particleSpeed: 120,
      particleSpread: 260,
      particleSize: 6,
      particleGravity: -18,
      waveBars: 28,
      waveAmplitude: 75,
      waveFrequency: 3.2,
      waveMirror: true,
      orbitRings: 3,
      orbitSpeed: 48,
      blobLobes: 6,
      blobComplexity: 0.28,
      gridCols: 8,
      gridRows: 5,
    },
    behavior: {
      entrancePreset: 'scale-pop',
      entranceDuration: 0.75,
      exitPreset: 'fade',
      exitDuration: 0.45,
      oscillateX: { amp: 0, freq: 0.5, phase: 0 },
      oscillateY: {
        amp: type === 'blob' || type === 'circle' ? 10 : 0,
        freq: 0.5,
        phase: 0,
      },
      spinSpeed: type === 'ring' || type === 'star' ? 28 : 0,
      pulseAmp: 0,
      pulseFreq: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
    },
    keyframes: {},
  };

  if (!partial) return base;

  return {
    ...base,
    ...partial,
    transform: { ...base.transform, ...partial.transform },
    style: { ...base.style, ...partial.style },
    shapeProps: { ...base.shapeProps, ...partial.shapeProps },
    textProps: { ...base.textProps, ...partial.textProps },
    proceduralProps: { ...base.proceduralProps, ...partial.proceduralProps },
    behavior: {
      ...base.behavior,
      ...partial.behavior,
      oscillateX: {
        ...base.behavior.oscillateX,
        ...partial.behavior?.oscillateX,
      },
      oscillateY: {
        ...base.behavior.oscillateY,
        ...partial.behavior?.oscillateY,
      },
    },
    keyframes: { ...base.keyframes, ...partial.keyframes },
  };
}

export function getTextScramble(text: string, progress: number, seed = 1): string {
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%+-';
  const revealCount = Math.floor(clamp(progress, 0, 1) * text.length);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      out += ' ';
    } else if (i < revealCount) {
      out += ch;
    } else {
      const idx = Math.floor(seededRandom(seed + i * 17 + Math.floor(progress * 30)) * glyphs.length);
      out += glyphs[idx];
    }
  }
  return out;
}
