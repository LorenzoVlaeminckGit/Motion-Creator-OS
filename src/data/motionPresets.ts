import { applyEasing, clamp } from '../engine/easing';
import { createId } from '../engine/motionEngine';
import type {
  AnimatableProperty,
  EasingType,
  Keyframe,
  MotionObject,
} from '../types/motion';

export interface MotionPresetSpec {
  id: string;
  name: string;
  easing: EasingType;
  category: 'Physics' | 'Kinetic' | 'Editorial';
  summary: string;
  propsSummary: string;
  defaultDuration: number;
  accentColor: string;
}

export const MOTION_PRESETS: MotionPresetSpec[] = [
  {
    id: 'bounce',
    name: 'Bounce',
    easing: 'bounceOut',
    category: 'Physics',
    summary: 'Gravity drop & settle bounce on Y + subtle squash-recover',
    propsSummary: 'Y · Scale',
    defaultDuration: 0.95,
    accentColor: '#38BDF8',
  },
  {
    id: 'elastic',
    name: 'Elastic',
    easing: 'springElastic',
    category: 'Physics',
    summary: 'Rubberized elastic pop-in with rotational snap',
    propsSummary: 'Scale · Rot',
    defaultDuration: 1.05,
    accentColor: '#A78BFA',
  },
  {
    id: 'spring',
    name: 'Spring',
    easing: 'easeOutBack',
    category: 'Physics',
    summary: 'Snappy spring slide-in with calibrated overshoot',
    propsSummary: 'X · Fade',
    defaultDuration: 0.85,
    accentColor: '#22D3EE',
  },
  {
    id: 'overshoot-pop',
    name: 'Overshoot Pop',
    easing: 'easeOutBack',
    category: 'Kinetic',
    summary: 'Punches scale up past 100% and locks cleanly into place',
    propsSummary: 'Scale · Y',
    defaultDuration: 0.72,
    accentColor: '#F472B6',
  },
  {
    id: 'expo-glide',
    name: 'Expo Glide',
    easing: 'easeOutExpo',
    category: 'Editorial',
    summary: 'High-speed editorial glide with silky exponential brake',
    propsSummary: 'X · Fade',
    defaultDuration: 0.9,
    accentColor: '#34D399',
  },
  {
    id: 'smooth-drift',
    name: 'Smooth Ease',
    easing: 'easeInOutCubic',
    category: 'Editorial',
    summary: 'Balanced S-curve rise and fade for refined titles',
    propsSummary: 'Y · Fade',
    defaultDuration: 1.0,
    accentColor: '#60A5FA',
  },
  {
    id: 'snap-spin',
    name: 'Snap Spin',
    easing: 'easeOutQuad',
    category: 'Kinetic',
    summary: '180° rotational whip into resting scale',
    propsSummary: 'Rot · Scale',
    defaultDuration: 0.8,
    accentColor: '#FBBF24',
  },
  {
    id: 'beat-bounce',
    name: 'Beat Bounce',
    easing: 'bounceOut',
    category: 'Physics',
    summary: 'Rhythmic 3-keyframe scale pulse with bounce recovery',
    propsSummary: 'Pulse',
    defaultDuration: 1.1,
    accentColor: '#FB7185',
  },
];

export function findMotionPresetById(presetId: string): MotionPresetSpec | undefined {
  return MOTION_PRESETS.find((p) => p.id === presetId);
}

/**
 * Generates normalized SVG polyline points ("x,y x,y ...") representing the
 * preset's easing curve inside a 48x24 preview box.
 */
export function buildPresetSparklinePoints(easing: EasingType, width = 48, height = 24): string {
  const steps = 20;
  const padY = 5;
  const usableH = height - padY * 2;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const v = applyEasing(t, easing);
    const px = +(t * width).toFixed(1);
    // Map [0..1] to [height-padY .. padY], allowing overshoot slightly into padding
    const py = +clamp(height - padY - v * usableH, 1, height - 1).toFixed(1);
    pts.push(`${px},${py}`);
  }
  return pts.join(' ');
}

function makeKf(time: number, value: number, easing: EasingType): Keyframe {
  return {
    id: createId('kf'),
    time: Math.round(time * 100) / 100,
    value: Math.round(value * 1000) / 1000,
    easing,
  };
}

export function applyMotionPresetToObject(
  obj: MotionObject,
  presetId: string,
  compositionDuration = 6,
): MotionObject {
  const preset = findMotionPresetById(presetId);
  if (!preset) return obj;

  const availableWindow = Math.max(0.45, obj.endTime - obj.startTime);
  const dur = Math.min(preset.defaultDuration, availableWindow * 0.85, Math.max(0.4, compositionDuration * 0.6));
  const t0 = Math.max(0, obj.startTime);
  const t1 = Math.min(obj.endTime, t0 + dur);
  const tMid = t0 + (t1 - t0) * 0.45;

  const restX = obj.transform.x;
  const restY = obj.transform.y;
  const restSX = obj.transform.scaleX;
  const restSY = obj.transform.scaleY;
  const restRot = obj.transform.rotation;
  const restOp = obj.transform.opacity;

  const nextKeyframes: Partial<Record<AnimatableProperty, Keyframe[]>> = {
    ...obj.keyframes,
  };

  switch (preset.id) {
    case 'bounce': {
      nextKeyframes.y = [
        makeKf(t0, Math.max(40, restY - 170), 'linear'),
        makeKf(t1, restY, 'bounceOut'),
      ];
      nextKeyframes.scaleX = [
        makeKf(t0, restSX * 0.84, 'linear'),
        makeKf(t1, restSX, 'bounceOut'),
      ];
      nextKeyframes.scaleY = [
        makeKf(t0, restSY * 1.12, 'linear'),
        makeKf(t1, restSY, 'bounceOut'),
      ];
      break;
    }
    case 'elastic': {
      nextKeyframes.scaleX = [
        makeKf(t0, restSX * 0.18, 'linear'),
        makeKf(t1, restSX, 'springElastic'),
      ];
      nextKeyframes.scaleY = [
        makeKf(t0, restSY * 0.18, 'linear'),
        makeKf(t1, restSY, 'springElastic'),
      ];
      nextKeyframes.rotation = [
        makeKf(t0, restRot - 18, 'linear'),
        makeKf(t1, restRot, 'springElastic'),
      ];
      break;
    }
    case 'spring': {
      nextKeyframes.x = [
        makeKf(t0, restX - 240, 'linear'),
        makeKf(t1, restX, 'easeOutBack'),
      ];
      nextKeyframes.opacity = [
        makeKf(t0, 0, 'linear'),
        makeKf(t0 + (t1 - t0) * 0.4, restOp, 'easeOutQuad'),
      ];
      break;
    }
    case 'overshoot-pop': {
      nextKeyframes.scaleX = [
        makeKf(t0, restSX * 0.35, 'linear'),
        makeKf(t1, restSX, 'easeOutBack'),
      ];
      nextKeyframes.scaleY = [
        makeKf(t0, restSY * 0.35, 'linear'),
        makeKf(t1, restSY, 'easeOutBack'),
      ];
      nextKeyframes.y = [
        makeKf(t0, restY + 72, 'linear'),
        makeKf(t1, restY, 'easeOutBack'),
      ];
      break;
    }
    case 'expo-glide': {
      nextKeyframes.x = [
        makeKf(t0, restX - 210, 'linear'),
        makeKf(t1, restX, 'easeOutExpo'),
      ];
      nextKeyframes.opacity = [
        makeKf(t0, 0, 'linear'),
        makeKf(t1, restOp, 'easeOutExpo'),
      ];
      break;
    }
    case 'smooth-drift': {
      nextKeyframes.y = [
        makeKf(t0, restY + 85, 'linear'),
        makeKf(t1, restY, 'easeInOutCubic'),
      ];
      nextKeyframes.opacity = [
        makeKf(t0, 0, 'linear'),
        makeKf(t1, restOp, 'easeInOutCubic'),
      ];
      break;
    }
    case 'snap-spin': {
      nextKeyframes.rotation = [
        makeKf(t0, restRot - 180, 'linear'),
        makeKf(t1, restRot, 'easeOutBack'),
      ];
      nextKeyframes.scaleX = [
        makeKf(t0, restSX * 0.55, 'linear'),
        makeKf(t1, restSX, 'easeOutQuad'),
      ];
      nextKeyframes.scaleY = [
        makeKf(t0, restSY * 0.55, 'linear'),
        makeKf(t1, restSY, 'easeOutQuad'),
      ];
      break;
    }
    case 'beat-bounce': {
      nextKeyframes.scaleX = [
        makeKf(t0, restSX, 'linear'),
        makeKf(tMid, restSX * 1.24, 'easeOutBack'),
        makeKf(t1, restSX, 'bounceOut'),
      ];
      nextKeyframes.scaleY = [
        makeKf(t0, restSY, 'linear'),
        makeKf(tMid, restSY * 1.24, 'easeOutBack'),
        makeKf(t1, restSY, 'bounceOut'),
      ];
      break;
    }
  }

  return {
    ...obj,
    behavior: {
      ...obj.behavior,
      // Disable conflicting built-in entrancePreset so preset keyframes animate cleanly
      entrancePreset: 'none',
    },
    keyframes: nextKeyframes,
  };
}
