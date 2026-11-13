import { Rng, shuffle } from "@/lib/random";

export type Animal = { emoji: string; name: string };

export const ANIMALS: Animal[] = [
  { emoji: "🐶", name: "Dog" },
  { emoji: "🐱", name: "Cat" },
  { emoji: "🐭", name: "Mouse" },
  { emoji: "🐰", name: "Rabbit" },
  { emoji: "🦊", name: "Fox" },
  { emoji: "🐻", name: "Bear" },
  { emoji: "🐼", name: "Panda" },
  { emoji: "🐨", name: "Koala" },
  { emoji: "🐯", name: "Tiger" },
  { emoji: "🦁", name: "Lion" },
  { emoji: "🐮", name: "Cow" },
  { emoji: "🐷", name: "Pig" },
  { emoji: "🐸", name: "Frog" },
  { emoji: "🐵", name: "Monkey" },
  { emoji: "🐔", name: "Chicken" },
  { emoji: "🐧", name: "Penguin" },
  { emoji: "🦉", name: "Owl" },
  { emoji: "🦆", name: "Duck" },
  { emoji: "🐴", name: "Horse" },
  { emoji: "🦄", name: "Unicorn" },
  { emoji: "🐝", name: "Bee" },
  { emoji: "🐢", name: "Turtle" },
  { emoji: "🐙", name: "Octopus" },
  { emoji: "🐬", name: "Dolphin" },
  { emoji: "🐳", name: "Whale" },
  { emoji: "🦒", name: "Giraffe" },
  { emoji: "🐘", name: "Elephant" },
  { emoji: "🦓", name: "Zebra" },
  { emoji: "🦔", name: "Hedgehog" },
  { emoji: "🦩", name: "Flamingo" },
];

export const LEVELS = [6, 10, 15] as const;
export type Level = (typeof LEVELS)[number];
export const COLUMNS: Record<Level, number> = { 6: 4, 10: 5, 15: 6 };

export type PairsGame = {
  pairs: Level;
  deck: number[]; // index into ANIMALS, each appears twice
  done: number[]; // card positions matched
  up: number[]; // card positions face up and not yet matched (0-2)
  moves: number;
  caught: number[]; // ANIMALS indices, in the order matched
};

export type FlipResult = "ignored" | "first" | "match" | "miss" | "won";

export function newGame(pairs: Level, rng?: Rng): PairsGame {
  const picks = shuffle(ANIMALS.map((_, i) => i), rng).slice(0, pairs);
  return {
    pairs,
    deck: shuffle([...picks, ...picks], rng),
    done: [],
    up: [],
    moves: 0,
    caught: [],
  };
}

// Flip card i. A miss leaves both cards up; call hideMiss after a pause.
export function flip(g: PairsGame, i: number): { game: PairsGame; result: FlipResult } {
  if (g.up.length >= 2 || g.done.includes(i) || g.up.includes(i)) {
    return { game: g, result: "ignored" };
  }
  const up = [...g.up, i];
  if (up.length < 2) return { game: { ...g, up }, result: "first" };

  const [a, b] = up;
  const moves = g.moves + 1;
  if (g.deck[a] !== g.deck[b]) return { game: { ...g, up, moves }, result: "miss" };

  const game = {
    ...g,
    up: [],
    moves,
    done: [...g.done, a, b],
    caught: [...g.caught, g.deck[a]],
  };
  return { game, result: game.done.length === game.deck.length ? "won" : "match" };
}

export const hideMiss = (g: PairsGame): PairsGame => ({ ...g, up: [] });

export type Best = { moves: number; secs: number };

export const isNewBest = (best: Best | null, moves: number, secs: number) =>
  !best || moves < best.moves || (moves === best.moves && secs < best.secs);
