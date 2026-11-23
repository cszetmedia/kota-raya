// Kota Raya — adegan screenshot di balik ?shot=start|drive|chase|mission.
// Masing-masing memainkan aturan asli ke depan dari dunia baru selama
// beberapa detik dengan autopilot sederhana, jadi framenya adalah tampilan
// game sungguhan yang singkat, dan seed yang sama selalu menghasilkan
// frame yang sama. Mengatur window.__shotReady saat adegan sudah
// digambar, yang ditunggu oleh skrip screenshot.
import { raiseWanted } from './police.js';
import { enterCar } from './player.js';

const STEP = 1 / 60;

// Input palsu yang tetap: throttle dan setir konstan, tanpa tekanan sekali.
function fakeInput(throttle, steer) {
  return {
    throttle: () => throttle,
    steer: () => steer,
    sprint: () => false,
    brake: () => false,
    takeActions: () => 0,
  };
}

function idleInput() {
  return fakeInput(0, 0);
}

function driveInput() {
  return fakeInput(1, 0);
}

// Majukan dunia sejumlah langkah tetap dengan input yang diberikan.
function runSteps(game, count, input) {
  for (let i = 0; i < count; i += 1) game.step(STEP, input, 0);
}

// Tempatkan Raka di mobil starter pada satu titik, sudah melaju.
function placeInCar(world, x, z, speed) {
  const car = world.starterCar;
  const player = world.player;
  player.x = x;
  player.z = z;
  car.x = x;
  car.z = z;
  car.heading = 0;
  car.speed = speed;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = 0;
  enterCar(player, car, world.scene);
}

// Tata `game` ke adegan yang dinamai lalu gambar. Mengembalikan nama layar.
export function stageShot(name, game) {
  const { world } = game;
  const player = world.player;
  const missions = world.missions;

  if (name === 'drive') {
    // Raka menyetir sedan birunya menyusuri jalan timur, lalu lintas di sekitarnya.
    placeInCar(world, 70, -140, 18);
    runSteps(game, 150, driveInput());
    game.renderer3.snap(player.car, true);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  if (name === 'chase') {
    // Wanted level 3: tiga mobil polisi memburu sedan Raka di jalan.
    placeInCar(world, 70, -60, 24);
    raiseWanted(world.wanted, 3, 'shot-chase');
    world.audio.siren(true);
    runSteps(game, 210, driveInput());
    // Penghalang jalan: satu mobil polisi di depan, datang ke arah pemain,
    // supaya kejar-kejaran terbaca dalam satu frame, bukan tersembunyi di
    // belakang kamera.
    const blocker = world.wanted.police[0];
    if (blocker) {
      blocker.x = player.x - 6;
      blocker.z = player.z + 26;
      blocker.heading = player.heading + Math.PI;
      blocker.speed = 12;
      blocker.mesh.position.set(blocker.x, 0, blocker.z);
      blocker.mesh.rotation.y = blocker.heading;
    }
    game.renderer3.snap(player.car, true);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  if (name === 'mission') {
    // Misi 3, "Mobil Pesanan": Raka berjalan kaki di dekat sedan merah di
    // pusat kota, beacon kuning menandainya, untuk sementara tanpa polisi.
    missions.startMission(2);
    player.x = 58;
    player.z = -58;
    // Menghadap sedan merah yang terparkir di pusat kota (timur laut pemain).
    player.heading = Math.PI * 3 / 4;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    runSteps(game, 90, idleInput());
    game.renderer3.snap(player, false);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  // Default: start — orbit pelan di atas pusat kota di balik layar judul.
  for (let i = 0; i < 120; i += 1) game.stepAmbient(STEP);
  game.renderer3.orbit(9);
  game.renderer3.render();
  window.__shotReady = true;
  return 'title';
}
