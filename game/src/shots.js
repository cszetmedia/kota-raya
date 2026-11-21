// Kota Raya — screenshot scenes behind ?shot=start|drive|chase|mission.
// Each one plays the real rules forward from a fresh world for a few seconds
// with a simple autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame. Sets window.__shotReady when
// the scene is painted, which the screenshot script waits for.
import { raiseWanted } from './police.js';
import { enterCar } from './player.js';

const STEP = 1 / 60;

function autoInput(throttle, steer) {
  return {
    throttle: () => throttle,
    steer: () => steer,
    sprint: () => false,
    brake: () => false,
    takeActions: () => 0,
  };
}

function idleInput() {
  return autoInput(0, 0);
}

function driveInput() {
  return autoInput(1, 0);
}

/** Stage `game` to the named scene and paint it. Returns the screen name. */
export function stageShot(name, game) {
  const { world } = game;
  const player = world.player;
  const missions = world.missions;

  if (name === 'drive') {
    // Raka driving his blue sedan down the eastern avenue, traffic around him.
    const car = world.starterCar;
    player.x = 70;
    player.z = -140;
    car.x = 70;
    car.z = -140;
    car.heading = 0;
    car.speed = 18;
    car.mesh.position.set(70, 0, -140);
    car.mesh.rotation.y = 0;
    enterCar(player, car, world.scene);
    for (let i = 0; i < 150; i += 1) game.step(STEP, driveInput(), 0);
    game.renderer3.snap(player.car, true);
    game.renderFrame(STEP);
    window.__shotReady = true;
    return 'play';
  }

  if (name === 'chase') {
    // Wanted level 3: three police cars hunting Raka's sedan down the avenue.
    const car = world.starterCar;
    player.x = 70;
    player.z = -60;
    car.x = 70;
    car.z = -60;
    car.heading = 0;
    car.speed = 24;
    car.mesh.position.set(70, 0, -60);
    car.mesh.rotation.y = 0;
    enterCar(player, car, world.scene);
    raiseWanted(world.wanted, 3, 'shot-chase');
    world.audio.siren(true);
    for (let i = 0; i < 210; i += 1) game.step(STEP, driveInput(), 0);
    // Roadblock: one police car ahead, coming at the player, so the chase
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
    for (let i = 0; i < 90; i += 1) game.step(STEP, idleInput(), 0);
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
