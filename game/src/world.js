// Kota Raya — dunia: merakit kota, lalu lintas, pejalan kaki, pemain,
// polisi, dan misi menjadi satu simulasi, lalu memajukannya satu langkah
// tetap dalam satu waktu. Ini satu-satunya modul yang tahu bagaimana
// sistem-sistem itu saling bersentuhan.
import { TRAFFIC_COUNT, PED_COUNT } from './config.js';
import { createRandom } from './random.js';
import { createRenderer3 } from './render.js';
import { createCity } from './city.js';
import { createTraffic, updateTraffic, createParkedCars, makeCar } from './vehicles.js';
import { createPedestrians, updatePedestrians, punchPedestrian } from './pedestrians.js';
import {
  createPlayer,
  stepPlayerOnFoot,
  stepPlayerInCar,
  enterCar,
  exitCar,
  spawnPlayerCar,
} from './player.js';
import { createWanted, raiseWanted, updateWanted, clearWanted } from './police.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { loadSave, saveGame } from './save.js';

export const STEP_SECONDS = 1 / 60;

// Sari, menunggu di taman untuk misi 2.
function buildSariNpc(scene) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b898 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xe86a9a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.62;
  group.add(head);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirt);
  body.position.y = 1.05;
  group.add(body);
  for (const x of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
    leg.position.set(x, 0.35, 0);
    group.add(leg);
  }
  group.position.set(-196, 0, -196);
  scene.add(group);
  return group;
}

export function createWorld(canvas, seed) {
  const rng = createRandom(seed);
  const renderer3 = createRenderer3(canvas);
  const scene = renderer3.scene;
  const city = createCity(scene, rng);
  const traffic = createTraffic(scene, rng, TRAFFIC_COUNT);
  const parked = createParkedCars(scene, rng, city.parkSpots);
  const peds = createPedestrians(scene, rng, PED_COUNT);
  const player = createPlayer(scene, 9, -175);
  const wanted = createWanted(scene);
  const audio = createAudio();
  const hud = createHud();

  // Kendaraan awal: sedan biru milik Raka, parkir tepat di depan titik
  // muncul supaya pemain langsung melihatnya saat game dimulai.
  const starterCar = spawnPlayerCar(scene, 0x2c6fd8, 7, -169, Math.PI);
  parked.push(starterCar);
  // Target misi: sedan merah yang parkir di pusat kota.
  const targetCar = spawnPlayerCar(scene, 0xd8382c, 70, -70, Math.PI / 2);
  targetCar.isTarget = true;
  parked.push(targetCar);

  const sariNpc = buildSariNpc(scene);

  const saved = loadSave();
  const world = {
    scene,
    renderer3,
    rng,
    city,
    traffic,
    parked,
    peds,
    player,
    wanted,
    audio,
    hud,
    targetCar,
    starterCar,
    sariNpc,
    cash: saved ? saved.cash : 0,
    missionIndex: saved ? saved.missionIndex : 0,
    storyDone: saved ? saved.storyDone : false,
    elapsed: 0,
    lastDamageAt: -99,
    ramCooldown: 0,
    hitCooldown: 0,
    busted: false,
    cameraYaw: Math.PI,
    missions: null,
  };

  world.toast = (text) => hud.showToast(text);
  world.showDialog = (line) => hud.showDialog(line);
  world.removeSariNpc = () => {
    if (world.sariNpc) {
      scene.remove(world.sariNpc);
      world.sariNpc = null;
    }
  };
  world.onMissionStart = (mission) => {
    hud.showBanner(mission.title);
    if (mission.id === 4) {
      raiseWanted(wanted, 3, 'mission-4-heat');
      audio.siren(true);
    }
  };
  world.onMissionComplete = (mission) => {
    if (mission.id === 3) clearWanted(wanted);
    if (mission.id === 4) clearWanted(wanted);
    world.missionIndex = world.missions.index;
    world.storyDone = world.missions.done;
    saveGame({ cash: world.cash, missionIndex: world.missionIndex, storyDone: world.storyDone });
  };
  world.onMissionFailed = (mission) => {
    audio.denied();
    hud.showToast(`Misi gagal: ${mission.title} — tekan Enter untuk coba lagi`);
  };

  world.missions = createMissions(scene, world);
  if (world.storyDone) {
    world.missions.index = world.missions.missions.length;
    world.missions.done = true;
  } else {
    world.missions.index = Math.min(world.missionIndex, world.missions.missions.length - 1);
  }

  // Mobil terdekat yang bisa dimasuki pemain, dalam jarak maxDist meter.
  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    const all = [...parked, ...traffic];
    for (const car of all) {
      if (car.taken) continue;
      const d = Math.hypot(car.mesh.position.x - player.x, car.mesh.position.z - player.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function handleEnter() {
    if (player.inCar) {
      exitCar(player, scene);
      return;
    }
    const car = nearestCar(5);
    if (!car) return;
    if (traffic.includes(car)) {
      // Mencuri mobil dari lalu lintas: sopirnya kabur, panasnya naik.
      const i = traffic.indexOf(car);
      traffic.splice(i, 1);
      car.speed = 0;
      car.heading = car.heading ?? 0;
      car.x = car.mesh.position.x;
      car.z = car.mesh.position.z;
      raiseWanted(wanted, 1, 'car-theft');
      world.toast('Mobil dicuri! Wanted +1');
      audio.siren(true);
    }
    enterCar(player, car, scene);
    audio.engineStart();
  }

  function handlePunch() {
    if (player.inCar || player.punchCooldown > 0) return;
    player.punchCooldown = 0.5;
    player.punchAnim = 0.35;
    const fx = player.x + Math.sin(player.heading) * 1.6;
    const fz = player.z + Math.cos(player.heading) * 1.6;
    const hit = punchPedestrian(peds, fx, fz, 2.4);
    if (hit) {
      audio.punch();
      raiseWanted(wanted, 1, 'assault');
      world.toast('Kamu memukul pejalan kaki! Wanted +1');
      audio.siren(true);
    }
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0) return;
    player.health = Math.max(0, player.health - amount);
    player.invulnerable = 0.8;
    world.lastDamageAt = world.elapsed;
    audio.thud();
  }

  function bustPlayer(reason) {
    const lost = Math.min(world.cash, Math.max(50, Math.floor(world.cash * 0.2)));
    world.cash -= lost;
    clearWanted(wanted);
    audio.siren(false);
    audio.busted();
    if (player.inCar) exitCar(player, scene);
    player.x = 9;
    player.z = -175;
    player.heading = 0;
    player.health = 100;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.visible = true;
    world.busted = reason;
    saveGame({ cash: world.cash, missionIndex: world.missions.index, storyDone: world.missions.done });
  }

  // Jaga mobil pemain tidak bertumpuk dengan mobil lain: dorong lalu lintas
  // ke samping, berhenti menabrak mobil parkir, dan kenakan kecepatan serta
  // nyawa pada benturan keras.
  function separatePlayerCar(dt) {
    if (!player.inCar || !player.car) return;
    for (const car of [...traffic, ...parked]) {
      if (car === player.car || car.taken) continue;
      const dx = car.mesh.position.x - player.car.x;
      const dz = car.mesh.position.z - player.car.z;
      const d = Math.hypot(dx, dz);
      if (d >= 4.6 || d <= 0.01) continue;
      const push = 4.6 - d;
      const nx = dx / d;
      const nz = dz / d;
      if (traffic.includes(car)) {
        car.mesh.position.x += nx * push;
        car.mesh.position.z += nz * push;
        car.speed = Math.max(car.speed, Math.abs(player.car.speed) * 0.7);
      } else {
        // Mobil parkir tidak bergerak: hentikan pemain sebagai gantinya.
        player.car.x -= nx * push;
        player.car.z -= nz * push;
        player.car.mesh.position.set(player.car.x, 0, player.car.z);
      }
      if (Math.abs(player.car.speed) > 5 && world.ramCooldown <= 0) {
        player.car.speed *= 0.6;
        damagePlayer(5);
        world.ramCooldown = 0.6;
      }
    }
    if (world.ramCooldown > 0) world.ramCooldown -= dt;
  }

  // Satu langkah tetap 1/60 detik dari game yang sedang berjalan. `actions`
  // adalah tekanan sekali-sentuh pada frame ini, yang sudah diambil pemanggil.
  // Mengembalikan 'busted' saat tertangkap.
  function step(dt, input, actions) {
    world.elapsed += dt;
    if (actions & 1) handleEnter(); // ACTION_ENTER
    if (actions & 2) handlePunch(); // ACTION_PUNCH
    if (actions & 8) audio.setMuted(!audio.isMuted()); // ACTION_MUTE

    // Arah kamera mengikuti arah hadap pemain saat menyetir; saat berjalan
    // kaki ia tetap bebas, supaya W selalu berjalan menjauhi kamera.
    const camYaw = player.inCar ? player.heading : renderer3.camState.yaw;
    if (player.inCar) {
      stepPlayerInCar(player, input, city.colliders, dt);
    } else {
      stepPlayerOnFoot(player, input, camYaw, city.colliders, dt);
    }

    // Lalu lintas menghindari mobil pemain dan polisi.
    const obstacles = [];
    if (player.inCar && player.car) obstacles.push({ x: player.car.x, z: player.car.z });
    for (const pc of wanted.police) obstacles.push({ x: pc.x, z: pc.z });
    updateTraffic(traffic, dt, obstacles);

    // Lalu lintas yang menabrak pemain saat berjalan kaki melukai.
    if (!player.inCar && world.hitCooldown <= 0) {
      for (const car of traffic) {
        const d = Math.hypot(car.mesh.position.x - player.x, car.mesh.position.z - player.z);
        if (d < 2.2 && Math.abs(car.speed) > 2) {
          damagePlayer(15);
          world.hitCooldown = 1;
          world.toast('Kamu tertabrak mobil!');
          break;
        }
      }
    }
    if (world.hitCooldown > 0) world.hitCooldown -= dt;

    separatePlayerCar(dt);

    // Pejalan kaki lari dari mobil pemain yang melaju kencang.
    const danger = player.inCar && player.car
      ? { x: player.car.x, z: player.car.z, speed: player.car.speed }
      : null;
    updatePedestrians(peds, dt, danger);

    // Polisi mengejar, menabrak, menangkap.
    const busted = updateWanted(wanted, dt, player, city.colliders, rng, () => {
      if (world.ramCooldown <= 0) {
        audio.thud();
        world.ramCooldown = 0.5;
      }
    });
    audio.siren(wanted.stars > 0);
    audio.sirenTick(dt);
    audio.engineSet(player.inCar ? Math.abs(player.car ? player.car.speed : 0) / 34 : 0, player.inCar);

    // Nyawa pulih setelah 5 detik tenang (tidak pernah membangkitkan pemain yang tertangkap).
    if (player.health > 0 && world.elapsed - world.lastDamageAt > 5 && player.health < 100) {
      player.health = Math.min(100, player.health + 3 * dt);
    }

    // Misi.
    world.missions.update(dt, world);

    if (busted === 'busted') {
      bustPlayer('caught');
      return 'busted';
    }
    if (player.health <= 0) {
      bustPlayer('wasted');
      return 'busted';
    }
    return null;
  }

  // Latar layar judul: lalu lintas dan pejalan kaki bergerak, tanpa kejahatan.
  function stepAmbient(dt) {
    world.elapsed += dt;
    updateTraffic(traffic, dt, []);
    updatePedestrians(peds, dt, null);
    world.missions.update(dt, world);
  }

  function hudState() {
    return {
      objective: world.missions.objectiveText(),
      cash: world.cash,
      stars: wanted.stars,
      health: player.health,
      speedKmh: player.inCar && player.car ? Math.abs(player.car.speed) * 3.6 : 0,
      inCar: player.inCar,
      playerX: player.x,
      playerZ: player.z,
      heading: player.heading,
      traffic,
      police: wanted.police,
      missionTarget: world.missions.currentTarget,
    };
  }

  function renderFrame(dt) {
    if (player.inCar) renderer3.follow(player.car, true, dt);
    else renderer3.follow(player, false, dt);
    hud.update(dt, hudState());
    renderer3.render();
  }

  return {
    world,
    step,
    stepAmbient,
    renderFrame,
    bustPlayer,
    renderer3,
    hud,
    audio,
    missions: world.missions,
  };
}
