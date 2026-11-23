// Kota Raya — generator acak ber-seed (mulberry32) dan helper kecil untuk
// mengambil dari generator itu. Seed yang sama selalu menghasilkan kota
// yang sama: tata letak, warna lalu lintas, dan mobil parkir semuanya bisa
// diulang, dan itulah yang membuat adegan screenshot deterministik.
export function createRandom(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Satu elemen dari sebuah daftar, dipilih seragam secara acak.
export function pick(rng, list) {
  const index = Math.floor(rng() * list.length);
  return list[index];
}

// Bilangan desimal pada [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Bilangan bulat pada [min, max], kedua ujung termasuk.
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
