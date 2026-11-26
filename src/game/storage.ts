import { SaveProgress } from './types';

const STORAGE_KEY = 'inkpath_progress_v1';

const DEFAULT_PROGRESS: SaveProgress = {
  completed: {},
  dailyCompleted: {},
  lastLevelId: 1,
  muted: false,
  equippedTitleId: null,
};

export function loadProgress(): SaveProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    return {
      completed: parsed.completed ?? {},
      dailyCompleted: parsed.dailyCompleted ?? {},
      lastLevelId: typeof parsed.lastLevelId === 'number' ? parsed.lastLevelId : 1,
      muted: Boolean(parsed.muted),
      equippedTitleId: typeof parsed.equippedTitleId === 'string' ? parsed.equippedTitleId : null,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: SaveProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
