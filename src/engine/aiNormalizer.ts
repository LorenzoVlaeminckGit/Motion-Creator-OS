import { clamp } from './easing';
import { createDefaultObject, createId } from './motionEngine';
import type {
  AnimatableProperty,
  BackgroundType,
  EasingType,
  EntrancePreset,
  ExitPreset,
  FillMode,
  Keyframe,
  MotionComposition,
  MotionObject,
  MotionObjectType,
  TextRevealMode,
} from '../types/motion';

const VALID_OBJECT_TYPES: MotionObjectType[] = [
  'rect',
  'circle',
  'polygon',
  'star',
  'ring',
  'line',
  'path',
  'text',
  'counter',
  'particles',
  'waveform',
  'orbit',
  'blob',
  'grid',
];

const VALID_BG_TYPES: BackgroundType[] = [
  'solid',
  'linear-gradient',
  'radial-mesh',
  'grid-studio',
  'starfield',
];

const VALID_EASINGS: EasingType[] = [
  'linear',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutCubic',
  'easeOutBack',
  'easeOutExpo',
  'springElastic',
  'bounceOut',
];

const VALID_ENTRANCES: EntrancePreset[] = [
  'none',
  'fade',
  'scale-pop',
  'slide-up',
  'slide-left',
  'rotate-in',
  'blur-in',
];

const VALID_EXITS: ExitPreset[] = ['none', 'fade', 'scale-down', 'slide-down'];

const VALID_REVEALS: TextRevealMode[] = [
  'none',
  'fade-up',
  'typewriter',
  'scramble',
  'word-pop',
];

const VALID_FILL_MODES: FillMode[] = ['solid', 'linear-gradient', 'radial-gradient', 'none'];

const VALID_FONTS = [
  'Plus Jakarta Sans',
  'DM Sans',
  'Playfair Display',
  'JetBrains Mono',
] as const;

function asString(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback;
}

function asNumber(val: unknown, fallback: number, min = -10000, max = 10000): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return clamp(num, min, max);
}

function asEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

export function normalizeAiObject(
  raw: Record<string, unknown>,
  comp: Pick<MotionComposition, 'width' | 'height' | 'duration'>,
): MotionObject {
  const type = asEnum(raw.type, VALID_OBJECT_TYPES, 'circle');
  const base = createDefaultObject(type, comp);

  const rawTransform = (raw.transform ?? {}) as Record<string, unknown>;
  const rawStyle = (raw.style ?? {}) as Record<string, unknown>;
  const rawText = (raw.textProps ?? {}) as Record<string, unknown>;
  const rawShape = (raw.shapeProps ?? {}) as Record<string, unknown>;
  const rawProc = (raw.proceduralProps ?? {}) as Record<string, unknown>;
  const rawBehav = (raw.behavior ?? {}) as Record<string, unknown>;

  const startTime = asNumber(raw.startTime, 0, 0, Math.max(0, comp.duration - 0.5));
  const endTime = asNumber(
    raw.endTime,
    comp.duration,
    startTime + 0.4,
    comp.duration,
  );

  const keyframes: Partial<Record<AnimatableProperty, Keyframe[]>> = {};
  if (Array.isArray(raw.keyframes)) {
    for (const item of raw.keyframes) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const prop = rec.property as AnimatableProperty;
      if (!['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity', 'width', 'height'].includes(prop)) {
        continue;
      }
      const list = keyframes[prop] ?? [];
      list.push({
        id: createId('kf'),
        time: asNumber(rec.time, 0, 0, comp.duration),
        value: asNumber(rec.value, 0, -4000, 4000),
        easing: asEnum(rec.easing, VALID_EASINGS, 'easeInOutCubic'),
      });
      keyframes[prop] = list.sort((a, b) => a.time - b.time);
    }
  }

  return {
    ...base,
    id: createId('layer'),
    name: asString(raw.name, base.name),
    startTime,
    endTime,
    transform: {
      x: asNumber(rawTransform.x, base.transform.x, -500, comp.width + 500),
      y: asNumber(rawTransform.y, base.transform.y, -500, comp.height + 500),
      width: asNumber(rawTransform.width, base.transform.width, 12, comp.width * 1.5),
      height: asNumber(rawTransform.height, base.transform.height, 4, comp.height * 1.5),
      scaleX: asNumber(rawTransform.scaleX, 1, 0.05, 5),
      scaleY: asNumber(rawTransform.scaleY, 1, 0.05, 5),
      rotation: asNumber(rawTransform.rotation, 0, -720, 720),
      opacity: asNumber(rawTransform.opacity, 1, 0.05, 1),
    },
    style: {
      ...base.style,
      fillMode: asEnum(rawStyle.fillMode, VALID_FILL_MODES, base.style.fillMode),
      fillColor: asString(rawStyle.fillColor, base.style.fillColor),
      fillColor2: asString(rawStyle.fillColor2, base.style.fillColor2),
      gradientAngle: asNumber(rawStyle.gradientAngle, base.style.gradientAngle, 0, 360),
      strokeColor: asString(rawStyle.strokeColor, base.style.strokeColor),
      strokeWidth: asNumber(rawStyle.strokeWidth, base.style.strokeWidth, 0, 48),
      strokeDash: asNumber(rawStyle.strokeDash, base.style.strokeDash, 0, 80),
      cornerRadius: asNumber(rawStyle.cornerRadius, base.style.cornerRadius, 0, 240),
      shadowBlur: asNumber(rawStyle.shadowBlur, base.style.shadowBlur, 0, 80),
      shadowColor: asString(rawStyle.shadowColor, base.style.shadowColor),
    },
    shapeProps: {
      ...base.shapeProps,
      sides: asNumber(rawShape.sides, base.shapeProps.sides, 3, 16),
      points: asNumber(rawShape.points, base.shapeProps.points, 3, 16),
      innerRadius: asNumber(rawShape.innerRadius, base.shapeProps.innerRadius, 0.15, 0.9),
      startAngle: asNumber(rawShape.startAngle, base.shapeProps.startAngle, -360, 360),
      endAngle: asNumber(rawShape.endAngle, base.shapeProps.endAngle, -360, 360),
      svgPath: asString(rawShape.svgPath, base.shapeProps.svgPath),
      pathViewBox: asNumber(rawShape.pathViewBox, base.shapeProps.pathViewBox, 24, 1000),
    },
    textProps: {
      ...base.textProps,
      content: asString(rawText.content, base.textProps.content),
      fontFamily: asEnum(rawText.fontFamily, VALID_FONTS, base.textProps.fontFamily),
      fontSize: asNumber(rawText.fontSize, base.textProps.fontSize, 16, 220),
      fontWeight: asNumber(rawText.fontWeight, base.textProps.fontWeight, 400, 800),
      letterSpacing: asNumber(rawText.letterSpacing, base.textProps.letterSpacing, -8, 24),
      revealMode: asEnum(rawText.revealMode, VALID_REVEALS, base.textProps.revealMode),
      counterFrom: asNumber(rawText.counterFrom, base.textProps.counterFrom, -100000, 100000),
      counterTo: asNumber(rawText.counterTo, base.textProps.counterTo, -100000, 1000000),
      counterPrefix: typeof rawText.counterPrefix === 'string' ? rawText.counterPrefix : base.textProps.counterPrefix,
      counterSuffix: typeof rawText.counterSuffix === 'string' ? rawText.counterSuffix : base.textProps.counterSuffix,
      counterDecimals: asNumber(rawText.counterDecimals, base.textProps.counterDecimals, 0, 3),
    },
    proceduralProps: {
      ...base.proceduralProps,
      particleCount: asNumber(rawProc.particleCount, base.proceduralProps.particleCount, 6, 150),
      particleSpeed: asNumber(rawProc.particleSpeed, base.proceduralProps.particleSpeed, 20, 400),
      particleSpread: asNumber(rawProc.particleSpread, base.proceduralProps.particleSpread, 60, 900),
      particleSize: asNumber(rawProc.particleSize, base.proceduralProps.particleSize, 2, 24),
      waveBars: asNumber(rawProc.waveBars, base.proceduralProps.waveBars, 8, 64),
      waveAmplitude: asNumber(rawProc.waveAmplitude, base.proceduralProps.waveAmplitude, 15, 220),
      waveFrequency: asNumber(rawProc.waveFrequency, base.proceduralProps.waveFrequency, 0.5, 10),
      orbitRings: asNumber(rawProc.orbitRings, base.proceduralProps.orbitRings, 1, 7),
      orbitSpeed: asNumber(rawProc.orbitSpeed, base.proceduralProps.orbitSpeed, 5, 180),
      blobLobes: asNumber(rawProc.blobLobes, base.proceduralProps.blobLobes, 3, 10),
      blobComplexity: asNumber(rawProc.blobComplexity, base.proceduralProps.blobComplexity, 0.05, 0.6),
      gridCols: asNumber(rawProc.gridCols, base.proceduralProps.gridCols, 3, 20),
      gridRows: asNumber(rawProc.gridRows, base.proceduralProps.gridRows, 3, 16),
    },
    behavior: {
      ...base.behavior,
      entrancePreset: asEnum(rawBehav.entrancePreset, VALID_ENTRANCES, base.behavior.entrancePreset),
      entranceDuration: asNumber(rawBehav.entranceDuration, base.behavior.entranceDuration, 0.1, 3),
      exitPreset: asEnum(rawBehav.exitPreset, VALID_EXITS, base.behavior.exitPreset),
      exitDuration: asNumber(rawBehav.exitDuration, base.behavior.exitDuration, 0.1, 3),
      spinSpeed: asNumber(rawBehav.spinSpeed, base.behavior.spinSpeed, -360, 360),
      pulseAmp: asNumber(rawBehav.pulseAmp, base.behavior.pulseAmp, 0, 0.5),
      pulseFreq: asNumber(rawBehav.pulseFreq, base.behavior.pulseFreq, 0, 8),
      oscillateX: {
        amp: asNumber((rawBehav.oscillateX as Record<string, unknown>)?.amp, base.behavior.oscillateX.amp, 0, 240),
        freq: asNumber((rawBehav.oscillateX as Record<string, unknown>)?.freq, base.behavior.oscillateX.freq, 0.1, 5),
        phase: asNumber((rawBehav.oscillateX as Record<string, unknown>)?.phase, 0, 0, 6.28),
      },
      oscillateY: {
        amp: asNumber((rawBehav.oscillateY as Record<string, unknown>)?.amp, base.behavior.oscillateY.amp, 0, 240),
        freq: asNumber((rawBehav.oscillateY as Record<string, unknown>)?.freq, base.behavior.oscillateY.freq, 0.1, 5),
        phase: asNumber((rawBehav.oscillateY as Record<string, unknown>)?.phase, 0, 0, 6.28),
      },
    },
    keyframes,
  };
}

export function normalizeAiScene(
  raw: Record<string, unknown>,
  width: number,
  height: number,
): MotionComposition {
  const duration = asNumber(raw.duration, 6, 2, 20);
  const bpm = asNumber(raw.bpm, 120, 60, 180);
  const rawBg = (raw.background ?? {}) as Record<string, unknown>;

  const rawObjects = Array.isArray(raw.objects) ? raw.objects : [];
  const objects = rawObjects
    .filter((o): o is Record<string, unknown> => Boolean(o && typeof o === 'object'))
    .slice(0, 12)
    .map((o) => normalizeAiObject(o, { width, height, duration }));

  return {
    id: createId('comp'),
    name: asString(raw.name, 'AI Motion Scene'),
    width,
    height,
    fps: 60,
    duration,
    bpm,
    background: {
      type: asEnum(rawBg.type, VALID_BG_TYPES, 'radial-mesh'),
      color1: asString(rawBg.color1, '#0B0F17'),
      color2: asString(rawBg.color2, '#1D4ED8'),
      color3: asString(rawBg.color3, '#06B6D4'),
      angle: asNumber(rawBg.angle, 135, 0, 360),
      animate: typeof rawBg.animate === 'boolean' ? rawBg.animate : true,
      gridSize: 72,
      gridOpacity: 0.14,
    },
    camera: {
      zoom: 1,
      panX: 0,
      panY: 0,
      handheldDrift: asNumber(raw.handheldDrift, 0.14, 0, 1),
      vignette: 0.35,
      filmGrain: 0.12,
    },
    objects,
  };
}

export interface StyleTransferOptions {
  intensity: number; // 0 to 1
  adaptMotion: boolean;
}

export function applyStyleTransferResult(
  comp: MotionComposition,
  raw: Record<string, unknown>,
  options: StyleTransferOptions = { intensity: 1, adaptMotion: true },
): MotionComposition {
  const intensity = clamp(options.intensity, 0.1, 1);
  const rawBg = (raw.background ?? {}) as Record<string, unknown>;
  const rawCam = (raw.camera ?? {}) as Record<string, unknown>;
  const rawTypo = (raw.typography ?? {}) as Record<string, unknown>;
  const rawPalette = (raw.palette ?? {}) as Record<string, unknown>;
  const overridesList = Array.isArray(raw.layerOverrides)
    ? (raw.layerOverrides as Record<string, unknown>[])
    : [];
  const overrideMap = new Map<string, Record<string, unknown>>();
  for (const ov of overridesList) {
    if (ov && typeof ov.id === 'string') {
      overrideMap.set(ov.id, ov);
    }
  }

  const nextFont = asEnum(
    rawTypo.fontFamily,
    VALID_FONTS,
    comp.objects.find((o) => o.type === 'text')?.textProps.fontFamily ?? 'Plus Jakarta Sans',
  );

  const primary = asString(rawPalette.primaryColor, '#3B82F6');
  const secondary = asString(rawPalette.secondaryColor, '#22D3EE');
  const textColor = asString(rawPalette.textColor, '#F8FAFC');
  const strokeColor = asString(rawPalette.strokeColor, primary);
  const shadowColor = asString(rawPalette.shadowColor, primary);
  const globalFillMode = asEnum(rawPalette.fillMode, VALID_FILL_MODES, 'linear-gradient');
  const globalShadowBlur = asNumber(rawPalette.shadowBlur, 16, 0, 64) * intensity;

  return {
    ...comp,
    background: {
      ...comp.background,
      type: asEnum(rawBg.type, VALID_BG_TYPES, comp.background.type),
      color1: asString(rawBg.color1, comp.background.color1),
      color2: asString(rawBg.color2, comp.background.color2),
      color3: asString(rawBg.color3, comp.background.color3),
      angle: asNumber(rawBg.angle, comp.background.angle, 0, 360),
      animate: typeof rawBg.animate === 'boolean' ? rawBg.animate : comp.background.animate,
    },
    camera: {
      ...comp.camera,
      vignette:
        comp.camera.vignette +
        (asNumber(rawCam.vignette, comp.camera.vignette, 0, 0.85) - comp.camera.vignette) *
          intensity,
      filmGrain:
        comp.camera.filmGrain +
        (asNumber(rawCam.filmGrain, comp.camera.filmGrain, 0, 1) - comp.camera.filmGrain) *
          intensity,
      handheldDrift: options.adaptMotion
        ? asNumber(rawCam.handheldDrift, comp.camera.handheldDrift, 0, 1) * intensity
        : comp.camera.handheldDrift,
    },
    objects: comp.objects.map((obj, idx) => {
      const ov = overrideMap.get(obj.id);
      const isText = obj.type === 'text' || obj.type === 'counter';
      const isStrokeOnly = obj.type === 'ring' || obj.type === 'line' || obj.type === 'orbit';
      const altFill = idx % 2 === 0 ? primary : secondary;

      const nextStyle = {
        ...obj.style,
        fillMode: ov?.fillMode
          ? asEnum(ov.fillMode, VALID_FILL_MODES, obj.style.fillMode)
          : isStrokeOnly
            ? 'none'
            : isText
              ? 'solid'
              : globalFillMode,
        fillColor: asString(ov?.fillColor, isText ? textColor : altFill),
        fillColor2: asString(ov?.fillColor2, idx % 2 === 0 ? secondary : primary),
        strokeColor: asString(ov?.strokeColor, strokeColor),
        shadowColor,
        shadowBlur:
          ov?.shadowBlur !== undefined
            ? asNumber(ov.shadowBlur, globalShadowBlur, 0, 80) * intensity
            : obj.style.shadowBlur > 0 || globalShadowBlur > 6
              ? globalShadowBlur
              : obj.style.shadowBlur,
      };

      const nextText = isText
        ? {
            ...obj.textProps,
            fontFamily: nextFont,
            letterSpacing:
              rawTypo.letterSpacing !== undefined
                ? asNumber(rawTypo.letterSpacing, obj.textProps.letterSpacing, -6, 18)
                : obj.textProps.letterSpacing,
          }
        : obj.textProps;

      const nextBehavior =
        options.adaptMotion && ov
          ? {
              ...obj.behavior,
              entrancePreset: asEnum(
                ov.entrancePreset,
                VALID_ENTRANCES,
                obj.behavior.entrancePreset,
              ),
              spinSpeed:
                ov.spinSpeed !== undefined
                  ? asNumber(ov.spinSpeed, obj.behavior.spinSpeed, -360, 360)
                  : obj.behavior.spinSpeed,
              pulseAmp:
                ov.pulseAmp !== undefined
                  ? asNumber(ov.pulseAmp, obj.behavior.pulseAmp, 0, 0.4)
                  : obj.behavior.pulseAmp,
            }
          : obj.behavior;

      return {
        ...obj,
        style: nextStyle,
        textProps: nextText,
        behavior: nextBehavior,
      };
    }),
  };
}

export function applyAutoComposePlan(
  comp: MotionComposition,
  raw: Record<string, unknown>,
): MotionComposition {
  const arrangements = Array.isArray(raw.arrangements)
    ? (raw.arrangements as Record<string, unknown>[])
    : [];
  const planMap = new Map<string, { rec: Record<string, unknown>; order: number }>();
  arrangements.forEach((rec, idx) => {
    if (rec && typeof rec.id === 'string') {
      planMap.set(rec.id, {
        rec,
        order: asNumber(rec.zIndex, idx, 0, 100),
      });
    }
  });

  const updatedObjects = comp.objects.map((obj, idx) => {
    const entry = planMap.get(obj.id);
    if (!entry) return obj;
    const rec = entry.rec;

    const startTime = asNumber(rec.startTime, obj.startTime, 0, Math.max(0, comp.duration - 0.6));
    const endTime = asNumber(rec.endTime, comp.duration, startTime + 0.4, comp.duration);

    const keyframes: Partial<Record<AnimatableProperty, Keyframe[]>> = { ...obj.keyframes };
    if (Array.isArray(rec.keyframes) && rec.keyframes.length > 0) {
      const nextKfs: Partial<Record<AnimatableProperty, Keyframe[]>> = {};
      for (const item of rec.keyframes) {
        if (!item || typeof item !== 'object') continue;
        const kfRec = item as Record<string, unknown>;
        const prop = kfRec.property as AnimatableProperty;
        if (!['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity', 'width', 'height'].includes(prop)) {
          continue;
        }
        const list = nextKfs[prop] ?? [];
        list.push({
          id: createId('kf'),
          time: asNumber(kfRec.time, 0, 0, comp.duration),
          value: asNumber(kfRec.value, 0, -4000, 4000),
          easing: asEnum(kfRec.easing, VALID_EASINGS, 'easeOutExpo'),
        });
        nextKfs[prop] = list.sort((a, b) => a.time - b.time);
      }
      if (Object.keys(nextKfs).length > 0) {
        Object.assign(keyframes, nextKfs);
      }
    }

    return {
      ...obj,
      startTime,
      endTime,
      transform: {
        ...obj.transform,
        x: asNumber(rec.x, obj.transform.x, -300, comp.width + 300),
        y: asNumber(rec.y, obj.transform.y, -300, comp.height + 300),
        width: asNumber(rec.width, obj.transform.width, 12, comp.width * 1.4),
        height: asNumber(rec.height, obj.transform.height, 4, comp.height * 1.4),
        scaleX: asNumber(rec.scaleX, obj.transform.scaleX, 0.1, 4),
        scaleY: asNumber(rec.scaleY, obj.transform.scaleY, 0.1, 4),
        rotation: asNumber(rec.rotation, obj.transform.rotation, -360, 360),
      },
      behavior: {
        ...obj.behavior,
        entrancePreset: asEnum(rec.entrancePreset, VALID_ENTRANCES, obj.behavior.entrancePreset),
        entranceDuration: asNumber(rec.entranceDuration, obj.behavior.entranceDuration, 0.15, 2.5),
        exitPreset: asEnum(rec.exitPreset, VALID_EXITS, obj.behavior.exitPreset),
        exitDuration: asNumber(rec.exitDuration, obj.behavior.exitDuration, 0.15, 2.5),
        spinSpeed: asNumber(rec.spinSpeed, obj.behavior.spinSpeed, -240, 240),
        pulseAmp: asNumber(rec.pulseAmp, obj.behavior.pulseAmp, 0, 0.35),
        oscillateY: {
          ...obj.behavior.oscillateY,
          amp: asNumber(rec.oscillateYAmp, obj.behavior.oscillateY.amp, 0, 120),
        },
      },
      keyframes,
      __zOrder: entry.order ?? idx,
    };
  });

  updatedObjects.sort((a, b) => {
    const za = (a as MotionObject & { __zOrder?: number }).__zOrder ?? 0;
    const zb = (b as MotionObject & { __zOrder?: number }).__zOrder ?? 0;
    return za - zb;
  });

  const cleanedObjects: MotionObject[] = updatedObjects.map((item) => {
    const { __zOrder: _discard, ...rest } = item as MotionObject & { __zOrder?: number };
    return rest;
  });

  const rawCam = (raw.camera ?? {}) as Record<string, unknown>;
  return {
    ...comp,
    bpm: asNumber(raw.bpm, comp.bpm, 60, 180),
    camera: {
      ...comp.camera,
      zoom: asNumber(rawCam.zoom, comp.camera.zoom, 0.7, 1.5),
      handheldDrift: asNumber(rawCam.handheldDrift, comp.camera.handheldDrift, 0, 0.8),
    },
    objects: cleanedObjects,
  };
}

export function normalizeAiAssetBundle(
  rawAssets: unknown[],
  comp: Pick<MotionComposition, 'width' | 'height' | 'duration'>,
): MotionObject[] {
  return rawAssets
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .slice(0, 6)
    .map((item) => normalizeAiObject(item, comp));
}

