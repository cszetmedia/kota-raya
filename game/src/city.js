// Kota Raya — pembangun kota: tanah, jalan, gedung, pohon, pantai, dan toko.
// Gedung didaftarkan ke world.buildings supaya mobil/pejalan kaki tidak menembusnya.
import { CFG } from './config.js';
import { range, pick, int } from './random.js';

const BUILDING_COLORS = [0xc96f4a, 0xe0cfa8, 0x7d9bb5, 0x8a7f70, 0xb5a06a, 0x6e8b6a, 0x9c8aa8, 0xd9d3c3];
const ROOF_COLORS = [0x8a4a32, 0x5a6b7a, 0x6b4a3a, 0x4a5a6b];

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function buildCity(world) {
  const scene = world.scene;
  const rng = world.rng;

  // Tanah rumput.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CFG.worldSize, CFG.worldSize), lambert(0x4d7d3d));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // Jalan aspal di setiap avenue (vertikal + horizontal).
  const roadMat = lambert(0x333a40);
  for (const a of CFG.avenues) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(CFG.roadWidth, 0.12, CFG.worldSize), roadMat);
    v.position.set(a, 0.06, 0);
    scene.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(CFG.worldSize, 0.12, CFG.roadWidth), roadMat);
    h.position.set(0, 0.06, a);
    scene.add(h);
  }

  // Pantai di selatan (z besar) dan laut di ujungnya.
  const sand = new THREE.Mesh(new THREE.BoxGeometry(CFG.worldSize, 0.12, 32), lambert(0xd9c27a));
  sand.position.set(0, 0.08, 216);
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.BoxGeometry(CFG.worldSize, 0.12, 10), lambert(0x2e7fb8));
  sea.position.set(0, 0.1, 235);
  scene.add(sea);

  // Gedung-gedung di dalam blok (satu InstancedMesh, warna per instansi).
  const placements = [];
  const av = CFG.avenues;
  for (let i = 0; i < av.length - 1; i++) {
    for (let j = 0; j < av.length - 1; j++) {
      const x0 = av[i] + 8;
      const x1 = av[i + 1] - 8;
      const z0 = av[j] + 8;
      const z1 = av[j + 1] - 8;
      const cz = (z0 + z1) / 2;
      if (cz > 185) continue; // baris paling selatan = pantai, tanpa gedung
      const n = int(rng, 1, 3);
      for (let k = 0; k < n; k++) {
        const w = range(rng, 10, 18);
        const d = range(rng, 10, 18);
        const x = range(rng, x0 + w / 2, x1 - w / 2);
        const z = range(rng, z0 + d / 2, z1 - d / 2);
        const h = range(rng, 8, 30);
        placements.push({ x, z, w, d, h, color: pick(rng, BUILDING_COLORS) });
      }
    }
  }
  // Rumah-rumah kecil di pinggir barat dan timur kota.
  for (let k = 0; k < 12; k++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * range(rng, 192, 228);
    const z = range(rng, -190, 170);
    placements.push({ x, z, w: range(rng, 8, 12), d: range(rng, 8, 12), h: range(rng, 5, 8), color: pick(rng, BUILDING_COLORS) });
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), placements.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  placements.forEach((p, i) => {
    m4.compose(new THREE.Vector3(p.x, p.h / 2, p.z), q, new THREE.Vector3(p.w, p.h, p.d));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, col.setHex(p.color));
    world.buildings.push({ x: p.x, z: p.z, w: p.w, d: p.d });
  });
  scene.add(inst);

  // Atap piramida kecil di atas sebagian gedung (aksen).
  const roofGeo = new THREE.ConeGeometry(1, 1, 4);
  const roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.floor(placements.length / 2));
  let ri = 0;
  placements.forEach((p) => {
    if (ri >= roofs.count || rng() < 0.5) return;
    const s = Math.max(p.w, p.d) * 0.75;
    m4.compose(new THREE.Vector3(p.x, p.h + s * 0.3, p.z), q, new THREE.Vector3(s, s * 0.6, s));
    roofs.setMatrixAt(ri, m4);
    roofs.setColorAt(ri, col.setHex(pick(rng, ROOF_COLORS)));
    ri++;
  });
  roofs.count = ri;
  scene.add(roofs);

  // Pohon di trotoar dan halaman.
  const treeSpots = [];
  for (let k = 0; k < 60; k++) {
    const vertical = rng() < 0.5;
    const a = pick(rng, CFG.avenues) + (rng() < 0.5 ? -9 : 9);
    const along = range(rng, -225, 190);
    treeSpots.push({ x: vertical ? a : along, z: vertical ? along : a });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.4, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, lambert(0x6b4a2f), treeSpots.length);
  const leafGeo = new THREE.ConeGeometry(2.2, 5.5, 7);
  const leaves = new THREE.InstancedMesh(leafGeo, lambert(0x2f6b2f), treeSpots.length);
  treeSpots.forEach((t, i) => {
    m4.compose(new THREE.Vector3(t.x, 1.2, t.z), q, new THREE.Vector3(1, 1, 1));
    trunks.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(t.x, 5, t.z), q, new THREE.Vector3(1, 1, 1));
    leaves.setMatrixAt(i, m4);
  });
  scene.add(trunks, leaves);

  // Toko-toko penanda misi: warung pantai, pasar, bengkel.
  addShop(world, CFG.warung.x, CFG.warung.z, 10, 5, 8, 0xa8763e, 0x7a4a22); // Warung Pantai
  addShop(world, CFG.pasar.x, CFG.pasar.z, 16, 7, 12, 0xd97b29, 0x8a4a1a); // Pasar
  addShop(world, CFG.bengkel.x, CFG.bengkel.z, 14, 6, 10, 0x5a7a8a, 0x2f4a5a); // Bengkel Darma
}

function addShop(world, x, z, w, h, d, color, roofColor) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  body.position.y = h / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 3, 4), lambert(roofColor));
  roof.position.y = h + 1.5;
  roof.rotation.y = Math.PI / 4;
  g.add(body, roof);
  g.position.set(x, 0, z);
  world.scene.add(g);
  world.buildings.push({ x, z, w, d });
}
