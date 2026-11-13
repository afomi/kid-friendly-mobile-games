// Randomness is injectable so game logic can be tested deterministically.
export type Rng = () => number;

export const shuffle = <T>(items: T[], rng: Rng = Math.random): T[] => {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const randInt = (lo: number, hi: number, rng: Rng = Math.random) =>
  lo + Math.floor(rng() * (hi - lo + 1));

export const pick = <T>(items: T[], rng: Rng = Math.random): T =>
  items[Math.floor(rng() * items.length)];

// Deterministic generator for tests (mulberry32).
export const seeded = (seed: number): Rng => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
