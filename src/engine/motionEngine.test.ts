import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEasing, lerp } from './easing';
import {
  createDefaultObject,
  evaluateObjectState,
  getTextScramble,
  interpolateKeyframes,
  removeKeyframe,
  seededRandom,
  upsertKeyframe,
} from './motionEngine';

const TEST_COMP = { width: 1920, height: 1080, duration: 6, bpm: 120 };

test('easing functions hit boundary endpoints 0 and 1', () => {
  const easings = [
    'linear',
    'easeInQuad',
    'easeOutQuad',
    'easeInOutCubic',
    'easeOutBack',
    'easeOutExpo',
    'springElastic',
    'bounceOut',
  ] as const;

  for (const ease of easings) {
    assert.ok(Math.abs(applyEasing(0, ease) - 0) < 0.01, `${ease} at 0`);
    assert.ok(Math.abs(applyEasing(1, ease) - 1) < 0.01, `${ease} at 1`);
  }
  assert.equal(lerp(100, 200, 0.5), 150);
});

test('interpolateKeyframes clamps outside bounds and eases between keyframes', () => {
  const kfs = [
    { id: 'k1', time: 1, value: 100, easing: 'linear' as const },
    { id: 'k2', time: 3, value: 500, easing: 'linear' as const },
  ];

  assert.equal(interpolateKeyframes(kfs, 0.5, 0), 100);
  assert.equal(interpolateKeyframes(kfs, 2, 0), 300);
  assert.equal(interpolateKeyframes(kfs, 4, 0), 500);
  assert.equal(interpolateKeyframes([], 2, 42), 42);
});

test('upsertKeyframe and removeKeyframe maintain sorted keyframe tracks', () => {
  let obj = createDefaultObject('circle', TEST_COMP);
  obj = upsertKeyframe(obj, 'x', 2.5, 900, 'easeOutExpo');
  obj = upsertKeyframe(obj, 'x', 0.5, 300, 'linear');
  obj = upsertKeyframe(obj, 'x', 2.5, 960, 'easeOutBack');

  const track = obj.keyframes.x!;
  assert.equal(track.length, 2);
  assert.equal(track[0].time, 0.5);
  assert.equal(track[1].time, 2.5);
  assert.equal(track[1].value, 960);

  obj = removeKeyframe(obj, 'x', track[0].id);
  assert.equal(obj.keyframes.x?.length, 1);
  obj = removeKeyframe(obj, 'x', track[1].id);
  assert.equal(obj.keyframes.x, undefined);
});

test('evaluateObjectState combines entrance, spin, oscillation, and active window', () => {
  const obj = createDefaultObject('ring', TEST_COMP, {
    startTime: 1,
    endTime: 4,
    behavior: {
      entrancePreset: 'fade',
      entranceDuration: 0.5,
      exitPreset: 'fade',
      exitDuration: 0.5,
      oscillateX: { amp: 20, freq: 1, phase: 0 },
      oscillateY: { amp: 0, freq: 0.5, phase: 0 },
      spinSpeed: 90,
      pulseAmp: 0,
      pulseFreq: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
    },
  });

  const before = evaluateObjectState(obj, 0.5, TEST_COMP);
  assert.equal(before.isActive, false);

  const mid = evaluateObjectState(obj, 2.25, TEST_COMP);
  assert.equal(mid.isActive, true);
  assert.equal(mid.opacity, 1);
  assert.ok(Math.abs(mid.rotation - 1.25 * 90) < 0.001);
  // 1.25s * 1Hz -> sin(2.5*PI) = 1 -> +20px
  assert.ok(Math.abs(mid.x - (960 + 20)) < 0.001);

  const after = evaluateObjectState(obj, 4.5, TEST_COMP);
  assert.equal(after.isActive, false);
});

test('seededRandom and getTextScramble are deterministic', () => {
  assert.equal(seededRandom(42), seededRandom(42));
  assert.ok(seededRandom(42) >= 0 && seededRandom(42) < 1);
  assert.equal(getTextScramble('HELLO WORLD', 1), 'HELLO WORLD');
  assert.equal(getTextScramble('HELLO', 0.4, 7), getTextScramble('HELLO', 0.4, 7));
});
