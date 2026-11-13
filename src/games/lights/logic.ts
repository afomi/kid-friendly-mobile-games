import { Rng, shuffle } from "@/lib/random";

export const SIZE = 5;
const CELLS = SIZE * SIZE;

export type LightsGame = {
  level: number;
  cells: boolean[]; // true = lit
  start: boolean[];
  sol: boolean[]; // presses that would solve the current board
  startSol: boolean[];
  par: number;
  moves: number;
  done: boolean;
};

export function neighbors(i: number): number[] {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  const r = [i];
  if (x > 0) r.push(i - 1);
  if (x < SIZE - 1) r.push(i + 1);
  if (y > 0) r.push(i - SIZE);
  if (y < SIZE - 1) r.push(i + SIZE);
  return r;
}

const toggle = (cells: boolean[], i: number) => {
  const next = cells.slice();
  neighbors(i).forEach((n) => (next[n] = !next[n]));
  return next;
};

// Scramble a dark board with `par` distinct presses. Pressing the same set
// again solves it, so every puzzle is solvable and `sol` is a real answer.
export function newPuzzle(level: number, rng?: Rng): LightsGame {
  const par = Math.min(3 + level, 15);
  let cells: boolean[];
  let sol: boolean[];
  do {
    cells = Array(CELLS).fill(false);
    sol = Array(CELLS).fill(false);
    for (const i of shuffle([...Array(CELLS).keys()], rng).slice(0, par)) {
      sol[i] = true;
      cells = toggle(cells, i);
    }
  } while (!cells.some(Boolean));
  return { level, cells, start: cells, sol, startSol: sol, par, moves: 0, done: false };
}

export function press(g: LightsGame, i: number): LightsGame {
  if (g.done) return g;
  const cells = toggle(g.cells, i);
  const sol = g.sol.slice();
  sol[i] = !sol[i];
  return { ...g, cells, sol, moves: g.moves + 1, done: !cells.some(Boolean) };
}

export const restart = (g: LightsGame): LightsGame => ({
  ...g,
  cells: g.start,
  sol: g.startSol,
  moves: 0,
  done: false,
});

// Buttons that are part of a solution from here. Pressing any one of them
// moves toward the answer.
export const hintOptions = (g: LightsGame) =>
  g.sol.flatMap((v, i) => (v ? [i] : []));

export const litCount = (g: LightsGame) => g.cells.filter(Boolean).length;
