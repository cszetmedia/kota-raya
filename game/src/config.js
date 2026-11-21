// Kota Raya — tuning and world constants.
// The city is a 7x7 road grid with a downtown core, a kampung quarter, a neon
// beach strip and the sea to the south. Everything is tuned so the world stays
// readable at a glance and runs at 30 fps in a headless browser.
export const SAVE_KEY = 'kotaraya-save-v1';

export const WORLD = {
  roadSpacing: 70, // distance between parallel roads
  roads: [-210, -140, -70, 0, 70, 140, 210], // road centre lines, both axes
  roadWidth: 14,
  cityHalf: 245, // playable bounds (buildings stop here)
  beachZ: 252, // sand strip starts
  seaZ: 292, // water plane starts
  downtownHalf: 105, // blocks inside this are the tall downtown core
};

export const TROPIC = {
  skyTop: 0x2f7fd0,
  skyBottom: 0xbfe6f2,
  sunColor: 0xfff2cf,
  sunIntensity: 1.35,
  hemiSky: 0xbfe3f2,
  hemiGround: 0x8a7a5a,
  fogColor: 0xcfe8f2,
  fogNear: 180,
  fogFar: 620,
};

export const PLAYER_TUNING = {
  walkSpeed: 6.5,
  sprintSpeed: 10.5,
  turnSpeed: 9,
  radius: 0.7,
  maxHealth: 100,
};

export const CAR_TUNING = {
  accel: 16,
  reverseAccel: 10,
  maxSpeed: 34, // ~122 km/h
  maxReverse: 9,
  steer: 1.9,
  brake: 30,
  grip: 6,
  radius: 1.6,
};

export const POLICE_TUNING = {
  maxStars: 5,
  chaseSpeed: 30,
  bustDistance: 3.2,
  bustTime: 2.0,
  decayDelay: 25, // seconds without crime before stars start falling
  decayInterval: 8,
  maxCars: 6,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;

// Cash is shown in thousands of rupiah, e.g. 150 means "Rp 150rb".
export const MISSION_REWARDS = [150, 200, 350, 500];

export const CONTROLS_TEXT =
  'WASD gerak / nyetir · Shift lari / nitro · E masuk-keluar mobil · F pukul · Spasi rem tangan · Esc jeda · M suara';
