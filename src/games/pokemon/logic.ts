import data from "./data.json";
import { Rng, pick, shuffle } from "@/lib/random";

export type Pokemon = (typeof data)[number];
export const POKEMON: Pokemon[] = data;
export const BY_ID = new Map(POKEMON.map((p) => [p.id, p]));
export const SAVE_KEY = "pokemon-guess-who-v1";
export type Question = { id: string; label: string; matches: (p: Pokemon) => boolean };
const title = (word: string) => word[0].toUpperCase() + word.slice(1);
export const QUESTIONS: Question[] = [
  ...[...new Set(POKEMON.flatMap((p) => p.types))].sort().map((type) => ({
    id: `type-${type}`, label: `Is it a ${title(type)} type?`, matches: (p: Pokemon) => p.types.includes(type),
  })),
  ...[...new Set(POKEMON.map((p) => p.color))].sort().map((color) => ({
    id: `color-${color}`, label: `Is its Pokédex color ${color}?`, matches: (p: Pokemon) => p.color === color,
  })),
  { id: "tall", label: "Is it at least 1 meter tall?", matches: (p) => p.height >= 10 },
  { id: "legendary", label: "Is it Legendary or Mythical?", matches: (p) => p.legendary },
];
export type Round = { target: number; board: number[]; asked: string[]; guesses: number[]; won: boolean };
export type Progress = { version: 1; caught: number[]; wins: number; round: Round | null };
export const freshProgress = (): Progress => ({ version: 1, caught: [], wins: 0, round: null });

export function startRound(progress: Progress, rng?: Rng): Progress {
  // Prioritize new friends until the collection is complete.
  const unseen = POKEMON.filter((p) => !progress.caught.includes(p.id));
  const target = pick(unseen.length ? unseen : POKEMON, rng).id;
  const others = shuffle(POKEMON.filter((p) => p.id !== target).map((p) => p.id), rng).slice(0, 11);
  return { ...progress, round: { target, board: shuffle([target, ...others], rng), asked: [], guesses: [], won: false } };
}

export function remaining(round: Round): number[] {
  const target = BY_ID.get(round.target)!;
  return round.board.filter((id) => !round.guesses.includes(id) && round.asked.every((asked) => {
    const question = QUESTIONS.find((q) => q.id === asked)!;
    return question.matches(BY_ID.get(id)!) === question.matches(target);
  }));
}

export function usefulQuestions(round: Round): Question[] {
  const candidates = remaining(round).map((id) => BY_ID.get(id)!);
  return QUESTIONS.filter((q) => !round.asked.includes(q.id) && candidates.some(q.matches) && !candidates.every(q.matches));
}

export function ask(progress: Progress, id: string): Progress {
  const round = progress.round;
  if (!round || round.won || !usefulQuestions(round).some((q) => q.id === id)) return progress;
  return { ...progress, round: { ...round, asked: [...round.asked, id] } };
}

export function guess(progress: Progress, id: number): Progress {
  const round = progress.round;
  if (!round || round.won || !remaining(round).includes(id)) return progress;
  if (id !== round.target) return { ...progress, round: { ...round, guesses: [...round.guesses, id] } };
  return {
    ...progress, wins: progress.wins + 1,
    caught: [...new Set([...progress.caught, id])],
    round: { ...round, won: true },
  };
}

// Fail closed on invalid saves: leave the original bytes untouched so retry
// or a future version can recover them. Never silently erase a collection.
export function restoreProgress(value: unknown): Progress {
  const p = value as Progress | null;
  const ids = (v: unknown): v is number[] => Array.isArray(v) && v.every((id) => BY_ID.has(id)) && new Set(v).size === v.length;
  if (!p || p.version !== 1 || !ids(p.caught) || !Number.isSafeInteger(p.wins) || p.wins < p.caught.length) {
    throw new Error("Invalid Pokémon collection");
  }
  const r = p.round;
  if (r !== null) {
    if (!r || !ids(r.board) || r.board.length !== 12 || !r.board.includes(r.target) ||
      !Array.isArray(r.asked) || !r.asked.every((id) => QUESTIONS.some((q) => q.id === id)) ||
      new Set(r.asked).size !== r.asked.length || !ids(r.guesses) ||
      !r.guesses.every((id) => r.board.includes(id) && id !== r.target) || typeof r.won !== "boolean" ||
      (r.won && !p.caught.includes(r.target))) throw new Error("Invalid Pokémon round");
  }
  return p;
}
