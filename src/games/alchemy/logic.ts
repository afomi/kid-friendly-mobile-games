import data from "./data.json";
import { Rng, pick } from "@/lib/random";

export type Item = { name: string; emoji: string; category: string };

export const ITEMS: Item[] = data.items;
export const RECIPES = data.recipes as [number, number, number][];
export const STARTERS = [0, 1, 2, 3]; // Water, Fire, Earth, Air
export const CATEGORIES = [...new Set(ITEMS.map((it) => it.category))];

const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
const BOOK = new Map(RECIPES.map(([a, b, r]) => [key(a, b), r]));

// What item `a` and item `b` make, in either order, or undefined.
export const combine = (a: number, b: number): number | undefined => BOOK.get(key(a, b));

// Discoveries: item id -> the pair that first made it (null for starters).
export type Found = Record<number, [number, number] | null>;

export const freshFound = (): Found =>
  Object.fromEntries(STARTERS.map((i) => [i, null]));

export function discover(found: Found, a: number, b: number) {
  const r = combine(a, b);
  if (r === undefined) return { found, result: undefined, isNew: false };
  if (r in found) return { found, result: r, isNew: false };
  return { found: { ...found, [r]: [a, b] as [number, number] }, result: r, isNew: true };
}

// Recipes you can make right now that give something new.
export const makeable = (found: Found) =>
  RECIPES.filter(([a, b, r]) => a in found && b in found && !(r in found));

export const pickHint = (found: Found, rng?: Rng) => {
  const opts = makeable(found);
  return opts.length ? pick(opts, rng) : null;
};

// A milestone line for the discovery card, if this one earned it.
export function milestone(found: Found, r: number): string | null {
  const n = Object.keys(found).length;
  const cat = ITEMS[r].category;
  if (n === ITEMS.length) return "You discovered everything!";
  if (ITEMS.every((it, i) => it.category !== cat || i in found)) return `You found every ${cat} item!`;
  if (n % 25 === 0) return `${n} discoveries!`;
  return null;
}
