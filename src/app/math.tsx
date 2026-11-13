import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Op, Problem, SIZES, Spec, build, generate, sheetAt } from "@/games/math/engine";
import { useStored } from "@/lib/storage";
import { Chip, Row, Screen, Win, WinCard } from "@/ui/kit";
import { C } from "@/ui/theme";
import { SaveStatus } from "@/ui/save-status";

const ROUND = 10;
const OPS: [Op, string, string][] = [
  ["add", "+", "Addition"],
  ["sub", "−", "Subtraction"],
  ["mul", "×", "Multiplication"],
  ["div", "÷", "Division"],
];
type Round = { no: number; res: ("clean" | "help")[]; tally: number };
type Q = { spec: Spec; k: number; v: string; r: string; focus: "v" | "r"; done: boolean; msg: string; good: boolean };

const sizeLabel = (op: Op, n: number) =>
  op === "div" ? `÷ ${n}-digit` : op === "mul" ? `${n}-digit × ${n === 1 ? "1" : n}` : `${n}-digit`;

export default function MathSteps() {
  const [mode, setMode, modeReady, modeStorage] = useStored<{ op: Op; n: number }>("math-mode", { op: "add", n: 2 });
  const [tally, setTally, tallyReady, tallyStorage] = useStored<number>("math-tally", 0);
  const [solved, setSolved, solvedReady, solvedStorage] = useStored<number>("math-solved", 0);
  const [bestStreak, setBestStreak, bestStreakReady, bestStreakStorage] = useStored<number>("math-best-streak", 0);
  const [round, setRound, roundReady, roundStorage] = useStored<Round>("math-round", { no: 1, res: [], tally: 0 });
  const ready = modeReady && tallyReady && solvedReady && bestStreakReady && roundReady;
  const stores = [modeStorage, tallyStorage, solvedStorage, bestStreakStorage, roundStorage];
  const storage = stores.find((s) => s.status === "error") ?? stores.find((s) => s.status === "loading") ?? stores.find((s) => s.status === "saving") ?? modeStorage;
  const [streak, setStreak] = useState(0);
  const [q, setQ] = useState<Q | null>(null);
  const [plus, setPlus] = useState("");
  const [win, setWin] = useState<Win | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const next = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fresh = (op: Op, n: number) => {
    clearTimeout(next.current);
    n = Math.min(n, Math.max(...SIZES[op]));
    setMode({ op, n });
    setQ({ spec: generate(op, n), k: 0, v: "", r: "", focus: "v", done: false, msg: "", good: false });
  };

  useEffect(() => {
    if (ready) fresh(mode.op, mode.n);
    return () => clearTimeout(next.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const P: Problem | null = useMemo(() => (q ? build(q.spec) : null), [q?.spec]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready || !q || !P) return <Screen><SaveStatus {...storage} ready={ready} /></Screen>;

  const div = q.spec.op === "div";
  const total = P.steps.length;
  const sheet = sheetAt(P, q.done ? total : q.k);

  const nudge = () => {
    shake.setValue(0);
    Animated.sequence(
      [6, -6, 4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 70, useNativeDriver: true })),
    ).start();
  };

  const check = () => {
    const a = P.answer;
    if (q.v === "") return setQ({ ...q, msg: div ? "Type the answer first, then the remainder." : "Type your answer first." });
    if ("q" in a && q.focus === "v" && q.r === "" && a.r !== 0) return setQ({ ...q, focus: "r", msg: "Now type the remainder." });
    const ok = "q" in a ? +q.v === a.q && (+q.r || 0) === a.r : +q.v === a.v;
    if (!ok) {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      nudge();
      return setQ({
        ...q,
        good: false,
        msg: "q" in a && +q.v === a.q ? "The answer part is right. Check the remainder." : "Not quite. Check your work, or tap Hint for the next step.",
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const clean = q.k === 0;
    const add = "q" in a ? a.q : a.v;
    const s = streak + 1;
    setStreak(s);
    if (s > bestStreak) setBestStreak(s);
    setTally(tally + add);
    setSolved(solved + 1);
    setPlus(`+${add.toLocaleString()}`);
    setTimeout(() => setPlus(""), 1800);
    setQ({ ...q, done: true, good: true, msg: clean ? "Correct, and no hints needed!" : "Correct!" });
    const r: Round = { ...round, res: [...round.res, clean ? "clean" : "help"], tally: round.tally + add };
    if (r.res.length >= ROUND) {
      const cleanN = r.res.filter((x) => x === "clean").length;
      setRound({ no: r.no + 1, res: [], tally: 0 });
      setWin({
        title: `Round ${r.no} complete!`,
        text: `You solved all ${ROUND} problems, ${cleanN} of them without hints, and added ${r.tally.toLocaleString()} to your tally.`,
        best: cleanN === ROUND ? "Perfect round. No hints at all!" : null,
        label: "Start next round",
        onGo: () => {
          setWin(null);
          fresh(q.spec.op, mode.n);
        },
      });
    } else {
      setRound(r);
      next.current = setTimeout(() => fresh(q.spec.op, mode.n), 1500);
    }
  };

  const key = (k: string) => {
    if (q.done) return;
    if (k === "go") return check();
    const f = q.focus;
    let val = q[f];
    if (k === "back") val = val.slice(0, -1);
    else if (val.length < 7) val = (val === "0" ? "" : val) + k;
    setQ({ ...q, [f]: val, msg: "", good: false });
  };

  return (
    <Screen>
      <SaveStatus {...storage} ready={ready} />
      <Row>
        {OPS.map(([op, sym]) => (
          <Chip key={op} label={sym} on={op === q.spec.op} onPress={() => fresh(op, mode.n)} style={st.opChip} />
        ))}
      </Row>
      <Row>
        {SIZES[q.spec.op].map((n) => (
          <Chip key={n} label={sizeLabel(q.spec.op, n)} on={n === mode.n} onPress={() => fresh(q.spec.op, n)} />
        ))}
      </Row>

      <View style={st.score}>
        <View style={{ flex: 1 }}>
          <Text style={st.k}>Your tally</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={st.big}>{tally.toLocaleString()}</Text>
            <Text style={st.plus}>{plus}</Text>
          </View>
          <Text style={st.sub}>Every answer you’ve solved, added together</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          {([["Solved", solved], ["Streak", streak], ["Best", bestStreak]] as const).map(([k, v]) => (
            <View key={k}>
              <Text style={st.k}>{k}</Text>
              <Text style={st.meta}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={st.round}>
        <Text style={st.k}>Round {round.no}</Text>
        <View style={st.dots}>
          {Array.from({ length: ROUND }, (_, i) => (
            <View
              key={i}
              style={[
                st.dot,
                round.res[i] === "clean" && { backgroundColor: C.match },
                round.res[i] === "help" && { backgroundColor: "#9fd3b8" },
                i === round.res.length && { backgroundColor: "transparent", borderWidth: 2, borderColor: C.ink },
              ]}
            />
          ))}
        </View>
        <Text style={st.roundTxt}>{round.res.length} / {ROUND}</Text>
      </View>

      <View style={st.paper}>
        {sheet.order.map((id) => {
          const row = sheet.rows[id];
          return (
            <View key={id} style={{ flexDirection: "row", height: row.small ? 24 : 40 }}>
              {row.cells.map((c, i) => {
                const ruled = row.rule && i >= row.rule[0] && i <= row.rule[1];
                return (
                  <View
                    key={i}
                    style={[
                      st.cell,
                      row.small && { justifyContent: "flex-end" },
                      ruled && { borderBottomWidth: 3, borderBottomColor: C.ink },
                      c?.barTop && { borderTopWidth: 3, borderTopColor: C.ink },
                      c?.barLeft && { borderLeftWidth: 3, borderLeftColor: C.ink },
                      c?.fresh && st.fresh,
                    ]}
                  >
                    {c && (
                      <Text
                        style={[
                          st.digit,
                          row.small && { fontSize: 15 },
                          c.pencil && { color: q.done ? C.match : C.pencil },
                          c.strike && st.strike,
                        ]}
                      >
                        {c.ch}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <Row>
        <Chip
          label={q.k >= total ? "All steps shown" : q.k ? `Next hint (${q.k + 1} of ${total})` : "Hint"}
          primary
          disabled={q.k >= total || q.done}
          onPress={() => setQ({ ...q, k: q.k + 1 })}
        />
        <Chip label="New problem" onPress={() => { setStreak(0); fresh(q.spec.op, mode.n); }} />
      </Row>
      {q.k > 0 && (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          {P.steps.slice(0, q.k).map((step, i) => (
            <Text key={i} style={[st.step, i === q.k - 1 && st.stepNow]}>
              {i + 1}. {step.text}
            </Text>
          ))}
        </View>
      )}

      <Text style={st.question}>{P.label} = ?</Text>
      <Animated.View style={[st.answer, { transform: [{ translateX: shake }] }]}>
        <Box value={q.v} focus={q.focus === "v" && !q.done} right={q.done} onPress={() => setQ({ ...q, focus: "v" })} label="Answer" />
        {div && (
          <>
            <Text style={st.rLabel}>R</Text>
            <Box value={q.r} focus={q.focus === "r" && !q.done} right={q.done} onPress={() => setQ({ ...q, focus: "r" })} label="Remainder" />
          </>
        )}
      </Animated.View>
      <Text style={[st.feedback, q.good && { color: C.match, fontWeight: "600" }]} accessibilityLiveRegion="polite">
        {q.msg}
      </Text>
      <View style={st.keys}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "go"].map((k) => (
          <Pressable
            key={k}
            onPress={() => key(k)}
            accessibilityRole="button"
            accessibilityLabel={k === "back" ? "Delete" : k === "go" ? "Check" : k}
            style={({ pressed }) => [st.key, k === "go" && st.go, pressed && { transform: [{ translateY: 1 }], opacity: 0.85 }]}
          >
            <Text style={[st.keyText, k === "go" && { color: "#fff", fontSize: 17 }]}>
              {k === "back" ? "⌫" : k === "go" ? "Check" : k}
            </Text>
          </Pressable>
        ))}
      </View>
      <WinCard win={win} />
    </Screen>
  );
}

const Box = ({ value, focus, right, onPress, label }: { value: string; focus: boolean; right: boolean; onPress: () => void; label: string }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${label}: ${value || "empty"}`}
    style={[st.box, focus && st.boxFocus, right && st.boxRight]}
  >
    <Text style={[st.boxText, !value && { color: C.line }]}>{value || "?"}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  opChip: { minWidth: 50, alignItems: "center" },
  score: { flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-end", borderTopWidth: 3, borderTopColor: C.ink, paddingTop: 12 },
  k: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: C.muted },
  big: { fontSize: 48, fontWeight: "800", color: C.ink, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  plus: { fontSize: 18, fontWeight: "700", color: C.match },
  sub: { fontSize: 13, color: C.muted },
  meta: { fontSize: 24, fontWeight: "800", color: C.ink, fontVariant: ["tabular-nums"] },
  round: { flexDirection: "row", alignItems: "center", gap: 10 },
  dots: { flex: 1, flexDirection: "row", gap: 5 },
  dot: { flex: 1, maxWidth: 34, height: 10, borderRadius: 5, backgroundColor: C.line },
  roundTxt: { fontSize: 14, fontWeight: "700", color: C.ink, fontVariant: ["tabular-nums"] },
  paper: {
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cell: { width: 32, alignItems: "center", justifyContent: "center" },
  digit: { fontSize: 28, fontWeight: "700", color: C.ink, fontVariant: ["tabular-nums"] },
  strike: { color: C.muted, textDecorationLine: "line-through", textDecorationColor: C.pencil },
  fresh: { backgroundColor: "#dbe2ff", borderRadius: 4 },
  step: { fontSize: 16, lineHeight: 23, color: C.muted },
  stepNow: { color: C.ink, fontWeight: "700", fontSize: 17 },
  question: { fontSize: 28, fontWeight: "800", color: C.ink, textAlign: "center", fontVariant: ["tabular-nums"] },
  answer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rLabel: { fontSize: 16, fontWeight: "700", color: C.muted },
  box: {
    minWidth: 100,
    height: 60,
    paddingHorizontal: 12,
    backgroundColor: C.panel,
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFocus: { borderColor: C.pencil },
  boxRight: { borderColor: C.match, backgroundColor: "#e6f4ec" },
  boxText: { fontSize: 30, fontWeight: "800", color: C.ink, fontVariant: ["tabular-nums"] },
  feedback: { textAlign: "center", minHeight: 40, fontSize: 15, color: C.muted },
  keys: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  key: {
    width: "31.5%",
    flexGrow: 1,
    height: 56,
    backgroundColor: C.panel,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  go: { backgroundColor: C.match, borderColor: C.match },
  keyText: { fontSize: 24, fontWeight: "700", color: C.ink },
});
