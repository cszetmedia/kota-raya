// Kota Raya — pedestrians: simple walkers on the sidewalks who stroll their
// block, flee from a speeding car, and fall over when punched. Hitting one
// with a car or a fist is a crime the wanted system notices.
import { WORLD } from './config.js';
import { pick, range } from './random.js';

const SHIRT_COLORS = [0xe86a6a, 0x6aa8e8, 0x6ae8a0, 0xf2d24b, 0xd86ad8, 0x8ad8e8, 0xe8e8e8];
const SKIN_COLORS = [0xc89878, 0x8a5a3a, 0xe8b898, 0x6a4530];

function makePed(rng) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, SKIN_COLORS) });
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRT_COLORS) });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.62;
  group.add(head);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirt);
  body.position.y = 1.05;
  group.add(body);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legL.position.set(-0.14, 0.35, 0);
  legL.name = 'legL';
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legR.position.set(0.14, 0.35, 0);
  legR.name = 'legR';
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), shirt);
  armL.position.set(-0.38, 1.05, 0);
  armL.name = 'armL';
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), shirt);
  armR.position.set(0.38, 1.05, 0);
  armR.name = 'armR';
  group.add(armR);
  return group;
}

export function createPedestrians(scene, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePed(rng);
    // Walk along a sidewalk edge of a random block.
    const roadX = pick(rng, WORLD.roads);
    const roadZ = pick(rng, WORLD.roads);
    const horizontal = rng() < 0.5;
    const lane = (rng() < 0.5 ? -1 : 1) * (WORLD.roadWidth / 2 + 2.5);
    const start = range(rng, -200, 200);
    const ped = {
      mesh,
      horizontal,
      fixed: horizontal ? roadZ + lane : roadX + lane,
      pos: start,
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.1, 2.0),
      phase: rng() * Math.PI * 2,
      down: 0, // seconds spent knocked down
      flee: 0, // seconds spent fleeing
    };
    mesh.position.set(horizontal ? start : roadX + lane, 0, horizontal ? roadZ + lane : start);
    mesh.rotation.y = horizontal ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : ped.dir > 0 ? 0 : Math.PI;
    scene.add(mesh);
    peds.push(ped);
  }
  return peds;
}

export function updatePedestrians(peds, dt, danger) {
  for (const ped of peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      ped.mesh.rotation.x = ped.down > 0 ? -Math.PI / 2 : 0;
      ped.mesh.position.y = ped.down > 0 ? 0.3 : 0;
      if (ped.down <= 0) ped.mesh.rotation.x = 0;
      continue;
    }
    // Flee from a fast car nearby.
    let fleeX = 0;
    let fleeZ = 0;
    if (danger) {
      const dx = ped.mesh.position.x - danger.x;
      const dz = ped.mesh.position.z - danger.z;
      const d = Math.hypot(dx, dz);
      if (d < 12 && Math.abs(danger.speed) > 6) {
        ped.flee = 1.2;
        fleeX = dx / (d || 1);
        fleeZ = dz / (d || 1);
      }
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.mesh.position.x += fleeX * 4 * dt;
      ped.mesh.position.z += fleeZ * 4 * dt;
      ped.phase += dt * 12;
    } else {
      ped.pos += ped.dir * ped.speed * dt;
      if (ped.pos > 225) {
        ped.pos = 225;
        ped.dir = -1;
      } else if (ped.pos < -225) {
        ped.pos = -225;
        ped.dir = 1;
      }
      if (ped.horizontal) {
        ped.mesh.position.x = ped.pos;
        ped.mesh.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        ped.mesh.position.z = ped.pos;
        ped.mesh.rotation.y = ped.dir > 0 ? 0 : Math.PI;
      }
      ped.phase += dt * 7;
    }
    const swing = Math.sin(ped.phase) * 0.5;
    const legL = ped.mesh.getObjectByName('legL');
    const legR = ped.mesh.getObjectByName('legR');
    const armL = ped.mesh.getObjectByName('armL');
    const armR = ped.mesh.getObjectByName('armR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (armL) armL.rotation.x = -swing * 0.7;
    if (armR) armR.rotation.x = swing * 0.7;
  }
}

/** Knock a pedestrian down; returns the ped or null when nobody is close. */
export function punchPedestrian(peds, x, z, radius) {
  let best = null;
  let bestD = radius;
  for (const ped of peds) {
    if (ped.down > 0) continue;
    const d = Math.hypot(ped.mesh.position.x - x, ped.mesh.position.z - z);
    if (d < bestD) {
      bestD = d;
      best = ped;
    }
  }
  if (best) {
    best.down = 4;
    best.mesh.rotation.x = -Math.PI / 2;
  }
  return best;
}
