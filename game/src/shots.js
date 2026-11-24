// Kota Raya — mode foto: ?shot=start|drive|chase|mission.
// Menyiapkan adegan lalu memberi tahu lewat window.__shotReady saat siap difoto.
import { CFG } from './config.js';

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const seedRaw = q.get('seed');
  return {
    shot: q.get('shot'),
    seed: seedRaw !== null && seedRaw !== '' ? parseInt(seedRaw, 10) : CFG.seedDefault,
  };
}

// helpers: { startGame, tryEnterExit, input }
export function applyShot(world, helpers) {
  const mode = world.shotMode;
  if (!mode) return;
  world.shotT0 = world.elapsed;
  if (mode === 'start') return; // layar judul tetap tampil, kamera sinematik

  helpers.startGame();
  const putPlayerBeside = (car) => {
    world.player.x = car.x + 1;
    world.player.z = car.z + 1;
    world.player.mesh.position.set(world.player.x, 0, world.player.z);
  };

  if (mode === 'drive') {
    putPlayerBeside(world.starterCar);
    helpers.tryEnterExit(world);
    helpers.input.auto.forward = true;
  } else if (mode === 'chase') {
    putPlayerBeside(world.starterCar);
    helpers.tryEnterExit(world);
    world.wanted.stars = 3;
    world.wanted.lastCrimeAt = world.elapsed;
    helpers.input.auto.forward = true;
  } else if (mode === 'mission') {
    world.missions.index = 2;
    world.cash = 350;
    world.missions.active = { id: 3, stage: 1, title: CFG.missionNames[2] };
    // Sedan merah sudah dekat bengkel, suar emas menyala di tujuan.
    world.targetCar.x = -180;
    world.targetCar.z = 150;
    world.targetCar.heading = Math.atan2(CFG.bengkel.x - -180, CFG.bengkel.z - 150);
    world.targetCar.mesh.position.set(world.targetCar.x, 0, world.targetCar.z);
    world.targetCar.mesh.rotation.y = world.targetCar.heading;
    putPlayerBeside(world.targetCar);
    helpers.tryEnterExit(world);
    helpers.input.auto.forward = true;
  }
}

// Dipanggil tiap frame; menandai siap setelah adegan berjalan sebentar.
// Mode chase difoto lebih cepat (0,7 detik) supaya polisi masih di depan kamera.
export function updateShot(world) {
  if (!world.shotMode || world.shotReady) return;
  const need = world.shotMode === 'start' ? 0.8 : world.shotMode === 'chase' ? 0.7 : 1.2;
  if (world.elapsed - world.shotT0 > need && world.frames > 2) {
    world.shotReady = true;
    window.__shotReady = true;
  }
}
