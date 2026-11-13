import { describe, expect, it } from "@jest/globals";
import { ANIMALS, flip, hideMiss, isNewBest, newGame } from "../pairs/logic";
import { seeded } from "@/lib/random";

describe("Pairs", () => {
  it("deals each picked animal exactly twice", () => {
    for (const pairs of [6, 10, 15] as const) {
      const g = newGame(pairs, seeded(pairs));
      expect(g.deck).toHaveLength(pairs * 2);
      const counts = new Map<number, number>();
      g.deck.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
      expect(counts.size).toBe(pairs);
      expect([...counts.values()].every((c) => c === 2)).toBe(true);
      expect([...counts.keys()].every((d) => d >= 0 && d < ANIMALS.length)).toBe(true);
    }
  });

  it("a kid who finds every pair wins and catches every animal", () => {
    let g = newGame(6, seeded(1));
    const where = new Map<number, number[]>();
    g.deck.forEach((d, i) => where.set(d, [...(where.get(d) ?? []), i]));
    let last = "";
    for (const [a, b] of where.values()) {
      ({ game: g } = flip(g, a));
      const r = flip(g, b);
      g = r.game;
      last = r.result;
    }
    expect(last).toBe("won");
    expect(g.moves).toBe(6);
    expect(g.caught).toHaveLength(6);
  });

  it("a miss counts a move, blocks a third card, then hides", () => {
    let g = newGame(6, seeded(2));
    const a = 0;
    const b = g.deck.findIndex((d, i) => i !== a && d !== g.deck[a]);
    const c = g.deck.findIndex((_, i) => i !== a && i !== b);
    g = flip(g, a).game;
    const miss = flip(g, b);
    expect(miss.result).toBe("miss");
    expect(miss.game.moves).toBe(1);
    expect(flip(miss.game, c).result).toBe("ignored");
    expect(hideMiss(miss.game).up).toEqual([]);
  });

  it("tapping a face-up card again does nothing", () => {
    const g = flip(newGame(6, seeded(3)), 0).game;
    expect(flip(g, 0).result).toBe("ignored");
  });

  it("fewer moves wins; a tie goes to the faster time", () => {
    expect(isNewBest(null, 20, 60)).toBe(true);
    expect(isNewBest({ moves: 10, secs: 30 }, 9, 99)).toBe(true);
    expect(isNewBest({ moves: 10, secs: 30 }, 10, 29)).toBe(true);
    expect(isNewBest({ moves: 10, secs: 30 }, 10, 30)).toBe(false);
  });
});
