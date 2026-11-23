// Kota Raya — the procedural city.
//
// One painted ground texture carries the roads, sidewalks, beach and sea;
// buildings are a single InstancedMesh with a window texture; the Tugu Raya
// monument, palms, lamps and neon signs are props. Every building registers
// an AABB collider so cars and the player cannot drive through walls.
//
// The layout is drawn from the seeded generator, and the order the generator
// is consumed in is part of the city: keep the draw order of this module the
// same and a seed always builds the same streets.
import { WORLD } from './config.js';
import { pick, range, rangeInt } from './random.js';

const BUILDING_COLORS = [0xe8dcc8, 0xd9c7a7, 0xc9b18c, 0x9fb8c8, 0xb8c4a8, 0xd8a08a, 0xa8b8d8, 0xe8c8a0];
const NEON_COLORS = [0xff2d78, 0x00e5ff, 0xffd400, 0x7cff00, 0xff6a00];
const MAP_SIZE = 560; // the ground plane covers -280..280 on both axes

// Paint the whole map onto one canvas: concrete, sea and sand, the park and
// the monument plaza, sidewalk blocks, then asphalt, lane dashes and
// crosswalks, in that order.
function paintGround() {
  const px = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const g = canvas.getContext('2d');
  const toPx = (v) => ((v + 280) / MAP_SIZE) * px;
  const rect = (x0, z0, x1, z1) => g.fillRect(toPx(x0), toPx(z0), toPx(x1) - toPx(x0), toPx(z1) - toPx(z0));

  g.fillStyle = '#a08a68';
  g.fillRect(0, 0, px, px);

  // Sea along the south edge, sand in front of it, foam where they meet.
  g.fillStyle = '#2fa8c8';
  rect(-280, WORLD.seaZ, 280, 280);
  g.fillStyle = '#e8d8a0';
  rect(-280, WORLD.beachZ, 280, WORLD.seaZ);
  g.fillStyle = 'rgba(255,255,255,0.65)';
  g.fillRect(0, toPx(WORLD.seaZ) - 3, px, 6);

  // The north-west park and the central monument plaza.
  g.fillStyle = '#7cb86a';
  rect(-245, -245, -175, -175);
  g.fillStyle = '#c8b898';
  rect(-30, -30, 30, 30);

  // Sidewalk blocks between the roads.
  g.fillStyle = '#a89e86';
  for (let i = 0; i < WORLD.roads.length - 1; i += 1) {
    for (let j = 0; j < WORLD.roads.length - 1; j += 1) {
      const x0 = WORLD.roads[i] + WORLD.roadWidth / 2;
      const x1 = WORLD.roads[i + 1] - WORLD.roadWidth / 2;
      const z0 = WORLD.roads[j] + WORLD.roadWidth / 2;
      const z1 = WORLD.roads[j + 1] - WORLD.roadWidth / 2;
      if (z1 > WORLD.beachZ) continue;
      rect(x0, z0, x1, z1);
    }
  }

  // Asphalt: one strip per road on each axis.
  g.fillStyle = '#3a3f46';
  const half = WORLD.roadWidth / 2;
  for (const r of WORLD.roads) {
    rect(r - half, -280, r + half, WORLD.beachZ);
    rect(-280, r - half, 280, r + half);
  }

  // Yellow centre dashes.
  g.fillStyle = '#f2d24b';
  for (const r of WORLD.roads) {
    for (let v = -270; v < WORLD.beachZ; v += 12) {
      g.fillRect(toPx(r) - 1, toPx(v), 2, 6);
      g.fillRect(toPx(v), toPx(r) - 1, 6, 2);
    }
  }

  // Crosswalk stripes at every intersection.
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const rx of WORLD.roads) {
    for (const rz of WORLD.roads) {
      for (let k = -2; k <= 2; k += 1) {
        g.fillRect(toPx(rx + k * 2.6) - 1, toPx(rz - 5), 2, 10);
        g.fillRect(toPx(rx - 5), toPx(rz + k * 2.6) - 1, 10, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A repeating facade: warm concrete with a grid of lit and dark windows.
function paintFacade() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#8a6a4a';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = Math.random() < 0.55;
      g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#2e3440';
      g.fillRect(x, y, 7, 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One palm: a leaning trunk and six cone leaves.
function buildPalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a48 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 4.2, 6), trunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 4), leafMat);
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 1.1, 4.4, Math.sin(angle) * 1.1);
    leaf.rotation.set(Math.sin(angle) * 1.1, 0, -Math.cos(angle) * 1.1);
    group.add(leaf);
  }
  return group;
}

/** Build the whole city into the scene. Returns colliders and park spots. */
export function createCity(scene, rng) {
  const colliders = [];
  const parkSpots = [];
  const group = new THREE.Group();
  group.name = 'city';

  // Ground: one textured plane for the whole map.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ map: paintGround() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 10);
  ground.receiveShadow = true;
  group.add(ground);

  // The sea plane, just below the sand so the shoreline reads.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 268),
    new THREE.MeshLambertMaterial({ color: 0x2fa8c8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.15, WORLD.seaZ + 134);
  group.add(sea);

  // Where the buildings go: one or two per block, two or three downtown,
  // skipping the beach row, the monument plaza and the park.
  const placements = [];
  for (let i = 0; i < WORLD.roads.length - 1; i += 1) {
    for (let j = 0; j < WORLD.roads.length - 1; j += 1) {
      const x0 = WORLD.roads[i] + WORLD.roadWidth / 2 + 4;
      const x1 = WORLD.roads[i + 1] - WORLD.roadWidth / 2 - 4;
      const z0 = WORLD.roads[j] + WORLD.roadWidth / 2 + 4;
      const z1 = WORLD.roads[j + 1] - WORLD.roadWidth / 2 - 4;
      if (z1 > WORLD.beachZ - 4) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (Math.abs(cx) < 42 && Math.abs(cz) < 42) continue;
      if (cx < -140 && cz < -140) continue;
      const downtown = Math.abs(cx) < WORLD.downtownHalf && Math.abs(cz) < WORLD.downtownHalf;
      const count = downtown ? rangeInt(rng, 2, 3) : rangeInt(rng, 1, 2);
      for (let k = 0; k < count; k += 1) {
        const w = range(rng, 12, 20);
        const d = range(rng, 12, 20);
        const bx = range(rng, x0 + w / 2, x1 - w / 2);
        const bz = range(rng, z0 + d / 2, z1 - d / 2);
        const h = downtown ? range(rng, 30, 95) : range(rng, 10, 30);
        placements.push({ x: bx, z: bz, w, d, h, color: pick(rng, BUILDING_COLORS) });
      }
    }
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const boxMat = new THREE.MeshLambertMaterial({ map: paintFacade() });
  const instanced = new THREE.InstancedMesh(boxGeo, boxMat, placements.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  placements.forEach((b, i) => {
    pos.set(b.x, 0, b.z);
    scl.set(b.w, b.h, b.d);
    matrix.compose(pos, quat, scl);
    instanced.setMatrixAt(i, matrix);
    col.setHex(b.color);
    instanced.setColorAt(i, col);
    colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
  });
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  group.add(instanced);

  // Tugu Raya: the golden obelisk on the central plaza.
  const monument = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 11, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }),
  );
  base.position.y = 1.5;
  monument.add(base);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.2, 34, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8e0cc }),
  );
  shaft.position.y = 20;
  shaft.castShadow = true;
  monument.add(shaft);
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xffc21c, emissive: 0xcc8800 }),
  );
  flame.position.y = 38.5;
  flame.scale.y = 1.6;
  monument.add(flame);
  group.add(monument);

  // Park trees in the north-west block.
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x4d9e57 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  for (let i = 0; i < 14; i += 1) {
    const tx = range(rng, -238, -182);
    const tz = range(rng, -238, -182);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), trunkMat);
    trunk.position.set(tx, 1.5, tz);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 1.8, 3), 8, 6), leafMat);
    crown.position.set(tx, 4.2, tz);
    group.add(crown);
  }

  // Palms along the beach, then along the main avenue.
  for (let i = 0; i < 26; i += 1) {
    const palm = buildPalm(rng);
    if (i < 16) palm.position.set(range(rng, -240, 240), 0, range(rng, 256, 282));
    else palm.position.set(i % 2 === 0 ? -11 : 11, 0, range(rng, -200, 200));
    group.add(palm);
  }

  // Neon signs over the beach strip.
  for (let i = 0; i < 8; i += 1) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(range(rng, 6, 12), 2.2, 0.5),
      new THREE.MeshLambertMaterial({
        color: pick(rng, NEON_COLORS),
        emissive: pick(rng, NEON_COLORS),
      }),
    );
    sign.position.set(range(rng, -220, 220), range(rng, 8, 14), WORLD.beachZ - 8);
    group.add(sign);
  }

  // A street lamp at every intersection.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x30343a });
  const bulbMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xccaa44 });
  for (const rx of WORLD.roads) {
    for (const rz of WORLD.roads) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampMat);
      pole.position.set(rx + 8.5, 3, rz + 8.5);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), bulbMat);
      bulb.position.set(rx + 8.5, 6.2, rz + 8.5);
      group.add(bulb);
    }
  }

  // Kerb spots for parked cars (stealable, not traffic).
  for (let i = 0; i < 10; i += 1) {
    const road = pick(rng, WORLD.roads);
    const along = range(rng, -200, 200);
    const side = rng() < 0.5 ? -1 : 1;
    if (rng() < 0.5) parkSpots.push({ x: road + side * 5.2, z: along, heading: side > 0 ? 0 : Math.PI });
    else parkSpots.push({ x: along, z: road + side * 5.2, heading: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
  }

  scene.add(group);
  return { colliders, parkSpots, group };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps.
export function resolveCollisions(colliders, x, z, radius) {
  let nx = x;
  let nz = z;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(nx, c.maxX));
    const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * radius;
      nz = cz + (dz / d) * radius;
    } else if (d2 <= 0.0001) {
      // The centre is inside the box: leave through the nearest face.
      const toLeft = nx - c.minX;
      const toRight = c.maxX - nx;
      const toTop = nz - c.minZ;
      const toBottom = c.maxZ - nz;
      const min = Math.min(toLeft, toRight, toTop, toBottom);
      if (min === toLeft) nx = c.minX - radius;
      else if (min === toRight) nx = c.maxX + radius;
      else if (min === toTop) nz = c.minZ - radius;
      else nz = c.maxZ + radius;
    }
  }
  return { x: nx, z: nz };
}

// Keep a point inside the playable map (the beach extends a little further).
export function clampToCity(x, z) {
  const half = WORLD.cityHalf;
  return {
    x: Math.max(-half, Math.min(half, x)),
    z: Math.max(-half, Math.min(WORLD.beachZ + 28, z)),
  };
}
