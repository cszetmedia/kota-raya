// Kota Raya — semua angka penyetel game, dikumpulkan di satu tempat.
//
// Kota pulau ini adalah grid jalan berbentuk kotak dengan pusat kota yang
// padat, sebuah kawasan kampung, jalur pantai bernuansa neon, dan laut di
// sepanjang tepi selatan. Angka-angka di bawah menjaga dunia tetap mudah
// dibaca sekilas dan frame rate tetap mulus, bahkan di browser headless.

// Nama file save di localStorage.
export const SAVE_KEY = 'kotaraya-save-v1';

// Jumlah mobil dan pejalan kaki saat kota pertama kali dibuat.
export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;

// Uang dihitung dalam ribuan rupiah: 150 berarti "Rp 150rb".
export const MISSION_REWARDS = [150, 200, 350, 500];

// Ringkasan kontrol satu baris yang tampil di bawah layar judul.
export const CONTROLS_TEXT =
  'WASD gerak / nyetir · Shift lari / nitro · E masuk-keluar mobil · F pukul · Spasi rem tangan · Esc jeda · M suara';

// Petanya sendiri: tujuh jalan sejajar di tiap sumbu, berjarak 70 m.
export const WORLD = {
  roadSpacing: 70,
  roads: [-210, -140, -70, 0, 70, 140, 210],
  roadWidth: 14,
  cityHalf: 245,
  beachZ: 252,
  seaZ: 292,
  downtownHalf: 105,
};

// Cahaya, langit, dan kabut untuk nuansa siang tropis.
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

// Raka saat berjalan kaki.
export const PLAYER_TUNING = {
  walkSpeed: 6.5,
  sprintSpeed: 10.5,
  turnSpeed: 9,
  radius: 0.7,
  maxHealth: 100,
};

// Kendali mobil gaya arcade. maxSpeed 34 m/detik setara sekitar 122 km/jam.
export const CAR_TUNING = {
  accel: 16,
  reverseAccel: 10,
  maxSpeed: 34,
  maxReverse: 9,
  steer: 1.9,
  brake: 30,
  grip: 6,
  radius: 1.6,
};

// Sistem wanted: jumlah bintang, kecepatan kejar-kejaran, kapan panas mereda.
export const POLICE_TUNING = {
  maxStars: 5,
  chaseSpeed: 30,
  bustDistance: 3.2,
  bustTime: 2.0,
  decayDelay: 25,
  decayInterval: 8,
  maxCars: 6,
};
