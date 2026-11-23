import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEYBOARD_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  filterKeyboardShortcuts,
} from './keyboardShortcuts.ts';

test('KEYBOARD_SHORTCUTS includes core shortcuts (Ctrl+Z, Ctrl+Y, Space) with valid categories', () => {
  const ids = new Set<string>();
  for (const shortcut of KEYBOARD_SHORTCUTS) {
    assert.ok(shortcut.id.length > 0);
    assert.ok(!ids.has(shortcut.id), `Duplicate shortcut id: ${shortcut.id}`);
    ids.add(shortcut.id);
    assert.ok(shortcut.keys.length > 0);
    assert.ok(SHORTCUT_CATEGORIES.includes(shortcut.category));
  }

  const undo = KEYBOARD_SHORTCUTS.find((s) => s.id === 'undo');
  const redo = KEYBOARD_SHORTCUTS.find((s) => s.id === 'redo');
  const space = KEYBOARD_SHORTCUTS.find((s) => s.id === 'play-pause');

  assert.deepEqual(undo?.keys, ['Ctrl', 'Z']);
  assert.deepEqual(redo?.keys, ['Ctrl', 'Y']);
  assert.deepEqual(space?.keys, ['Space']);
});

test('filterKeyboardShortcuts matches by key combination, label, and description', () => {
  assert.equal(filterKeyboardShortcuts('').length, KEYBOARD_SHORTCUTS.length);

  const ctrlZ = filterKeyboardShortcuts('Ctrl+Z');
  assert.equal(ctrlZ.length, 1);
  assert.equal(ctrlZ[0].id, 'undo');

  const space = filterKeyboardShortcuts('space');
  assert.ok(space.some((s) => s.id === 'play-pause'));

  const none = filterKeyboardShortcuts('nonexistent-shortcut-xyz');
  assert.equal(none.length, 0);
});
