// Kota Raya — menyimpan progres. Uang, misi berikutnya, dan apakah cerita
// sudah selesai tinggal di localStorage, jadi kembali lagi nanti berarti
// lanjut dari tempat kunjungan terakhir berhenti. Apa pun yang rusak atau
// tidak tersedia dianggap "tidak ada save".
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
    // Penyimpanan bisa tidak tersedia (mode privat, cookie diblokir); abaikan.
  }
}
