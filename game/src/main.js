// Kota Raya — perangkaian game dan loop utama.
// Membaca parameter URL, membangun dunia, lalu menjalankan frame demi frame.
import { CFG } from './config.js';
import { createWorld } from './world.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createPlayer, updatePlayer, tryEnterExit } from './player.js';
import { createVehicles, updateTraffic, updateDrive } from './vehicles.js';
import { createPedestrians, updatePeds } from './pedestrians.js';
import { updatePolice } from './police.js';
import { createMissions, activateNext, updateMissions } from './missions.js';
import { createHud, updateHud } from './hud.js';
import { createRenderer, updateCamera } from './render.js';
import { createAudio } from './audio.js';
import { loadSave } from './save.js';
import { readShotParams, applyShot, updateShot } from './shots.js';

const params = readShotParams();
const world = createWorld(params.seed);
world.shotMode = params.shot;

const renderer = createRenderer(world);
buildCity(world);
createPlayer(world);
createVehicles(world);
createPedestrians(world);
createMissions(world);
const input = createInput();
const hud = createHud();
const audio = createAudio();

// Pulihkan simpanan bila ada.
const saved = loadSave();
if (saved) {
  world.cash = saved.cash;
  world.missions.index = saved.missionIndex;
  if (saved.missionIndex >= 3) {
    world.missions.active = { id: 4, stage: 0, title: CFG.missionNames[3] };
  }
  const sl = document.getElementById('save-line');
  if (sl) sl.textContent = `Save ditemukan — ${saved.missionIndex} misi selesai, Rp ${saved.cash}`;
}

const titleEl = document.getElementById('title-screen');
const hudEl = document.getElementById('hud');

function startGame() {
  if (world.started) return;
  world.started = true;
  titleEl.style.display = 'none';
  hudEl.style.display = 'block';
  audio.ensure();
}

applyShot(world, { startGame, tryEnterExit, input });
window.__kotaRaya = { world };

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  world.elapsed += dt;
  world.frames += 1;

  if (!world.started) {
    if (input.consume('Enter')) startGame();
  } else {
    if (input.consume('Enter')) activateNext(world);
    if (input.consume('KeyE')) tryEnterExit(world);
    updatePlayer(world, dt, input);
    updateDrive(world, dt, input);
    updateTraffic(world, dt);
    updatePeds(world, dt);
    updatePolice(world, dt);
    updateMissions(world, dt);
    updateHud(hud, world);
    const level = world.player.inCar && world.player.car
      ? Math.abs(world.player.car.speed) / CFG.carMaxSpeed
      : Math.abs(world.player.speed) / CFG.walkSpeed;
    audio.engine(level);
    audio.siren(world.wanted.stars > 0);
  }

  updateCamera(world, dt);
  updateShot(world);
  renderer.render(world.scene, world.camera);
  input.endFrame();
}
requestAnimationFrame(loop);
