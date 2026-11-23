export interface ShortcutItem {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: 'Playback & Timeline' | 'Editing & History' | 'Canvas & Precision' | 'Navigation & Help';
}

export const KEYBOARD_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'play-pause',
    keys: ['Space'],
    label: 'Play / Pause',
    description: 'Toggle timeline playback from current playhead position',
    category: 'Playback & Timeline',
  },
  {
    id: 'step-prev',
    keys: ['←'],
    label: 'Previous Frame',
    description: 'Pause playback and step backward by 1 frame',
    category: 'Playback & Timeline',
  },
  {
    id: 'step-next',
    keys: ['→'],
    label: 'Next Frame',
    description: 'Pause playback and step forward by 1 frame',
    category: 'Playback & Timeline',
  },
  {
    id: 'jump-frames',
    keys: ['Shift', '← / →'],
    label: 'Jump 10 Frames',
    description: 'Step 10 frames backward or forward along the timeline',
    category: 'Playback & Timeline',
  },
  {
    id: 'jump-start',
    keys: ['Home'],
    label: 'Jump to Start',
    description: 'Reset playhead cleanly to 00:00.00',
    category: 'Playback & Timeline',
  },
  {
    id: 'toggle-loop',
    keys: ['L'],
    label: 'Toggle Loop',
    description: 'Enable or disable continuous composition looping',
    category: 'Playback & Timeline',
  },
  {
    id: 'add-keyframe',
    keys: ['K'],
    label: 'Add Keyframe',
    description: 'Record transform & opacity keyframes for selected layer',
    category: 'Playback & Timeline',
  },
  {
    id: 'undo',
    keys: ['Ctrl', 'Z'],
    label: 'Undo',
    description: 'Revert the previous composition change (⌘+Z on macOS)',
    category: 'Editing & History',
  },
  {
    id: 'redo',
    keys: ['Ctrl', 'Y'],
    label: 'Redo',
    description: 'Reapply an undone edit (or Ctrl+Shift+Z)',
    category: 'Editing & History',
  },
  {
    id: 'duplicate-layer',
    keys: ['Ctrl', 'D'],
    label: 'Duplicate Layer',
    description: 'Clone the currently selected motion object with offset',
    category: 'Editing & History',
  },
  {
    id: 'quick-save',
    keys: ['Ctrl', 'S'],
    label: 'Quick Save',
    description: 'Immediately save composition snapshot to localStorage',
    category: 'Editing & History',
  },
  {
    id: 'delete-layer',
    keys: ['Del'],
    label: 'Delete Layer',
    description: 'Remove the selected object from the composition',
    category: 'Editing & History',
  },
  {
    id: 'bypass-snap',
    keys: ['Alt', 'Drag'],
    label: 'Bypass Smart Snap',
    description: 'Temporarily ignore center & sibling alignment guides while dragging',
    category: 'Canvas & Precision',
  },
  {
    id: 'toggle-cheat-sheet',
    keys: ['?'],
    label: 'Shortcuts Cheat Sheet',
    description: 'Open or close this keyboard reference modal',
    category: 'Navigation & Help',
  },
  {
    id: 'close-modal',
    keys: ['Esc'],
    label: 'Close Dialog',
    description: 'Dismiss the active modal or mobile menu overlay',
    category: 'Navigation & Help',
  },
];

export const SHORTCUT_CATEGORIES: ShortcutItem['category'][] = [
  'Playback & Timeline',
  'Editing & History',
  'Canvas & Precision',
  'Navigation & Help',
];

export function filterKeyboardShortcuts(
  query: string,
  items: ShortcutItem[] = KEYBOARD_SHORTCUTS,
): ShortcutItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => {
    const haystack = [
      item.label,
      item.description,
      item.category,
      item.keys.join(' '),
      item.keys.join('+'),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
