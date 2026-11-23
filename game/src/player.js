// Kota Raya — the player: Raka, a young driver from Kampung Melati. On foot
// he walks and sprints with a swinging stride and can punch; near a car he
// can get in (stealing a traffic car or a parked car is a crime) and drive it
// with arcade physics. Getting out parks the car where it stops.
import { PLAYER_TUNING, CAR_TUNING } from './config.js';
import { makeCar } from './vehicles.js';
import { resolveCollisions, clampToCity } from './city.js';

// Raka: red cap, blue jacket, jeans.
function buildRaka() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc89878 });
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2c6fd8 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skin);
  head.position.y = 1.66;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.14, 0.48),
    new THREE.MeshLambertMaterial({ color: 0xd8382c }),
  );
  cap.position.y = 1.9;
  group.add(cap);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.34), jacket);
  body.position.y = 1.08;
  group.add(body);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), jeans);
  legL.position.set(-0.15, 0.36, 0);
  legL.name = 'legL';
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), jeans);
  legR.position.set(0.15, 0.36, 0);
  legR.name = 'legR';
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.2), jacket);
  armL.position.set(-0.4, 1.08, 0);
  armL.name = 'armL';
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.2), jacket);
  armR.position.set(0.4, 1.08, 0);
  armR.name = 'armR';
  group.add(armR);
  return group;
}

export function createPlayer(scene, x, z) {
  const mesh = buildRaka();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh,
    x,
    z,
    heading: 0,
    speed: 0,
    health: PLAYER_TUNING.maxHealth,
    inCar: false,
    car: null, // the driven car object {mesh, x, z, heading, speed, ...}
    carMesh: null,
    phase: 0,
    punchCooldown: 0,
    punchAnim: 0,
    invulnerable: 0,
  };
}

function animateWalk(player, moving) {
  const swing = moving ? Math.sin(player.phase) * 0.55 : 0;
  const legL = player.mesh.getObjectByName('legL');
  const legR = player.mesh.getObjectByName('legR');
  const armL = player.mesh.getObjectByName('armL');
  const armR = player.mesh.getObjectByName('armR');
  if (legL) legL.rotation.x = swing;
  if (legR) legR.rotation.x = -swing;
  if (armL) armL.rotation.x = -swing * 0.7;
  if (armR) armR.rotation.x = swing * 0.7;
  if (player.punchAnim > 0 && armR) armR.rotation.x = -1.6;
}

// Move on foot: WASD relative to the camera yaw, sprint with Shift.
export function stepPlayerOnFoot(player, input, cameraYaw, colliders, dt) {
  const throttle = input.throttle();
  const steer = input.steer();
  const sprint = input.sprint();
  const speed = sprint ? PLAYER_TUNING.sprintSpeed : PLAYER_TUNING.walkSpeed;
  // Forward is where the camera looks; sideways is the strafe axis.
  const fx = Math.sin(cameraYaw);
  const fz = Math.cos(cameraYaw);
  const rx = Math.cos(cameraYaw);
  const rz = -Math.sin(cameraYaw);
  let mx = fx * throttle + rx * steer;
  let mz = fz * throttle + rz * steer;
  const len = Math.hypot(mx, mz);
  const moving = len > 0.01;
  if (moving) {
    mx /= len;
    mz /= len;
    player.x += mx * speed * dt;
    player.z += mz * speed * dt;
    // Ease the facing towards the movement direction, fastest when turning.
    let diff = Math.atan2(mx, mz) - player.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.heading += diff * Math.min(1, dt * PLAYER_TUNING.turnSpeed);
    player.phase += dt * (sprint ? 13 : 9);
    player.speed = speed;
  } else {
    player.speed = 0;
    player.phase += dt * 2;
  }
  const clamped = clampToCity(player.x, player.z);
  const resolved = resolveCollisions(colliders, clamped.x, clamped.z, PLAYER_TUNING.radius);
  player.x = resolved.x;
  player.z = resolved.z;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  animateWalk(player, moving);
  if (player.punchAnim > 0) player.punchAnim -= dt;
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.invulnerable > 0) player.invulnerable -= dt;
}

// Drive the player's car with arcade physics and building collision.
export function stepPlayerInCar(player, input, colliders, dt) {
  const car = player.car;
  const drive = { speed: car.speed, heading: car.heading, x: car.x, z: car.z };
  const throttle = input.throttle();
  const steer = input.steer();
  if (throttle > 0) drive.speed += CAR_TUNING.accel * dt;
  else if (throttle < 0) {
    if (drive.speed > 0.5) drive.speed -= CAR_TUNING.brake * dt;
    else drive.speed -= CAR_TUNING.reverseAccel * dt;
  } else {
    drive.speed -= Math.sign(drive.speed) * CAR_TUNING.grip * 0.6 * dt;
    if (Math.abs(drive.speed) < 0.2) drive.speed = 0;
  }
  if (input.brake()) drive.speed -= Math.sign(drive.speed) * CAR_TUNING.brake * dt;
  const boost = input.sprint() ? 1.25 : 1;
  drive.speed = Math.max(-CAR_TUNING.maxReverse, Math.min(CAR_TUNING.maxSpeed * boost, drive.speed));
  const steerAmount = steer * CAR_TUNING.steer * dt * Math.min(1, Math.abs(drive.speed) / 8 + 0.25);
  drive.heading += steerAmount * Math.sign(drive.speed);
  drive.x += Math.sin(drive.heading) * drive.speed * dt;
  drive.z += Math.cos(drive.heading) * drive.speed * dt;
  const clamped = clampToCity(drive.x, drive.z);
  const resolved = resolveCollisions(colliders, clamped.x, clamped.z, CAR_TUNING.radius);
  // A hard stop against a wall kills most of the speed.
  if (Math.hypot(resolved.x - drive.x, resolved.z - drive.z) > 0.05) {
    drive.speed *= 0.4;
  }
  car.x = resolved.x;
  car.z = resolved.z;
  car.heading = drive.heading;
  car.speed = drive.speed;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  player.speed = Math.abs(car.speed);
  return car;
}

// Take over a car mesh as the player's ride.
export function enterCar(player, car, scene) {
  if (car.taken) return false;
  car.taken = true;
  if (car.driver) {
    // The driver bails out and runs: the traffic car leaves its lane.
    car.driver = false;
  }
  player.car = car;
  player.carMesh = car.mesh;
  player.inCar = true;
  player.mesh.visible = false;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  if (car.speed === undefined) car.speed = 0;
  if (car.heading === undefined) car.heading = 0;
  return true;
}

// Step out beside the car; the car stays where it stopped.
export function exitCar(player, scene) {
  const car = player.car;
  if (!car) return;
  const side = 2.4;
  player.x = car.x + Math.cos(car.heading) * side;
  player.z = car.z - Math.sin(car.heading) * side;
  player.inCar = false;
  player.car = null;
  player.carMesh = null;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  car.speed = 0;
}

// Build a fresh player car at a spot (mission cars, the starter ride).
export function spawnPlayerCar(scene, color, x, z, heading) {
  const mesh = makeCar(color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, x, z, heading, speed: 0, taken: false, playerOwned: true };
}
