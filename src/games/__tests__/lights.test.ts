import { describe, expect, it } from "@jest/globals";
import { hintOptions, litCount, neighbors, newPuzzle, press, restart } from "../lights/logic";
import { seeded } from "@/lib/random";

describe("Lights Out", () => {
  it("a press flips the button and its up/down/left/right neighbors", () => {
    expect(neighbors(0).sort((a, b) => a - b)).toEqual([0, 1, 5]);
    expect(neighbors(12).sort((a, b) => a - b)).toEqual([7, 11, 12, 13, 17]);
    expect(neighbors(24).sort((a, b) => a - b)).toEqual([19, 23, 24]);
  });

  it("every puzzle starts lit, has par 3 + level (max 15), and is solvable by following hints", () => {
    for (let level = 1; level <= 20; level++) {
      let g = newPuzzle(level, seeded(level));
      expect(litCount(g)).toBeGreaterThan(0);
      expect(g.par).toBe(Math.min(3 + level, 15));
      for (const i of hintOptions(g)) g = press(g, i);
      expect(g.done).toBe(true);
      expect(g.moves).toBeLessThanOrEqual(g.par);
    }
  });

  it("hints stay correct after wrong presses", () => {
    let g = newPuzzle(5, seeded(42));
    g = press(press(g, 0), 24); // two presses off the solution path
    for (const i of hintOptions(g)) g = press(g, i);
    expect(g.done).toBe(true);
  });

  it("restart brings back the starting board", () => {
    const g0 = newPuzzle(3, seeded(7));
    const g = restart(press(press(g0, 6), 18));
    expect(g.cells).toEqual(g0.start);
    expect(g.moves).toBe(0);
  });

  it("a solved board ignores further presses", () => {
    let g = newPuzzle(1, seeded(9));
    for (const i of hintOptions(g)) g = press(g, i);
    expect(press(g, 0)).toBe(g);
  });
});
