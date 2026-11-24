// Kota Raya — simpanan progres di localStorage.
// Kunci 'kotaraya-save-v1' berisi { missionIndex, cash }.
import { CFG } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.missionIndex !== 'number' || typeof d.cash !== 'number') return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function writeSave(world) {
  try {
    window.localStorage.setItem(
      CFG.saveKey,
      JSON.stringify({ missionIndex: world.missions.index, cash: world.cash }),
    );
  } catch (e) {
    /* penyimpanan tidak tersedia */
  }
}
