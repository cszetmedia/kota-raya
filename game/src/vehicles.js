// Kota Raya — kendaraan: pabrik mesh mobil, mobil starter, sedan target,
// mobil parkir, lalu lintas, dan fisika mengemudi.
import { CFG } from './config.js';
import { range, pick } from './random.js';
import { clamp, blocked } from './world.js';

const CAR_COLORS = [0xd94f3d, 0x3d7dd9, 0xe8b93c, 0x7a7f85, 0x4fae5a, 0x9b59b6, 0xe8e8e8, 0x222831];

// Satu mobil: bodi + kabin kaca + kolong gelap. Dipakai juga untuk polisi.
export function makeCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.65, 4.2),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(0, 1.1, -0.3);
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.3, 4.25),
    new THREE.MeshLambertMaterial({ color: 0x111417 }),
  );
  skirt.position.y = 0.28;
  g.add(body, cabin, skirt);
  return g;
}

function makeCar(world, kind, x, z, heading, color) {
  const mesh = makeCarMesh(color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  world.scene.add(mesh);
  return { kind, x, z, heading, speed: 0, maxSpeed: 12, mesh, color, vertical: true, avenue: 0, dir: 1 };
}

export function createVehicles(world) {
  const rng = world.rng;

  // Mobil Raka (starter): di avenue x=0, menghadap utara (-z).
  world.starterCar = makeCar(world, 'starter', 0, 16, Math.PI, 0x2e86c1);
  world.starterCar.maxSpeed = CFG.carMaxSpeed;

  // Sedan merah pesanan (target): di pusat kota, avenue x=60.
  world.targetCar = makeCar(world, 'target', 60, -58, Math.PI, 0xc0392b);
  world.targetCar.maxSpeed = CFG.carMaxSpeed;

  // Enam mobil parkir di pinggir jalan.
  const spots = [[-120, 40], [-60, -100], [120, 80], [180, -40], [-180, 100], [60, 140]];
  for (const [x, z] of spots) {
    const c = makeCar(world, 'parked', x, z, pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), pick(rng, CAR_COLORS));
    world.parked.push(c);
  }

  // Empat belas mobil lalu lintas di avenue, dua arah, dua lajur.
  for (let i = 0; i < CFG.trafficCount; i++) {
    const vertical = rng() < 0.5;
    const avenue = pick(rng, CFG.avenues);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -1 : 1) * 3;
    const along = range(rng, -230, 230);
    const x = vertical ? avenue + lane : along;
    const z = vertical ? along : avenue + lane;
    const heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const c = makeCar(world, 'traffic', x, z, heading, pick(rng, CAR_COLORS));
    c.vertical = vertical;
    c.avenue = avenue;
    c.dir = dir;
    c.speed = range(rng, 8, 12);
    world.traffic.push(c);
  }
}

// Lalu lintas berjalan lurus di jalurnya, berputar di ujung kota.
export function updateTraffic(world, dt) {
  for (const c of world.traffic) {
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    if (c.vertical) {
      if (c.z > 238) c.z = -238;
      if (c.z < -238) c.z = 238;
    } else {
      if (c.x > 238) c.x = -238;
      if (c.x < -238) c.x = 238;
    }
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
  }
}

// Fisika mengemudi untuk mobil yang dipakai pemain.
export function updateDrive(world, dt, input) {
  const car = world.player.car;
  if (!car) return;
  if (input.forward()) car.speed += CFG.carAccel * dt;
  else if (input.back()) car.speed -= CFG.carBrake * dt;
  else {
    car.speed -= car.speed * 0.6 * dt;
    if (Math.abs(car.speed) < 0.05) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CFG.carReverseMax, CFG.carMaxSpeed);
  const steer = (input.left() ? 1 : 0) - (input.right() ? 1 : 0);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.heading += steer * CFG.carTurn * dirSign * Math.min(1, Math.abs(car.speed) / 8) * dt;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  if (!blocked(world, nx, nz, 2)) {
    car.x = nx;
    car.z = nz;
  } else {
    car.speed *= 0.5;
  }
  car.x = clamp(car.x, -CFG.bound, CFG.bound);
  car.z = clamp(car.z, -CFG.bound, CFG.bound);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  world.player.x = car.x;
  world.player.z = car.z;
  world.player.heading = car.heading;
  world.player.speed = car.speed;
}
