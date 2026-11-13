// Worked-problem engine: builds a problem as a grid "sheet" plus an ordered
// list of steps. Each step has kid-facing text and a function that pencils
// its digits onto the sheet. Pure: no UI.
import { Rng, randInt } from "@/lib/random";

export type Op = "add" | "sub" | "mul" | "div";

export type Mark = {
  ch: string;
  pencil?: boolean; // worked digit (blue, green once solved)
  strike?: boolean; // crossed out by a borrow
  fresh?: boolean; // written by the latest step
  barTop?: boolean; // division bracket top
  barLeft?: boolean; // division bracket side
};
type Style = Omit<Mark, "ch" | "fresh">;

export type Row = { id: string; small: boolean; cells: (Mark | null)[]; rule: [number, number] | null };
export type Sheet = { cols: number; rows: Record<string, Row>; order: string[] };

export type Step = { text: string; fn: (s: Sheet) => void };
export type Answer = { v: number } | { q: number; r: number };
export type Problem = {
  label: string;
  cols: number;
  answer: Answer;
  rows: { id: string; small?: boolean }[];
  base: (s: Sheet) => void;
  steps: Step[];
};

const PLACE = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const dig = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;
const len = (n: number) => String(n).length;

let freshMark = false;

function mkSheet(P: Problem): Sheet {
  const s: Sheet = { cols: P.cols, rows: {}, order: [] };
  for (const r of P.rows) {
    s.rows[r.id] = { id: r.id, small: !!r.small, cells: Array(P.cols).fill(null), rule: null };
    s.order.push(r.id);
  }
  return s;
}

function put(s: Sheet, id: string, c: number, ch: string | number | null, style: Style = {}) {
  s.rows[id].cells[c] =
    ch === "" || ch == null ? null : { ch: String(ch), ...style, ...(freshMark ? { fresh: true } : {}) };
}

function putNum(s: Sheet, id: string, end: number, n: number | string, style?: Style) {
  const str = String(n);
  for (let i = 0; i < str.length; i++) put(s, id, end - str.length + 1 + i, str[i], style);
}

// The sheet after the first k steps; the k-th step's marks are flagged fresh.
export function sheetAt(P: Problem, k: number): Sheet {
  const s = mkSheet(P);
  freshMark = false;
  P.base(s);
  for (let i = 0; i < k; i++) {
    freshMark = i === k - 1;
    P.steps[i].fn(s);
  }
  freshMark = false;
  return s;
}

const pencil: Style = { pencil: true };

export function buildAdd(a: number, b: number): Problem {
  const L = Math.max(len(a), len(b));
  const W = L + 2;
  const col = (p: number) => W - 1 - p;
  const steps: Step[] = [];
  let carry = 0;
  for (let p = 0; p < L; p++) {
    const da = dig(a, p);
    const db = p < len(b) ? dig(b, p) : 0;
    const s = da + db + carry;
    const cin = carry;
    const last = p === L - 1;
    let t = `${cap(PLACE[p])}: ${da} + ${db}${cin ? ` + ${cin} carried` : ""} = ${s}. `;
    t += s >= 10 && !last ? `Write ${s % 10} and carry the 1 to the ${PLACE[p + 1]}.` : `Write ${s}.`;
    steps.push({
      text: t,
      fn: (sh) => {
        put(sh, "res", col(p), s % 10, pencil);
        if (s >= 10) {
          if (last) put(sh, "res", col(p + 1), 1, pencil);
          else put(sh, "carry", col(p + 1), 1, pencil);
        }
      },
    });
    carry = s >= 10 ? 1 : 0;
  }
  return {
    label: `${a} + ${b}`,
    cols: W,
    answer: { v: a + b },
    rows: [{ id: "carry", small: true }, { id: "a" }, { id: "b" }, { id: "res" }],
    base: (sh) => {
      putNum(sh, "a", W - 1, a);
      putNum(sh, "b", W - 1, b);
      put(sh, "b", 0, "+");
      sh.rows.b.rule = [0, W - 1];
    },
    steps,
  };
}

export function buildSub(a: number, b: number): Problem {
  if (b > a) [a, b] = [b, a];
  const L = len(a);
  const W = L + 1;
  const col = (p: number) => W - 1 - p;
  const ansLen = len(a - b);
  const cur = Array.from({ length: L }, (_, p) => dig(a, p));
  const steps: Step[] = [];
  for (let p = 0; p < L; p++) {
    const db = p < len(b) ? dig(b, p) : 0;
    let t = `${cap(PLACE[p])}: `;
    const changes: [number, number][] = [];
    if (cur[p] < db) {
      let j = p + 1;
      while (cur[j] === 0) j++;
      const old = cur[p];
      const oldj = cur[j];
      cur[j]--;
      changes.push([j, cur[j]]);
      for (let k = j - 1; k > p; k--) {
        cur[k] = 9;
        changes.push([k, 9]);
      }
      cur[p] += 10;
      changes.push([p, cur[p]]);
      t +=
        j === p + 1
          ? `${old} is smaller than ${db}, so borrow 1 from the ${PLACE[j]}. The ${oldj} becomes ${cur[j]} and the ${old} becomes ${cur[p]}. `
          : `${old} is smaller than ${db}. The next column is 0, so borrow from the ${PLACE[j]}: ${oldj} becomes ${cur[j]}, each 0 becomes 9, and the ${old} becomes ${cur[p]}. `;
    }
    const r = cur[p] - db;
    const lead = p >= ansLen;
    t += `${cur[p]} − ${db} = ${r}.` + (lead ? " That's a leading zero, so leave it blank." : "");
    steps.push({
      text: t,
      fn: (sh) => {
        for (const [c, v] of changes) {
          put(sh, "a", col(c), dig(a, c), { strike: true });
          put(sh, "borrow", col(c), v, pencil);
        }
        if (!lead) put(sh, "res", col(p), r, pencil);
      },
    });
  }
  return {
    label: `${a} − ${b}`,
    cols: W,
    answer: { v: a - b },
    rows: [{ id: "borrow", small: true }, { id: "a" }, { id: "b" }, { id: "res" }],
    base: (sh) => {
      putNum(sh, "a", W - 1, a);
      putNum(sh, "b", W - 1, b);
      put(sh, "b", 0, "−");
      sh.rows.b.rule = [0, W - 1];
    },
    steps,
  };
}

export function buildMul(a: number, b: number): Problem {
  const la = len(a);
  const lb = len(b);
  const W = la + lb + 1;
  const col = (p: number) => W - 1 - p;
  const rows: Problem["rows"] = [{ id: "carry", small: true }, { id: "a" }, { id: "b" }];
  if (lb > 1) rows.push({ id: "scarry", small: true });
  for (let j = 0; j < lb; j++) rows.push({ id: "pp" + j });
  if (lb > 1) rows.push({ id: "sum" });
  const steps: Step[] = [];
  const ppd: Record<number, number>[] = [];

  for (let j = 0; j < lb; j++) {
    const dj = dig(b, j);
    ppd[j] = {};
    if (j > 0) {
      steps.push({
        text: `Now multiply by the ${PLACE[j]} digit, ${dj}. Write ${j === 1 ? "a 0" : j + " zeros"} on the right as a placeholder.`,
        fn: (sh) => {
          for (let c = 0; c < W; c++) put(sh, "carry", c, "");
          for (let p = 0; p < j; p++) put(sh, "pp" + j, col(p), 0, pencil);
        },
      });
      for (let p = 0; p < j; p++) ppd[j][p] = 0;
    }
    let carry = 0;
    for (let i = 0; i < la; i++) {
      const di = dig(a, i);
      const prod = di * dj + carry;
      const cin = carry;
      const last = i === la - 1;
      let t = `${dj} × ${di} = ${di * dj}${cin ? `, plus the carried ${cin} makes ${prod}` : ""}. `;
      t += !last && prod >= 10 ? `Write ${prod % 10} and carry the ${Math.floor(prod / 10)}.` : `Write ${prod}.`;
      ppd[j][i + j] = prod % 10;
      if (last && prod >= 10) ppd[j][i + j + 1] = Math.floor(prod / 10);
      steps.push({
        text: t,
        fn: (sh) => {
          put(sh, "pp" + j, col(i + j), prod % 10, pencil);
          if (!last) put(sh, "carry", col(i + 1), prod >= 10 ? Math.floor(prod / 10) : "", pencil);
          else if (prod >= 10) put(sh, "pp" + j, col(i + j + 1), Math.floor(prod / 10), pencil);
        },
      });
      carry = Math.floor(prod / 10);
    }
  }

  if (lb > 1) {
    const L = len(a * b);
    let carry = 0;
    steps.push({
      text: "Now add the rows together, one column at a time.",
      fn: (sh) => {
        for (let c = 0; c < W; c++) put(sh, "carry", c, "");
        put(sh, "pp" + (lb - 1), 0, "+");
        sh.rows["pp" + (lb - 1)].rule = [0, W - 1];
      },
    });
    for (let p = 0; p < L; p++) {
      const ds = ppd.map((m) => m[p]).filter((v) => v !== undefined);
      const s = ds.reduce((x, y) => x + y, 0) + carry;
      const cin = carry;
      const last = p === L - 1;
      const sumTxt = ds.length > 1 || cin ? `${ds.join(" + ")}${cin ? ` + ${cin} carried` : ""} = ${s}` : `just ${s}`;
      const t =
        `${cap(PLACE[p])}: ${sumTxt}. ` +
        (!last && s >= 10 ? `Write ${s % 10} and carry the ${Math.floor(s / 10)}.` : `Write ${s}.`);
      steps.push({
        text: t,
        fn: (sh) => {
          if (last) putNum(sh, "sum", col(p), s, pencil);
          else {
            put(sh, "sum", col(p), s % 10, pencil);
            if (s >= 10) put(sh, "scarry", col(p + 1), Math.floor(s / 10), pencil);
          }
        },
      });
      carry = Math.floor(s / 10);
    }
  }

  return {
    label: `${a} × ${b}`,
    cols: W,
    answer: { v: a * b },
    rows,
    base: (sh) => {
      putNum(sh, "a", W - 1, a);
      putNum(sh, "b", W - 1, b);
      put(sh, "b", 0, "×");
      sh.rows.b.rule = [0, W - 1];
    },
    steps,
  };
}

export function buildDiv(N: number, d: number): Problem {
  const S = String(N);
  const ld = len(d);
  const ln = S.length;
  const D0 = ld + 1;
  const cols = D0 + ln;
  const rows: Problem["rows"] = [{ id: "q" }, { id: "n" }];
  const steps: Step[] = [];
  let e = 0;
  let cur = +S[0];
  let k = 0;
  let remRow: string | null = null;
  const skipped: number[] = [];
  while (cur < d && e < ln - 1) {
    skipped.push(cur);
    e++;
    cur = cur * 10 + +S[e];
  }
  let lead = skipped.length ? `${d} doesn't go into ${skipped.join(" or ")}, so start with ${cur}. ` : "";

  while (true) {
    const q = Math.floor(cur / d);
    const ec = e;
    const c0 = cur;
    steps.push({
      text:
        lead +
        `How many times does ${d} go into ${cur}? ${q === 0 ? "Zero times" : q === 1 ? "1 time" : q + " times"}${q ? ` (${q} × ${d} = ${q * d})` : ""}. Write ${q} on top.`,
      fn: (sh) => put(sh, "q", D0 + ec, q, pencil),
    });
    lead = "";
    if (q > 0) {
      const pr = q * d;
      const rem = cur - pr;
      const pid = "p" + k;
      const rid = "r" + k;
      k++;
      rows.push({ id: pid }, { id: rid });
      const w = Math.max(len(pr), len(c0));
      steps.push({
        text: `Subtract: ${c0} − ${pr} = ${rem}.`,
        fn: (sh) => {
          putNum(sh, pid, D0 + ec, pr, pencil);
          put(sh, pid, D0 + ec - len(pr), "−", pencil);
          sh.rows[pid].rule = [D0 + ec - w + 1, D0 + ec];
          putNum(sh, rid, D0 + ec, rem, pencil);
        },
      });
      cur = rem;
      remRow = rid;
    }
    if (e === ln - 1) {
      const Q = Math.floor(N / d);
      const R = N % d;
      const rr = remRow!;
      const er = e;
      steps.push({
        text: `No more digits to bring down. ${N} ÷ ${d} = ${Q}` + (R ? ` remainder ${R}.` : " exactly, remainder 0."),
        fn: (sh) => putNum(sh, rr, D0 + er, R, pencil),
      });
      break;
    }
    e++;
    cur = cur * 10 + +S[e];
    const rr = remRow!;
    const ee = e;
    const cc = cur;
    steps.push({
      text: `Bring down the ${S[e]} to make ${cur}.`,
      fn: (sh) => {
        for (let c = 0; c < cols; c++) put(sh, rr, c, "");
        putNum(sh, rr, D0 + ee, cc, pencil);
      },
    });
  }

  return {
    label: `${N} ÷ ${d}`,
    cols,
    answer: { q: Math.floor(N / d), r: N % d },
    rows,
    base: (sh) => {
      putNum(sh, "n", ld - 1, d);
      for (let i = 0; i < ln; i++) put(sh, "n", D0 + i, S[i], { barTop: true, barLeft: i === 0 });
    },
    steps,
  };
}

export type Spec = { op: Op; a: number; b: number };

const rndDigits = (n: number, rng?: Rng) => (n === 1 ? randInt(1, 9, rng) : randInt(10 ** (n - 1), 10 ** n - 1, rng));

export const SIZES: Record<Op, number[]> = { add: [1, 2, 3, 4], sub: [1, 2, 3, 4], mul: [1, 2, 3], div: [1, 2, 3] };

export function generate(op: Op, n: number, rng?: Rng): Spec {
  if (op === "add") return { op, a: rndDigits(n, rng), b: rndDigits(n, rng) };
  if (op === "sub") {
    let a = rndDigits(n, rng);
    let b = rndDigits(n, rng);
    if (b > a) [a, b] = [b, a];
    return { op, a, b };
  }
  if (op === "mul") return { op, a: rndDigits(n, rng), b: n === 1 ? randInt(2, 9, rng) : rndDigits(n, rng) };
  const d = n === 1 ? randInt(2, 9, rng) : rndDigits(n, rng);
  const L = n + randInt(1, 2, rng);
  let N: number;
  do {
    N = rndDigits(L, rng);
  } while (N < d);
  return { op, a: N, b: d };
}

export const build = (p: Spec): Problem =>
  p.op === "add" ? buildAdd(p.a, p.b) : p.op === "sub" ? buildSub(p.a, p.b) : p.op === "mul" ? buildMul(p.a, p.b) : buildDiv(p.a, p.b);

// Reads a finished sheet's answer row(s) back as a number, so tests can check
// that the pencilled work agrees with the arithmetic.
export function sheetResult(P: Problem, spec: Spec): number {
  const s = sheetAt(P, P.steps.length);
  const read = (id: string) =>
    Number(s.rows[id].cells.map((c) => (c && /\d/.test(c.ch) ? c.ch : "")).join("") || "0");
  if (spec.op === "add" || spec.op === "sub") return read("res");
  if (spec.op === "mul") return read(s.rows.sum ? "sum" : "pp0");
  return read("q");
}
