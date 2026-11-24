// Kota Raya — pejalan kaki (26 orang) dan Sari, penumpang misi 2.
// Mereka berjalan di trotoar, berputar di ujung kota.
import { CFG } from './config.js';
import { range, pick } from './random.js';
import { clamp } from './world.js';

const SHIRT_COLORS = [0xd94f3d, 0x3d7dd9, 0xe8b93c, 0x4fae5a, 0x9b59b6, 0xe8e8e8, 0xef7d54, 0x5ab8a0];

function makePedMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.4, 1.0, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.75;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
  );
  head.position.y = 1.45;
  g.add(body, head);
  return g;
}

export function createPedestrians(world) {
  const rng = world.rng;
  for (let i = 0; i < CFG.pedCount; i++) {
    const vertical = rng() < 0.5;
    const avenue = pick(rng, CFG.avenues) + (rng() < 0.5 ? -8.5 : 8.5);
    const along = range(rng, -230, 190);
    const dir = rng() < 0.5 ? 1 : -1;
    const x = vertical ? avenue : along;
    const z = vertical ? along : avenue;
    const heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const mesh = makePedMesh(pick(rng, SHIRT_COLORS));
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    world.scene.add(mesh);
    world.peds.push({ x, z, heading, speed: range(rng, 1.0, 1.6), mesh });
  }

  // Sari menunggu di Kampung Melati, barat daya kota.
  const sariMesh = makePedMesh(0xe84393);
  sariMesh.position.set(CFG.sariSpot.x, 0, CFG.sariSpot.z);
  world.scene.add(sariMesh);
  world.sari = { x: CFG.sariSpot.x, z: CFG.sariSpot.z, mesh: sariMesh, pickedUp: false };
}

export function updatePeds(world, dt) {
  for (const p of world.peds) {
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    if (p.z > 195 || p.z < -235 || p.x > 235 || p.x < -235) {
      p.heading += Math.PI; // berbalik di ujung jalan
      p.x = clamp(p.x, -235, 235);
      p.z = clamp(p.z, -235, 195);
    }
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  }
}
