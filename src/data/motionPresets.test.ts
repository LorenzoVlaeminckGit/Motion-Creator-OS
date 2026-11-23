import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultObject, evaluateObjectState } from '../engine/motionEngine.ts';
import { MOTION_TEMPLATES } from './templates.ts';
import {
  applyMotionPresetToObject,
  buildPresetSparklinePoints,
  MOTION_PRESETS,
} from './motionPresets.ts';

test('MOTION_PRESETS contains Bounce, Elastic, and Spring presets with valid sparklines', () => {
  const names = MOTION_PRESETS.map((p) => p.name);
  assert.ok(names.includes('Bounce'));
  assert.ok(names.includes('Elastic'));
  assert.ok(names.includes('Spring'));

  for (const preset of MOTION_PRESETS) {
    const pts = buildPresetSparklinePoints(preset.easing);
    assert.ok(pts.split(' ').length >= 10, `Expected sparkline points for ${preset.id}`);
  }
});

test('applyMotionPresetToObject configures keyframes and reaches resting transform cleanly', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const obj = createDefaultObject('rect', comp, {
    id: 'preset_rect',
    transform: { x: 820, y: 460, scaleX: 1.2, scaleY: 1.2, rotation: 15, opacity: 0.9 },
  });

  const bounced = applyMotionPresetToObject(obj, 'bounce', comp.duration);
  assert.equal(bounced.behavior.entrancePreset, 'none');
  assert.ok(bounced.keyframes.y && bounced.keyframes.y.length === 2);
  assert.equal(bounced.keyframes.y[1].easing, 'bounceOut');
  assert.equal(bounced.keyframes.y[1].value, 460);

  const elastic = applyMotionPresetToObject(obj, 'elastic', comp.duration);
  assert.ok(elastic.keyframes.scaleX && elastic.keyframes.scaleX[1].easing === 'springElastic');
  const endState = evaluateObjectState(elastic, 3.0, comp);
  assert.ok(Math.abs(endState.scaleX - 1.2) < 0.01);
  assert.ok(Math.abs(endState.rotation - 15) < 0.01);

  const spring = applyMotionPresetToObject(obj, 'spring', comp.duration);
  assert.ok(spring.keyframes.x && spring.keyframes.x[1].easing === 'easeOutBack');
  assert.equal(spring.keyframes.x[1].value, 820);
});
