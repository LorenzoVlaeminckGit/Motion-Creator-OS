import type { MotionComposition } from '../types/motion';

export const COMP_STORAGE_KEY = 'kinetik_studio_active_comp_v1';
export const LAST_SAVED_STORAGE_KEY = 'kinetik_studio_last_saved_v1';
export const AUTOSAVE_INTERVAL_MS = 15_000;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function loadSavedTimestamp(storage?: StorageLike): number | null {
  try {
    const store = storage ?? window.localStorage;
    const raw = store.getItem(LAST_SAVED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCompositionSnapshot(
  composition: MotionComposition,
  nowMs: number = Date.now(),
  storage?: StorageLike,
): { saved: boolean; savedAt: number | null; serialized: string } {
  const serialized = JSON.stringify(composition);
  try {
    const store = storage ?? window.localStorage;
    store.setItem(COMP_STORAGE_KEY, serialized);
    store.setItem(LAST_SAVED_STORAGE_KEY, String(nowMs));
    return { saved: true, savedAt: nowMs, serialized };
  } catch {
    return { saved: false, savedAt: null, serialized };
  }
}

export function formatLastSavedStatus(
  lastSavedAt: number | null,
  nowMs: number,
  hasUnsavedChanges: boolean,
): string {
  if (lastSavedAt === null) {
    return hasUnsavedChanges ? 'Unsaved changes' : 'Not saved yet';
  }

  const diffSec = Math.max(0, Math.floor((nowMs - lastSavedAt) / 1000));
  let timeText: string;

  if (diffSec < 5) {
    timeText = 'just now';
  } else if (diffSec < 60) {
    timeText = `${diffSec}s ago`;
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    timeText = `${mins}m ago`;
  } else {
    const date = new Date(lastSavedAt);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    timeText = `${hh}:${mm}`;
  }

  if (hasUnsavedChanges) {
    return `Last saved ${timeText} (pending)`;
  }
  return `Last saved ${timeText}`;
}
