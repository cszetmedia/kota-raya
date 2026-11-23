// Kota Raya — sistem wanted. Kejahatan menaikkan bintang; mobil polisi
// muncul dari tepi kota, mengejar pemain, menabrak mobil pemain, dan
// menangkap pemain yang berjalan kaki bila mereka cukup lama berdekatan.
// Bersembunyi dan panasnya perlahan mereda.
//
// Urutan undian saat memunculkan polisi (koin tepi, koin sumbu, lalu satu
// undian offset) adalah bagian dari kota ber-seed: jaga urutan ini.
import { POLICE_TUNING, WORLD } from './config.js';
import { makeCar } from './vehicles.js';
import { resolveCollisions, clampToCity } from './city.js';

export function createWanted(scene) {
  return {
    stars: 0,
    heat: 0, // detik sejak kejahatan terakhir
    decayTimer: 0,
    police: [], // {mesh, x, z, heading, speed}
    bustTimer: 0,
    flash: 0,
    scene,
  };
}

export function raiseWanted(wanted, amount, reason) {
  wanted.stars = Math.min(POLICE_TUNING.maxStars, wanted.stars + amount);
  wanted.heat = 0;
  wanted.decayTimer = 0;
  return reason;
}

// Datangkan satu mobil polisi di jalan tepi kota, kira-kira ke arah pemain.
function spawnPoliceCar(wanted, rng, nearX, nearZ) {
  const mesh = makeCar(0xf2f2f2, true);
  const edge = rng() < 0.5 ? -1 : 1;
  const horizontal = rng() < 0.5;
  let x;
  let z;
  if (horizontal) {
    x = edge * 230;
    z = Math.max(-230, Math.min(230, nearZ + (rng() - 0.5) * 80));
  } else {
    x = Math.max(-230, Math.min(230, nearX + (rng() - 0.5) * 80));
    z = edge * 230;
  }
  mesh.position.set(x, 0, z);
  wanted.scene.add(mesh);
  const car = { mesh, x, z, heading: 0, speed: 0 };
  wanted.police.push(car);
  return car;
}

function removePoliceCar(wanted, car) {
  wanted.scene.remove(car.mesh);
  const i = wanted.police.indexOf(car);
  if (i >= 0) wanted.police.splice(i, 1);
}

// Belokan bertanda terpendek dari satu arah hadap ke arah hadap lain.
function turnTowards(heading, target, maxStep) {
  let diff = target - heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return heading + Math.max(-maxStep, Math.min(maxStep, diff));
}

// Update pengejaran. Mengembalikan 'busted' saat polisi menangkap pemain
// yang berjalan kaki, atau null. `onRam` berjalan saat mobil polisi
// menabrak mobil pemain.
export function updateWanted(wanted, dt, player, colliders, rng, onRam) {
  const desired = wanted.stars === 0 ? 0 : Math.min(POLICE_TUNING.maxCars, wanted.stars + 1);
  while (wanted.police.length < desired) {
    spawnPoliceCar(wanted, rng, player.x, player.z);
  }
  while (wanted.police.length > desired) {
    removePoliceCar(wanted, wanted.police[wanted.police.length - 1]);
  }

  // Kedipkan palang lampu.
  wanted.flash += dt;
  const flashOn = Math.floor(wanted.flash * 4) % 2 === 0;
  for (const car of wanted.police) {
    const red = car.mesh.getObjectByName('lightRed');
    const blue = car.mesh.getObjectByName('lightBlue');
    if (red) red.material.emissive.setHex(flashOn ? 0xff0000 : 0x220000);
    if (blue) blue.material.emissive.setHex(flashOn ? 0x000022 : 0x0022ff);
  }

  // Wanted mereda: lama tanpa kejahatan dan tidak ada polisi di dekat.
  wanted.heat += dt;
  if (wanted.stars > 0 && wanted.heat > POLICE_TUNING.decayDelay) {
    let nearest = Infinity;
    for (const car of wanted.police) {
      nearest = Math.min(nearest, Math.hypot(car.x - player.x, car.z - player.z));
    }
    if (nearest > 45) {
      wanted.decayTimer += dt;
      if (wanted.decayTimer >= POLICE_TUNING.decayInterval) {
        wanted.decayTimer = 0;
        wanted.stars = Math.max(0, wanted.stars - 1);
      }
    } else {
      wanted.decayTimer = 0;
    }
  }

  // Kejar-kejaran: setir ke arah pemain, dorong keluar dari gedung, tabrak saat bersentuhan.
  let busted = false;
  for (const car of wanted.police) {
    const dx = player.x - car.x;
    const dz = player.z - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    car.heading = turnTowards(car.heading, Math.atan2(dx, dz), 2.4 * dt);
    const speedTarget = dist > 60 ? POLICE_TUNING.chaseSpeed : POLICE_TUNING.chaseSpeed * 0.85;
    car.speed += (speedTarget - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const clamped = clampToCity(car.x, car.z);
    const resolved = resolveCollisions(colliders, clamped.x, clamped.z, 1.6);
    car.x = resolved.x;
    car.z = resolved.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;

    if (player.inCar) {
      if (dist < 3.4) {
        // Tabrakan: dorong mobil pemain dan perlambat lajunya.
        if (player.car) {
          player.car.speed *= 0.55;
          player.car.x += (dx / dist) * 0.6;
          player.car.z += (dz / dist) * 0.6;
        }
        player.health = Math.max(0, player.health - 12 * dt * 4);
        if (onRam) onRam();
      }
    } else if (dist < POLICE_TUNING.bustDistance) {
      wanted.bustTimer += dt;
      if (wanted.bustTimer >= POLICE_TUNING.bustTime) {
        busted = true;
        wanted.bustTimer = 0;
      }
    } else {
      wanted.bustTimer = Math.max(0, wanted.bustTimer - dt * 2);
    }
  }
  if (wanted.police.length === 0) wanted.bustTimer = 0;
  return busted ? 'busted' : null;
}

export function clearWanted(wanted) {
  wanted.stars = 0;
  wanted.heat = 0;
  wanted.decayTimer = 0;
  wanted.bustTimer = 0;
  while (wanted.police.length > 0) removePoliceCar(wanted, wanted.police[0]);
}
