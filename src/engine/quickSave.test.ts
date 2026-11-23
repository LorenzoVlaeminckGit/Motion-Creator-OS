import assert from 'node:assert/strict';
import test from 'node:test';
import { MOTION_TEMPLATES } from '../data/templates.ts';
import {
  COMP_STORAGE_KEY,
  LAST_SAVED_STORAGE_KEY,
  formatLastSavedStatus,
  loadSavedTimestamp,
  saveCompositionSnapshot,
  type StorageLike,
} from './quickSave.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

test('saveCompositionSnapshot persists composition JSON and timestamp to storage', () => {
  const storage = createMemoryStorage();
  const comp = MOTION_TEMPLATES[0].build();
  const now = 1_760_000_000_000;

  const res = saveCompositionSnapshot(comp, now, storage);
  assert.equal(res.saved, true);
  assert.equal(res.savedAt, now);

  const storedComp = JSON.parse(storage.getItem(COMP_STORAGE_KEY) || '{}');
  assert.equal(storedComp.name, comp.name);
  assert.equal(loadSavedTimestamp(storage), now);
  assert.equal(storage.getItem(LAST_SAVED_STORAGE_KEY), String(now));
});

test('formatLastSavedStatus renders clean relative timestamps and pending state', () => {
  const base = 1_760_000_000_000;
  assert.equal(formatLastSavedStatus(null, base, false), 'Not saved yet');
  assert.equal(formatLastSavedStatus(null, base, true), 'Unsaved changes');
  assert.equal(formatLastSavedStatus(base, base + 2000, false), 'Last saved just now');
  assert.equal(formatLastSavedStatus(base, base + 18_000, false), 'Last saved 18s ago');
  assert.equal(formatLastSavedStatus(base, base + 180_000, false), 'Last saved 3m ago');
  assert.equal(
    formatLastSavedStatus(base, base + 12_000, true),
    'Last saved 12s ago (pending)',
  );
});
