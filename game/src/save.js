// Kota Raya — saving progress. Cash, the next mission and whether the story
// is done live in localStorage, so coming back later resumes where the last
// visit ended. Anything malformed or unavailable is treated as "no save".
import { SAVE_KEY } from './config.js';

function asNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function loadSave() {
  let parsed;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  return {
    cash: asNumber(parsed.cash, 0),
    missionIndex: asNumber(parsed.missionIndex, 0),
    storyDone: parsed.storyDone === true,
  };
}

export function saveGame(state) {
  const payload = {
    cash: state.cash,
    missionIndex: state.missionIndex,
    storyDone: state.storyDone,
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage may be unavailable (private mode, blocked cookies); ignore.
  }
}
