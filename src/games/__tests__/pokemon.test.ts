/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { POKEMON, QUESTIONS, ask, freshProgress, guess, remaining, restoreProgress, startRound, usefulQuestions } from "../pokemon/logic";
import { seeded } from "@/lib/random";

describe("Pokémon Guess Who", () => {
  it("has 48 distinct Pokémon with offline images", () => {
    expect(POKEMON).toHaveLength(48);
    expect(new Set(POKEMON.map((p) => p.id)).size).toBe(48);
    for (const p of POKEMON) {
      expect(fs.readFileSync(path.resolve(`assets/pokemon/${p.id}.png`)).subarray(1, 4).toString()).toBe("PNG");
    }
  });

  it("clues always keep the answer and reduce the board", () => {
    for (let seed = 0; seed < 100; seed++) {
      let progress = startRound(freshProgress(), seeded(seed));
      expect(new Set(progress.round!.board).size).toBe(12);
      let options = usefulQuestions(progress.round!);
      while (options.length) {
        const before = remaining(progress.round!).length;
        progress = ask(progress, options[0].id);
        expect(remaining(progress.round!)).toContain(progress.round!.target);
        expect(remaining(progress.round!).length).toBeLessThan(before);
        options = usefulQuestions(progress.round!);
      }
    }
  });

  it("wrong guesses can be retried and winning counts only once", () => {
    let p = startRound(freshProgress(), seeded(1));
    const target = p.round!.target;
    const wrong = p.round!.board.find((id) => id !== target)!;
    p = guess(p, wrong);
    expect(remaining(p.round!)).not.toContain(wrong);
    expect(p.caught).toEqual([]);
    p = guess(p, target);
    expect(p.caught).toEqual([target]);
    expect(p.wins).toBe(1);
    expect(guess(p, target)).toBe(p);
    expect(ask(p, QUESTIONS[0].id)).toBe(p);
  });

  it("allows collecting the full roster without repeats or resetting progress", () => {
    let p = freshProgress();
    const rng = seeded(9);
    for (let n = 0; n < POKEMON.length; n++) {
      p = startRound(p, rng);
      expect(p.caught).not.toContain(p.round!.target);
      p = guess(p, p.round!.target);
    }
    expect(p.caught).toHaveLength(48);
    p = startRound(p, rng);
    p = guess(p, p.round!.target);
    expect(p.caught).toHaveLength(48);
    expect(p.wins).toBe(49);
  });

  it("round trips a partial game and preserves the answer, clues and guesses", () => {
    let p = startRound(freshProgress(), seeded(3));
    p = guess(p, p.round!.board.find((id) => id !== p.round!.target)!);
    p = ask(p, usefulQuestions(p.round!)[0].id);
    expect(restoreProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it("rejects invalid saves instead of silently erasing progress", () => {
    for (const value of [null, {}, { ...freshProgress(), version: 2 }, { ...freshProgress(), caught: [9999] }, { ...freshProgress(), wins: -1 }]) {
      expect(() => restoreProgress(value)).toThrow();
    }
    const p = startRound(freshProgress(), seeded(1));
    expect(() => restoreProgress({ ...p, round: { ...p.round, asked: ["bad-clue"] } })).toThrow();
  });
});
