// Kota Raya — screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a few seconds
// with a simple autopilot, so the frame is what a short game really looks
// like and the same seed always gives the same frame. Sets window.__shotReady
// when the scene is painted, which the screenshot script waits for.
import { raiseWanted } from './police.js';
import { enterCar } from './player.js';

const STEP = 1 / 60;

// A fixed fake input: constant throttle and steering, no one-shot presses.
function fakeInput(throttle, steer) {
  return {
    throttle: () => throttle,
    steer: () => steer,
    sprint: () => false,
    brake: () => false,
    takeActions: () => 0,
  };
}

function idleInput() {
  return fakeInput(0, 0);
}

function driveInput() {
  return fakeInput(1, 0);
}

// Run the world forward a number of fixed steps with the given input.
function runSteps(game, count, input) {
  for (let i = 0; i < count; i += 1) game.step(STEP, input, 0);
}

// Put Raka in the starter car at a spot, already moving.
function placeInCar(world, x, z, speed) {
  const car = world.starterCar;
  const player = world.player;
  player.x = x;
  player.z = z;
  car.x = x;
  car.z = z;
  car.heading = 0;
  car.speed = speed;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = 0;
  enterCar(player, car, world.scene);
}

// Stage `game` to the named scene and paint it. Returns the screen name.
export function stageShot(name, game) {
  const { world } = game;
  const player = world.player;
  const missions = world.missions;

  if (name === 'drive') {
    // Raka driving his blue sedan down the eastern avenue, traffic around him.
    placeInCar(world, 70, -140, 18);
    runSteps(game, 150, driveInput());
    game.renderer3.snap(player.car, true);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  if (name === 'chase') {
    // Wanted level 3: three police cars hunting Raka's sedan down the avenue.
    placeInCar(world, 70, -60, 24);
    raiseWanted(world.wanted, 3, 'shot-chase');
    world.audio.siren(true);
    runSteps(game, 210, driveInput());
    // A roadblock: one police car ahead, coming at the player, so the chase
    // reads in a single frame instead of hiding behind the camera.
    const blocker = world.wanted.police[0];
    if (blocker) {
      blocker.x = player.x - 6;
      blocker.z = player.z + 26;
      blocker.heading = player.heading + Math.PI;
      blocker.speed = 12;
      blocker.mesh.position.set(blocker.x, 0, blocker.z);
      blocker.mesh.rotation.y = blocker.heading;
    }
    game.renderer3.snap(player.car, true);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  if (name === 'mission') {
    // Mission 3, "Mobil Pesanan": Raka on foot by the red sedan downtown,
    // the yellow beacon marking it, police-free for the moment.
    missions.startMission(2);
    player.x = 58;
    player.z = -58;
    // Face the red sedan parked downtown (north-east of the player).
    player.heading = Math.PI * 3 / 4;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    runSteps(game, 90, idleInput());
    game.renderer3.snap(player, false);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  // Default: start — a slow orbit over downtown behind the title screen.
  for (let i = 0; i < 120; i += 1) game.stepAmbient(STEP);
  game.renderer3.orbit(9);
  game.renderer3.render();
  window.__shotReady = true;
  return 'title';
}
