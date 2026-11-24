// Kota Raya — polisi: muncul saat wanted naik, mengejar Raka.
// Dua mobil polisi untuk 1-2 bintang, tiga mobil untuk 3 bintang ke atas.
import { clamp } from './world.js';
import { makeCarMesh } from './vehicles.js';

function spawnPolice(world) {
  const mesh = makeCarMesh(0x1c2733);
  // Lampu strobo di atap.
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.22, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x2244ff }),
  );
  bar.position.set(0, 1.5, -0.3);
  mesh.add(bar);
  let x;
  let z;
  if (world.shotMode === 'chase') {
    // Mode foto kejar-kejaran: polisi muncul di depan pemain supaya terlihat
    // di frame (bukan di belakang kamera). Mereka tetap berbalik mengejar.
    const a = world.player.heading;
    const side = (world.wanted.police.length % 2 === 0 ? -1 : 1) * 9;
    const ahead = 26 + world.wanted.police.length * 6;
    x = clamp(world.player.x + Math.sin(a) * ahead + Math.cos(a) * side, -230, 230);
    z = clamp(world.player.z + Math.cos(a) * ahead - Math.sin(a) * side, -230, 230);
  } else {
    const a = world.player.heading;
    x = clamp(world.player.x + Math.sin(a + Math.PI) * 40, -230, 230);
    z = clamp(world.player.z + Math.cos(a + Math.PI) * 40, -230, 230);
  }
  mesh.position.set(x, 0, z);
  world.scene.add(mesh);
  return {
    x,
    z,
    heading: Math.atan2(world.player.x - x, world.player.z - z),
    speed: 10,
    mesh,
  };
}

export function updatePolice(world, dt) {
  const w = world.wanted;
  const want = w.stars >= 3 ? 3 : w.stars >= 1 ? 2 : 0;
  while (w.police.length < want) w.police.push(spawnPolice(world));
  while (w.police.length > want) {
    const p = w.police.pop();
    world.scene.remove(p.mesh);
  }
  for (const p of w.police) {
    const dx = world.player.x - p.x;
    const dz = world.player.z - p.z;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    p.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
    p.speed = Math.min(p.speed + 10 * dt, 28);
    p.x = clamp(p.x + Math.sin(p.heading) * p.speed * dt, -238, 238);
    p.z = clamp(p.z + Math.cos(p.heading) * p.speed * dt, -238, 238);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  }
  // Bintang pelan-pelan memudar bila lama tidak berbuat onar.
  if (w.stars > 0 && world.elapsed - w.lastCrimeAt > 45) {
    w.lastCrimeAt = world.elapsed;
    w.stars = Math.max(0, w.stars - 1);
  }
}
