import { Rng, shuffle } from "@/lib/random";

export const LEVELS = {
  beginner: { w: 9, h: 9, m: 10 },
  intermediate: { w: 16, h: 16, m: 40 },
  expert: { w: 30, h: 16, m: 99 },
} as const;
export type Level = keyof typeof LEVELS;

export type MinesGame = {
  lv: Level;
  w: number;
  h: number;
  m: number;
  mine: boolean[];
  rev: boolean[];
  flag: boolean[];
  state: "ready" | "play" | "won" | "lost";
  boom: number; // the mine that was hit, or -1
};

export function newBoard(lv: Level): MinesGame {
  const { w, h, m } = LEVELS[lv];
  const n = w * h;
  return {
    lv, w, h, m,
    mine: Array(n).fill(false),
    rev: Array(n).fill(false),
    flag: Array(n).fill(false),
    state: "ready",
    boom: -1,
  };
}

export function around(g: Pick<MinesGame, "w" | "h">, i: number): number[] {
  const x = i % g.w;
  const y = Math.floor(i / g.w);
  const r: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < g.w && ny >= 0 && ny < g.h) r.push(ny * g.w + nx);
    }
  }
  return r;
}

export const count = (g: MinesGame, i: number) =>
  around(g, i).filter((n) => g.mine[n]).length;

export const flagsLeft = (g: MinesGame) => g.m - g.flag.filter(Boolean).length;

const over = (g: MinesGame) => g.state === "won" || g.state === "lost";

// Mines are placed on the first dig, never on or next to that cell, so the
// first tap always opens an area.
function place(g: MinesGame, safe: number, rng?: Rng): boolean[] {
  const keep = new Set([safe, ...around(g, safe)]);
  const pool = [...Array(g.w * g.h).keys()].filter((i) => !keep.has(i));
  const mine = Array(g.w * g.h).fill(false);
  shuffle(pool, rng).slice(0, g.m).forEach((i) => (mine[i] = true));
  return mine;
}

// Flood-fill open from i through empty cells. Mutates rev.
function open(g: MinesGame, rev: boolean[], i: number) {
  const stack = [i];
  while (stack.length) {
    const j = stack.pop()!;
    if (rev[j] || g.flag[j]) continue;
    rev[j] = true;
    if (!g.mine[j] && count(g, j) === 0) {
      around(g, j).forEach((n) => !rev[n] && stack.push(n));
    }
  }
}

function settle(g: MinesGame): MinesGame {
  const safe = g.w * g.h - g.m;
  if (g.rev.filter(Boolean).length !== safe) return g;
  return { ...g, state: "won", flag: g.mine.slice() };
}

const lose = (g: MinesGame, i: number): MinesGame => {
  const rev = g.rev.slice();
  rev[i] = true;
  return { ...g, rev, state: "lost", boom: i };
};

export function reveal(g: MinesGame, i: number, rng?: Rng): MinesGame {
  if (over(g) || g.flag[i]) return g;
  if (g.state === "ready") g = { ...g, mine: place(g, i, rng), state: "play" };
  if (g.rev[i]) return chord(g, i);
  if (g.mine[i]) return lose(g, i);
  const rev = g.rev.slice();
  open(g, rev, i);
  return settle({ ...g, rev });
}

// Tapping a number whose flags are all placed opens its other neighbors.
export function chord(g: MinesGame, i: number): MinesGame {
  const k = count(g, i);
  if (!k || !g.rev[i]) return g;
  const nb = around(g, i);
  if (nb.filter((n) => g.flag[n]).length !== k) return g;
  const hit = nb.find((n) => !g.flag[n] && !g.rev[n] && g.mine[n]);
  if (hit !== undefined) return lose(g, hit);
  const rev = g.rev.slice();
  nb.forEach((n) => !g.flag[n] && open(g, rev, n));
  return settle({ ...g, rev });
}

export function toggleFlag(g: MinesGame, i: number): MinesGame {
  if (over(g) || g.rev[i]) return g;
  const flag = g.flag.slice();
  flag[i] = !flag[i];
  return { ...g, flag };
}
