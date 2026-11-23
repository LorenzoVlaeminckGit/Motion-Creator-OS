import assert from 'node:assert/strict';
import test from 'node:test';
import { MOTION_TEMPLATES } from '../data/templates.ts';
import { createDefaultObject } from './motionEngine.ts';
import { computeSmartSnap } from './smartSnap.ts';

test('computeSmartSnap snaps dragged object to canvas vertical and horizontal centers', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const target = createDefaultObject('rect', comp, {
    id: 'drag_target',
    name: 'Dragged Box',
    transform: { x: 400, y: 300, width: 200, height: 100 },
  });
  comp.objects = [target];

  const snap = computeSmartSnap({
    draggedId: target.id,
    rawX: comp.width / 2 + 8,
    rawY: comp.height / 2 - 10,
    draggedWidth: 200,
    draggedHeight: 100,
    composition: comp,
    currentTime: 1.5,
    threshold: 16,
  });

  assert.equal(snap.snappedX, true);
  assert.equal(snap.snappedY, true);
  assert.equal(snap.x, comp.width / 2);
  assert.equal(snap.y, comp.height / 2);
  assert.equal(snap.guides.length, 2);
  assert.equal(snap.guides[0].kind, 'canvas-center');
  assert.equal(snap.guides[1].kind, 'canvas-center');
});

test('computeSmartSnap aligns with sibling object centers and edges outside canvas center', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const anchor = createDefaultObject('rect', comp, {
    id: 'anchor_layer',
    name: 'Anchor Card',
    transform: { x: 420, y: 260, width: 240, height: 120 },
  });
  const dragged = createDefaultObject('rect', comp, {
    id: 'drag_layer',
    name: 'Dragged Pill',
    transform: { x: 700, y: 500, width: 160, height: 80 },
  });
  comp.objects = [anchor, dragged];

  // Drag near anchor's X center (420) and anchor's bottom edge (260 + 60 = 320 -> dragged center y = 320 - 40 = 280)
  const snap = computeSmartSnap({
    draggedId: dragged.id,
    rawX: 426,
    rawY: 285,
    draggedWidth: 160,
    draggedHeight: 80,
    composition: comp,
    currentTime: 1.5,
    threshold: 16,
  });

  assert.equal(snap.snappedX, true);
  assert.equal(snap.x, 420);
  assert.equal(snap.guides.find((g) => g.axis === 'x')?.kind, 'object-center');

  assert.equal(snap.snappedY, true);
  assert.equal(snap.y, 280);
  assert.equal(snap.guides.find((g) => g.axis === 'y')?.kind, 'object-edge');
});

test('computeSmartSnap returns raw rounded coordinates when beyond threshold', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const target = createDefaultObject('circle', comp, {
    id: 'free_circle',
    transform: { x: 311, y: 217, width: 120, height: 120 },
  });
  comp.objects = [target];

  const snap = computeSmartSnap({
    draggedId: target.id,
    rawX: 311.4,
    rawY: 217.8,
    draggedWidth: 120,
    draggedHeight: 120,
    composition: comp,
    currentTime: 1.5,
    threshold: 16,
  });

  assert.equal(snap.snappedX, false);
  assert.equal(snap.snappedY, false);
  assert.equal(snap.x, 311);
  assert.equal(snap.y, 218);
  assert.equal(snap.guides.length, 0);
});

test('computeSmartSnap respects enableCanvasCenter, enableObjectCenter, and enableObjectEdge flags', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const anchor = createDefaultObject('rect', comp, {
    id: 'anchor_layer',
    name: 'Anchor',
    transform: { x: 420, y: 260, width: 240, height: 120 },
  });
  const dragged = createDefaultObject('rect', comp, {
    id: 'drag_layer',
    name: 'Dragged',
    transform: { x: 700, y: 500, width: 160, height: 80 },
  });
  comp.objects = [anchor, dragged];

  // Disable edge alignment -> X still snaps to object-center (420), Y does not snap to edge (280)
  const centerOnly = computeSmartSnap({
    draggedId: dragged.id,
    rawX: 426,
    rawY: 285,
    draggedWidth: 160,
    draggedHeight: 80,
    composition: comp,
    currentTime: 1.5,
    threshold: 16,
    enableCanvasCenter: false,
    enableObjectCenter: true,
    enableObjectEdge: false,
  });

  assert.equal(centerOnly.snappedX, true);
  assert.equal(centerOnly.x, 420);
  assert.equal(centerOnly.snappedY, false);
  assert.equal(centerOnly.y, 285);

  // Disable center alignment -> Y snaps to object-edge (280), X stays unsnapped
  const edgeOnly = computeSmartSnap({
    draggedId: dragged.id,
    rawX: 426,
    rawY: 285,
    draggedWidth: 160,
    draggedHeight: 80,
    composition: comp,
    currentTime: 1.5,
    threshold: 16,
    enableCanvasCenter: false,
    enableObjectCenter: false,
    enableObjectEdge: true,
  });

  assert.equal(edgeOnly.snappedX, false);
  assert.equal(edgeOnly.snappedY, true);
  assert.equal(edgeOnly.y, 280);
});

test('computeSmartSnap adjusts sensitivity dynamically via threshold', () => {
  const comp = MOTION_TEMPLATES[0].build();
  const target = createDefaultObject('rect', comp, {
    id: 'drag_target',
    transform: { x: 500, y: 400, width: 100, height: 100 },
  });
  comp.objects = [target];

  const fine = computeSmartSnap({
    draggedId: target.id,
    rawX: comp.width / 2 + 20,
    rawY: comp.height / 2,
    draggedWidth: 100,
    draggedHeight: 100,
    composition: comp,
    currentTime: 1.5,
    threshold: 6,
  });
  assert.equal(fine.snappedX, false);

  const strong = computeSmartSnap({
    draggedId: target.id,
    rawX: comp.width / 2 + 20,
    rawY: comp.height / 2,
    draggedWidth: 100,
    draggedHeight: 100,
    composition: comp,
    currentTime: 1.5,
    threshold: 28,
  });
  assert.equal(strong.snappedX, true);
  assert.equal(strong.x, comp.width / 2);
});

