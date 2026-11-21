import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAutoComposePlan,
  applyStyleTransferResult,
  normalizeAiAssetBundle,
  normalizeAiObject,
  normalizeAiScene,
} from './aiNormalizer';
import { createDefaultObject } from './motionEngine';
import type { MotionComposition } from '../types/motion';

function makeTestComp(): MotionComposition {
  return {
    id: 'comp_1',
    name: 'Test Scene',
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 6,
    bpm: 120,
    background: {
      type: 'solid',
      color1: '#000000',
      color2: '#111111',
      color3: '#222222',
      angle: 90,
      animate: false,
      gridSize: 64,
      gridOpacity: 0.1,
    },
    camera: {
      zoom: 1,
      panX: 0,
      panY: 0,
      handheldDrift: 0,
      vignette: 0.2,
      filmGrain: 0.1,
    },
    objects: [
      createDefaultObject(
        'circle',
        { width: 1920, height: 1080, duration: 6 },
        { id: 'layer_shape', name: 'Hero Orb' },
      ),
      createDefaultObject(
        'text',
        { width: 1920, height: 1080, duration: 6 },
        { id: 'layer_title', name: 'Headline' },
      ),
    ],
  };
}

test('normalizeAiObject sanitizes bounds and falls back cleanly', () => {
  const obj = normalizeAiObject(
    {
      name: 'AI Ring',
      type: 'ring',
      transform: { x: 960, y: 540, width: 400, height: 400, opacity: 4 },
      behavior: { spinSpeed: 9999, entrancePreset: 'invalid-preset' },
      keyframes: [
        { property: 'rotation', time: 0, value: 0, easing: 'linear' },
        { property: 'rotation', time: 4, value: 360, easing: 'easeOutExpo' },
      ],
    },
    { width: 1920, height: 1080, duration: 6 },
  );

  assert.equal(obj.type, 'ring');
  assert.equal(obj.transform.opacity, 1);
  assert.equal(obj.behavior.spinSpeed, 360);
  assert.equal(obj.behavior.entrancePreset, 'scale-pop');
  assert.equal(obj.keyframes.rotation?.length, 2);
});

test('normalizeAiScene builds complete composition from raw AI payload', () => {
  const scene = normalizeAiScene(
    {
      name: 'Launch Teaser',
      duration: 8,
      bpm: 128,
      background: { type: 'starfield', color1: '#050810', color2: '#FFFFFF', color3: '#38BDF8' },
      objects: [
        { name: 'Hero Title', type: 'text', textProps: { content: 'Beyond Speed' } },
      ],
    },
    1920,
    1080,
  );

  assert.equal(scene.name, 'Launch Teaser');
  assert.equal(scene.duration, 8);
  assert.equal(scene.background.type, 'starfield');
  assert.equal(scene.objects.length, 1);
  assert.equal(scene.objects[0].textProps.content, 'Beyond Speed');
});

test('applyStyleTransferResult updates palette, typography, camera FX, and per-layer overrides', () => {
  const comp = makeTestComp();
  const styled = applyStyleTransferResult(
    comp,
    {
      background: {
        type: 'radial-mesh',
        color1: '#1A0B2E',
        color2: '#EC4899',
        color3: '#F59E0B',
        animate: true,
      },
      typography: { fontFamily: 'Playfair Display', letterSpacing: 2 },
      camera: { vignette: 0.6, filmGrain: 0.5, handheldDrift: 0.3 },
      palette: {
        primaryColor: '#F472B6',
        secondaryColor: '#FBBF24',
        textColor: '#FFFBEB',
        shadowBlur: 24,
      },
      layerOverrides: [
        {
          id: 'layer_shape',
          entrancePreset: 'blur-in',
          spinSpeed: 45,
        },
      ],
    },
    { intensity: 1, adaptMotion: true },
  );

  assert.equal(styled.background.type, 'radial-mesh');
  assert.equal(styled.background.color2, '#EC4899');
  assert.equal(styled.camera.vignette, 0.6);
  assert.equal(styled.objects[0].id, 'layer_shape');
  assert.equal(styled.objects[0].style.fillColor, '#F472B6');
  assert.equal(styled.objects[0].behavior.entrancePreset, 'blur-in');
  assert.equal(styled.objects[0].behavior.spinSpeed, 45);
  assert.equal(styled.objects[1].textProps.fontFamily, 'Playfair Display');
  assert.equal(styled.objects[1].style.fillColor, '#FFFBEB');
});

test('applyAutoComposePlan reorders layers, clamps timings, and updates arrangement', () => {
  const comp = makeTestComp();
  const composed = applyAutoComposePlan(comp, {
    bpm: 136,
    camera: { zoom: 1.08, handheldDrift: 0.2 },
    arrangements: [
      {
        id: 'layer_title',
        zIndex: 0,
        x: 640,
        y: 420,
        startTime: 0.4,
        endTime: 5.5,
        entrancePreset: 'slide-up',
        keyframes: [{ property: 'opacity', time: 0.4, value: 0, easing: 'linear' }],
      },
      {
        id: 'layer_shape',
        zIndex: 1,
        x: 1320,
        y: 540,
        startTime: 0,
        endTime: 6,
        spinSpeed: 30,
      },
    ],
  });

  assert.equal(composed.bpm, 136);
  assert.equal(composed.camera.zoom, 1.08);
  assert.equal(composed.objects[0].id, 'layer_title');
  assert.equal(composed.objects[0].transform.x, 640);
  assert.equal(composed.objects[0].startTime, 0.4);
  assert.equal(composed.objects[0].keyframes.opacity?.length, 1);
  assert.equal(composed.objects[1].id, 'layer_shape');
  assert.equal(composed.objects[1].behavior.spinSpeed, 30);
});

test('normalizeAiAssetBundle creates diverse bounded motion objects', () => {
  const bundle = normalizeAiAssetBundle(
    [
      { name: 'Wipe Beam', type: 'line', style: { strokeColor: '#22D3EE', strokeWidth: 14 } },
      { name: 'Kinetic Headline', type: 'text', textProps: { content: 'NEXT GEN', revealMode: 'scramble' } },
      { name: 'Custom Crest', type: 'path', shapeProps: { svgPath: 'M 10 10 L 90 50 L 10 90 Z' } },
    ],
    { width: 1920, height: 1080, duration: 6 },
  );

  assert.equal(bundle.length, 3);
  assert.equal(bundle[0].type, 'line');
  assert.equal(bundle[1].textProps.revealMode, 'scramble');
  assert.equal(bundle[2].type, 'path');
});
