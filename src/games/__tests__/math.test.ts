import { describe, expect, it } from "@jest/globals";
import { Op, SIZES, build, buildAdd, buildDiv, buildSub, generate, sheetAt, sheetResult } from "../math/engine";
import { seeded } from "@/lib/random";

const truth = (op: Op, a: number, b: number) =>
  op === "add" ? a + b : op === "sub" ? a - b : op === "mul" ? a * b : Math.floor(a / b);

describe("Math Steps", () => {
  it("for every operation and size, the pencilled work ends at the right answer", () => {
    const rng = seeded(2026);
    for (const op of Object.keys(SIZES) as Op[]) {
      for (const n of SIZES[op]) {
        for (let k = 0; k < 40; k++) {
          const spec = generate(op, n, rng);
          const P = build(spec);
          expect(sheetResult(P, spec)).toBe(truth(op, spec.a, spec.b));
          const ans = P.answer;
          if ("v" in ans) expect(ans.v).toBe(truth(op, spec.a, spec.b));
          else expect(ans.q * spec.b + ans.r).toBe(spec.a);
        }
      }
    }
  });

  it("subtraction never asks for a negative answer", () => {
    const rng = seeded(1);
    for (let k = 0; k < 100; k++) {
      const s = generate("sub", 3, rng);
      expect(s.a).toBeGreaterThanOrEqual(s.b);
    }
  });

  it("explains a carry", () => {
    const P = buildAdd(47, 38);
    expect(P.steps[0].text).toBe("Ones: 7 + 8 = 15. Write 5 and carry the 1 to the tens.");
    expect(P.steps[1].text).toBe("Tens: 4 + 3 + 1 carried = 8. Write 8.");
  });

  it("explains borrowing across a zero", () => {
    const P = buildSub(503, 7);
    expect(P.steps[0].text).toContain("The next column is 0, so borrow from the hundreds");
    expect(sheetResult(P, { op: "sub", a: 503, b: 7 })).toBe(496);
  });

  it("long division reports the remainder", () => {
    const P = buildDiv(97, 4);
    expect(P.answer).toEqual({ q: 24, r: 1 });
    expect(P.steps.at(-1)!.text).toBe("No more digits to bring down. 97 ÷ 4 = 24 remainder 1.");
  });

  it("only the latest step's digits are marked fresh", () => {
    const P = buildAdd(47, 38);
    const fresh = (k: number) =>
      Object.values(sheetAt(P, k).rows).flatMap((r) => r.cells).filter((c) => c?.fresh).length;
    expect(fresh(0)).toBe(0);
    expect(fresh(1)).toBe(2); // the 5 and the carried 1
    expect(fresh(2)).toBe(1);
  });
});
