// Kota Raya — wadah state dunia dan helper geometri.
// Semua modul lain membaca/menulis lewat objek world ini.
import { CFG } from './config.js';
import { mulberry32 } from './random.js';

export function createWorld(seed) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    elapsed: 0,
    frames: 0,
    started: false,
    player: {
      x: 0,
      z: 8,
      heading: Math.PI,
      speed: 0,
      health: 100,
      inCar: false,
      car: null,
      carMesh: null,
      mesh: null,
    },
    wanted: { stars: 0, police: [], lastCrimeAt: -999 },
    cash: 0,
    missions: { index: 0, active: null, done: [] },
    traffic: [],
    peds: [],
    parked: [],
    starterCar: null,
    targetCar: null,
    sari: null,
    beacon: null,
    missionTarget: null,
    buildings: [],
    scene: null,
    camera: null,
    shotMode: null,
    shotAutoDrive: false,
    shotReady: false,
    shotT0: 0,
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// True bila titik (x, z) menabrak gedung (dengan radius pengaman r).
export function blocked(world, x, z, r) {
  for (const b of world.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
  }
  return false;
}

// Naikkan wanted; dicatat waktunya untuk peluruhan bintang.
export function addWanted(world, n) {
  world.wanted.stars = Math.min(5, world.wanted.stars + n);
  world.wanted.lastCrimeAt = world.elapsed;
}
