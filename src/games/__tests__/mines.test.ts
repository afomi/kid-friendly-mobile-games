import { describe, expect, it } from "@jest/globals";
import { LEVELS, Level, around, count, flagsLeft, newBoard, reveal, toggleFlag } from "../mines/logic";
import { seeded } from "@/lib/random";

describe("Minesweeper", () => {
  it("the first dig is always safe and opens an area, with the right mine count", () => {
    for (const lv of Object.keys(LEVELS) as Level[]) {
      for (let s = 0; s < 10; s++) {
        const g0 = newBoard(lv);
        const first = Math.floor(g0.w * g0.h / 2);
        const g = reveal(g0, first, seeded(s));
        expect(g.state).toBe("play");
        expect(g.mine.filter(Boolean)).toHaveLength(LEVELS[lv].m);
        expect(g.mine[first]).toBe(false);
        expect(around(g, first).some((n) => g.mine[n])).toBe(false);
        expect(g.rev.filter(Boolean).length).toBeGreaterThan(1);
      }
    }
  });

  it("digging every safe cell wins and flags every mine", () => {
    let g = reveal(newBoard("beginner"), 40, seeded(3));
    for (let i = 0; i < g.w * g.h; i++) if (!g.mine[i] && !g.rev[i]) g = reveal(g, i);
    expect(g.state).toBe("won");
    expect(g.flag).toEqual(g.mine);
    expect(flagsLeft(g)).toBe(0);
  });

  it("digging a mine loses and marks which one", () => {
    let g = reveal(newBoard("beginner"), 40, seeded(4));
    const mine = g.mine.indexOf(true);
    g = reveal(g, mine);
    expect(g.state).toBe("lost");
    expect(g.boom).toBe(mine);
    expect(reveal(g, 0)).toBe(g); // nothing happens after the game ends
  });

  it("a flagged cell can't be dug, and flags count down", () => {
    let g = reveal(newBoard("beginner"), 40, seeded(5));
    const hidden = g.rev.indexOf(false);
    g = toggleFlag(g, hidden);
    expect(flagsLeft(g)).toBe(9);
    expect(reveal(g, hidden)).toBe(g);
  });

  it("tapping a number with all its flags placed clears around it", () => {
    let g = reveal(newBoard("beginner"), 40, seeded(6));
    const num = g.rev.findIndex((r, i) => r && count(g, i) > 0 && around(g, i).some((n) => !g.rev[n] && !g.mine[n]));
    expect(num).toBeGreaterThanOrEqual(0);
    around(g, num).forEach((n) => { if (g.mine[n]) g = toggleFlag(g, n); });
    const after = reveal(g, num);
    around(g, num).forEach((n) => { if (!g.mine[n]) expect(after.rev[n]).toBe(true); });
  });

  it("a wrong flag makes a chord dig up a mine", () => {
    let g = reveal(newBoard("beginner"), 40, seeded(6));
    const num = g.rev.findIndex(
      (r, i) => r && count(g, i) === 1 && around(g, i).filter((n) => !g.rev[n] && !g.mine[n]).length > 0,
    );
    expect(num).toBeGreaterThanOrEqual(0);
    const wrong = around(g, num).find((n) => !g.rev[n] && !g.mine[n])!;
    g = toggleFlag(g, wrong);
    expect(reveal(g, num).state).toBe("lost");
  });
});
