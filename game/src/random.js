// Kota Raya — a tiny seeded generator (mulberry32) plus the small helpers
// the world builders use to draw from it. Same seed, same city: the layout,
// traffic colours and parked cars are all reproducible, which is what makes
// the screenshot scenes deterministic.
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

// One element of a list, uniformly at random.
export function pick(rng, list) {
  const index = Math.floor(rng() * list.length);
  return list[index];
}

// A float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// An integer in [min, max], both ends included.
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
