import { describe, expect, it } from "@jest/globals";
import { ITEMS, RECIPES, STARTERS, combine, discover, freshFound, makeable, milestone, pickHint } from "../alchemy/logic";
import { seeded } from "@/lib/random";

describe("Alchemy", () => {
  it("starts with water, fire, earth and air", () => {
    expect(STARTERS.map((i) => ITEMS[i].name)).toEqual(["Water", "Fire", "Earth", "Air"]);
    expect(Object.keys(freshFound()).map(Number)).toEqual(STARTERS);
  });

  it("recipes work in either order", () => {
    const steam = ITEMS.findIndex((it) => it.name === "Steam");
    expect(combine(0, 1)).toBe(steam);
    expect(combine(1, 0)).toBe(steam);
  });

  it("every recipe points at real items and no pair has two results", () => {
    const seen = new Set<string>();
    for (const [a, b, r] of RECIPES) {
      for (const i of [a, b, r]) expect(ITEMS[i]).toBeDefined();
      const k = [a, b].sort((x, y) => x - y).join(",");
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it("a kid who follows hints can discover all 301 things", () => {
    let found = freshFound();
    const rng = seeded(5);
    let hint = pickHint(found, rng);
    while (hint) {
      const r = discover(found, hint[0], hint[1]);
      expect(r.isNew).toBe(true);
      found = r.found;
      hint = pickHint(found, rng);
    }
    expect(Object.keys(found)).toHaveLength(ITEMS.length);
    expect(ITEMS.length).toBe(301);
    expect(makeable(found)).toEqual([]);
  });

  it("a pair that makes nothing changes nothing", () => {
    const found = freshFound();
    const none = [0, 1, 2, 3].flatMap((a) => [0, 1, 2, 3].map((b) => [a, b])).find(([a, b]) => combine(a, b) === undefined);
    if (none) expect(discover(found, none[0], none[1]).found).toBe(found);
  });

  it("re-making something isn't a new discovery", () => {
    const once = discover(freshFound(), 0, 1);
    expect(once.isNew).toBe(true);
    expect(discover(once.found, 1, 0).isNew).toBe(false);
  });

  it("celebrates finishing a category", () => {
    let found = freshFound();
    const space = ITEMS.map((it, i) => (it.category === "Space" ? i : -1)).filter((i) => i >= 0);
    for (const i of space) found = { ...found, [i]: [0, 0] };
    expect(milestone(found, space[0])).toBe("You found every Space item!");
  });
});
