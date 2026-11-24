// Kota Raya — Raka berjalan kaki, naik/turun mobil, dan mencuri mobil.
// Mencuri mobil orang = wanted naik; sedan merah saat misi 3 = +2 bintang lagi.
import { CFG } from './config.js';
import { clamp, dist, blocked, addWanted } from './world.js';

export function createPlayer(world) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1.15, 8),
    new THREE.MeshLambertMaterial({ color: 0x2e86c1 }),
  );
  body.position.y = 0.85;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
  );
  head.position.y = 1.7;
  g.add(body, head);
  g.position.set(world.player.x, 0, world.player.z);
  g.rotation.y = world.player.heading;
  world.scene.add(g);
  world.player.mesh = g;
}

export function updatePlayer(world, dt, input) {
  const p = world.player;
  if (p.inCar) return;
  const turn = (input.left() ? 1 : 0) - (input.right() ? 1 : 0);
  p.heading += turn * 2.2 * dt;
  let move = 0;
  if (input.forward()) move = CFG.walkSpeed;
  else if (input.back()) move = -CFG.walkSpeed * 0.6;
  p.speed = move;
  if (move !== 0) {
    const nx = p.x + Math.sin(p.heading) * move * dt;
    const nz = p.z + Math.cos(p.heading) * move * dt;
    if (!blocked(world, nx, nz, 0.8)) {
      p.x = clamp(nx, -CFG.bound, CFG.bound);
      p.z = clamp(nz, -CFG.bound, CFG.bound);
    }
  }
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}

function nearestCar(world, maxDist) {
  const p = world.player;
  const cands = [world.starterCar, world.targetCar, ...world.parked, ...world.traffic];
  let best = null;
  let bestD = maxDist;
  for (const c of cands) {
    const d = dist(p.x, p.z, c.x, c.z);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function tryEnterExit(world) {
  const p = world.player;
  if (p.inCar) {
    const car = p.car;
    car.speed = 0;
    // Turun di sisi mobil.
    p.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
    p.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
    p.heading = car.heading;
    p.inCar = false;
    p.car = null;
    p.carMesh = null;
    p.speed = 0;
    p.mesh.visible = true;
    p.mesh.position.set(p.x, 0, p.z);
    return;
  }
  const car = nearestCar(world, CFG.enterRadius);
  if (!car) return;
  p.inCar = true;
  p.car = car;
  p.carMesh = car.mesh;
  p.speed = 0;
  p.mesh.visible = false;
  if (car.kind === 'traffic' || car.kind === 'parked') {
    addWanted(world, 1);
  } else if (car.kind === 'target') {
    addWanted(world, 1);
    const m = world.missions.active;
    if (m && m.id === 3 && m.stage === 0) {
      addWanted(world, 2);
      m.stage = 1;
    }
  }
}
