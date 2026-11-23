// Kota Raya — mobil. Pabrik mobil dari balok, lalu lintas yang mengitari
// grid, dan mobil parkir yang bisa dicuri pemain. Lalu lintas mengikuti
// lajur jalan dan melambat untuk mobil di depannya; mobil parkir duduk di
// tepi jalan sampai diambil.
//
// Urutan undian lalu lintas (koin taksi, warna, sumbu, jalan, arah,
// kecepatan, posisi) adalah bagian dari kota ber-seed: jaga urutan ini.
import { WORLD, CAR_TUNING } from './config.js';
import { pick, range } from './random.js';

export const CAR_COLORS = [0xd8382c, 0x2c6fd8, 0xf2c200, 0x2cd8a0, 0xe8e8e8, 0x30343a, 0xd86a2c, 0x8a4fd8];
const TAXI_COLOR = 0xf2c200;

// Rakit mobil sederhana dari balok: bodi, kabin, roda, lampu, dan untuk
// mobil polisi ada pita pintu dan palang lampu yang berkedip.
export function makeCar(color, isPolice = false, isTaxi = false) {
  const group = new THREE.Group();
  const paint = isPolice ? 0xf2f2f2 : color;
  const bodyMat = new THREE.MeshLambertMaterial({ color: paint });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheelSpots = [
    [-0.95, 0.38, 1.45],
    [0.95, 0.38, 1.45],
    [-0.95, 0.38, -1.45],
    [0.95, 0.38, -1.45],
  ];
  for (const [x, y, z] of wheelSpots) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  }
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c8, emissive: 0xaa9922 });
  for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    light.position.set(x, 0.6, 2.22);
    group.add(light);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xd81c1c, emissive: 0x550000 });
  for (const x of [-0.65, 0.65]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    light.position.set(x, 0.6, -2.22);
    group.add(light);
  }
  if (isPolice) {
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x1a2a44 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 1.6), doorMat);
    door.position.y = 0.55;
    group.add(door);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222222 }),
    );
    bar.position.set(0, 1.5, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.2, 0.42),
      new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xff0000 }),
    );
    red.position.set(-0.28, 1.5, -0.2);
    red.name = 'lightRed';
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.2, 0.42),
      new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x0022ff }),
    );
    blue.position.set(0.28, 1.5, -0.2);
    blue.name = 'lightBlue';
    group.add(blue);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.28, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    sign.position.set(0, 1.55, -0.2);
    group.add(sign);
  }
  group.userData.isPolice = isPolice;
  return group;
}

// Lalu lintas: mobil yang mengitari grid jalan di lajurnya, melambat
// untuk mobil di depan.
export function createTraffic(scene, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const isTaxi = rng() < 0.15;
    const color = isTaxi ? TAXI_COLOR : pick(rng, CAR_COLORS);
    const mesh = makeCar(color, false, isTaxi);
    const axis = rng() < 0.5 ? 'x' : 'z';
    const road = pick(rng, WORLD.roads);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = dir > 0 ? 3.5 : -3.5;
    const car = {
      mesh,
      axis,
      road,
      lane,
      dir,
      speed: range(rng, 7, 12),
      baseSpeed: range(rng, 7, 12),
      heading: axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
    };
    if (axis === 'x') mesh.position.set(range(rng, -230, 230), 0, road + lane);
    else mesh.position.set(road + lane, 0, range(rng, -230, 230));
    mesh.rotation.y = car.heading;
    scene.add(mesh);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, obstacles) {
  for (const car of cars) {
    // Merapat ke kecepatan jelajah, atau lebih pelan bila ada yang di depan.
    let target = car.baseSpeed;
    const lookAhead = 10;
    for (const other of cars) {
      if (other === car || other.axis !== car.axis || other.road !== car.road || other.dir !== car.dir) continue;
      const along = car.axis === 'x'
        ? (other.mesh.position.x - car.mesh.position.x) * car.dir
        : (other.mesh.position.z - car.mesh.position.z) * car.dir;
      if (along > 0 && along < lookAhead) target = Math.min(target, other.speed * 0.8);
    }
    for (const ob of obstacles) {
      const dx = ob.x - car.mesh.position.x;
      const dz = ob.z - car.mesh.position.z;
      const along = car.axis === 'x' ? dx * car.dir : dz * car.dir;
      const across = car.axis === 'x' ? dz : dx;
      if (along > 0 && along < lookAhead + 2 && Math.abs(across) < 3) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    if (car.axis === 'x') {
      car.mesh.position.x += car.dir * car.speed * dt;
      if (car.mesh.position.x > 245) car.mesh.position.x = -245;
      if (car.mesh.position.x < -245) car.mesh.position.x = 245;
    } else {
      car.mesh.position.z += car.dir * car.speed * dt;
      if (car.mesh.position.z > 250) car.mesh.position.z = -245;
      if (car.mesh.position.z < -245) car.mesh.position.z = 250;
    }
    // Goyangan halus mengikuti kecepatan, pengganti roda yang berputar.
    car.mesh.position.y = Math.sin((car.mesh.position.x + car.mesh.position.z) * 0.5) * 0.02 * (car.speed / 12);
  }
}

// Mobil parkir di tepi jalan: bisa dicuri, dan mobil target misi adalah
// salah satunya.
export function createParkedCars(scene, rng, spots) {
  const cars = [];
  for (const spot of spots) {
    const mesh = makeCar(pick(rng, CAR_COLORS));
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.heading;
    scene.add(mesh);
    cars.push({ mesh, x: spot.x, z: spot.z, heading: spot.heading, taken: false, speed: 0 });
  }
  return cars;
}

// Fisika mobil arcade: gas, setir, rem, mundur, rem tangan.
export function createDriveState() {
  return { speed: 0, heading: 0, x: 0, z: 0, steering: 0 };
}

export function stepDrive(state, input, dt) {
  const throttle = input.throttle();
  const steer = input.steer();
  if (throttle > 0) state.speed += CAR_TUNING.accel * dt;
  else if (throttle < 0) {
    if (state.speed > 0.5) state.speed -= CAR_TUNING.brake * dt;
    else state.speed -= CAR_TUNING.reverseAccel * dt;
  } else {
    state.speed -= Math.sign(state.speed) * CAR_TUNING.grip * 0.6 * dt;
    if (Math.abs(state.speed) < 0.2) state.speed = 0;
  }
  if (input.brake()) state.speed -= Math.sign(state.speed) * CAR_TUNING.brake * dt;
  const boost = input.sprint() ? 1.25 : 1;
  state.speed = Math.max(-CAR_TUNING.maxReverse, Math.min(CAR_TUNING.maxSpeed * boost, state.speed));
  const steerAmount = steer * CAR_TUNING.steer * dt * Math.min(1, Math.abs(state.speed) / 8 + 0.25);
  state.heading += steerAmount * Math.sign(state.speed);
  state.x += Math.sin(state.heading) * state.speed * dt;
  state.z += Math.cos(state.heading) * state.speed * dt;
  return state;
}
