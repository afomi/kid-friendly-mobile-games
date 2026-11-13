import * as Haptics from "expo-haptics";
import { MutableRefObject, memo, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { LEVELS, Level, MinesGame, count, flagsLeft, newBoard, reveal, toggleFlag } from "@/games/mines/logic";
import { pad3 } from "@/lib/format";
import { load, save, useStored } from "@/lib/storage";
import { Chip, Note, Row, Screen, Win, WinCard, useTicker } from "@/ui/kit";
import { C } from "@/ui/theme";

const LABEL: Record<Level, string> = { beginner: "Beginner", intermediate: "Intermediate", expert: "Expert" };

export default function Mines() {
  const [lv, setLv, ready] = useStored<Level>("mines-level", "beginner");
  const [g, setG] = useState<MinesGame>(() => newBoard("beginner"));
  const [secs, setSecs] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [win, setWin] = useState<Win | null>(null);
  const [width, setWidth] = useState(0);

  const start = (level: Level) => {
    setLv(level);
    setG(newBoard(level));
    setSecs(0);
    setWin(null);
    load<number | null>(`mines-best-${level}`, null).then(setBest);
  };

  useEffect(() => {
    if (ready) start(lv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useTicker(g.state === "play", () => setSecs((x) => x + 1));

  const settle = (next: MinesGame) => {
    setG(next);
    if (next.state === "lost" && g.state !== "lost") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (next.state === "won" && g.state !== "won") {
      const fresh = best == null || secs < best;
      if (fresh) {
        save(`mines-best-${lv}`, secs);
        setBest(secs);
      }
      setWin({
        title: "Field cleared!",
        text: `You swept the ${lv} board in ${secs} seconds.`,
        best: fresh ? "New best!" : null,
        label: "Play again",
        onGo: () => start(lv),
      });
    }
  };

  const onTap = (i: number) => {
    if (flagMode && !g.rev[i]) return onFlag(i);
    settle(reveal(g, i));
  };
  const onFlag = (i: number) => {
    const next = toggleFlag(g, i);
    if (next !== g) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setG(next);
  };

  // Cells memoize on what they show; taps go through this ref so every cell
  // always acts on the latest game, even if it didn't re-render.
  const act = useRef({ tap: onTap, flag: onFlag });
  act.current = { tap: onTap, flag: onFlag };

  // Cells shrink to fit the screen, down to 28pt; bigger boards scroll sideways.
  const cell = Math.max(28, Math.min(40, Math.floor((width - 4) / g.w) - 2));

  return (
    <Screen>
      <Row>
        {(Object.keys(LEVELS) as Level[]).map((l) => (
          <Chip key={l} label={LABEL[l]} on={l === lv} onPress={() => start(l)} />
        ))}
      </Row>
      <View style={st.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Text style={st.led} accessibilityLabel={`${flagsLeft(g)} mines left`}>{pad3(flagsLeft(g))}</Text>
        <View style={st.mode}>
          <ModeBtn label="Dig" on={!flagMode} onPress={() => setFlagMode(false)} />
          <ModeBtn label="Flag" on={flagMode} onPress={() => setFlagMode(true)} icon />
        </View>
        <Pressable onPress={() => start(lv)} style={st.restart} accessibilityRole="button">
          <Text style={st.restartText}>Restart</Text>
        </Pressable>
        <Text style={st.led} accessibilityLabel={`${secs} seconds`}>{pad3(secs)}</Text>
      </View>
      <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={st.grid}>
          {Array.from({ length: g.h }, (_, y) => (
            <View key={y} style={{ flexDirection: "row", gap: 2 }}>
              {Array.from({ length: g.w }, (_, x) => {
                const i = y * g.w + x;
                return <Cell key={i} {...cellView(g, i)} i={i} size={cell} act={act} />;
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Note>
        Long-press to flag. Tap a number whose flags are all placed to clear around it. Best: {best != null ? `${best}s` : "—"}
      </Note>
      <WinCard win={win} />
    </Screen>
  );
}

type CellView = { kind: "hidden" | "flag" | "wrong" | "open" | "mine" | "boom"; n: number };

function cellView(g: MinesGame, i: number): CellView {
  if (g.rev[i]) {
    if (g.mine[i]) return { kind: i === g.boom ? "boom" : "mine", n: 0 };
    return { kind: "open", n: count(g, i) };
  }
  if (g.flag[i]) return { kind: g.state === "lost" && !g.mine[i] ? "wrong" : "flag", n: 0 };
  if (g.state === "lost" && g.mine[i]) return { kind: "mine", n: 0 };
  return { kind: "hidden", n: 0 };
}

type Act = MutableRefObject<{ tap: (i: number) => void; flag: (i: number) => void }>;

const LABELS: Record<CellView["kind"], string> = {
  hidden: "Hidden", flag: "Flagged", wrong: "Wrong flag", open: "Empty", mine: "Mine", boom: "Mine",
};

const Cell = memo(
  function Cell({ kind, n, i, size, act }: CellView & { i: number; size: number; act: Act }) {
    const raised = kind === "hidden" || kind === "flag" || kind === "wrong";
    return (
      <Pressable
        onPress={() => act.current.tap(i)}
        onLongPress={() => act.current.flag(i)}
        delayLongPress={380}
        accessibilityRole="button"
        accessibilityLabel={kind === "open" && n ? `${n} nearby` : LABELS[kind]}
        style={[
          { width: size, height: size, borderRadius: 3, alignItems: "center", justifyContent: "center" },
          raised ? st.raised : st.sunk,
          kind === "boom" && { backgroundColor: C.red },
          kind === "wrong" && { backgroundColor: "#f6cfc6" },
        ]}
      >
        {kind === "open" && n > 0 && (
          <Text style={{ fontSize: size * 0.5, fontWeight: "800", color: C.num[n] }}>{n}</Text>
        )}
        {(kind === "flag" || kind === "wrong") && <Flag size={size * 0.62} />}
        {(kind === "mine" || kind === "boom") && <Mine size={size * 0.62} />}
      </Pressable>
    );
  },
  (a, b) => a.kind === b.kind && a.n === b.n && a.size === b.size,
);


const ModeBtn = ({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: boolean }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: on }}
    style={[st.modeBtn, on && { backgroundColor: C.ink }]}
  >
    {icon && <Flag size={14} />}
    <Text style={{ color: on ? C.bg : C.muted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
  </Pressable>
);

const Flag = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <Rect x={5} y={2} width={1.6} height={12} fill={C.ink} />
    <Path d="M6.6 2 13 5 6.6 8z" fill={C.red} />
  </Svg>
);

const Mine = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16">
    <G fill={C.ink}>
      <Circle cx={8} cy={8} r={4.6} />
      <Rect x={7.3} y={1} width={1.4} height={14} />
      <Rect x={1} y={7.3} width={14} height={1.4} />
    </G>
    <Circle cx={6.5} cy={6.5} r={1.2} fill="#fff" />
  </Svg>
);

const st = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  led: { fontSize: 20, fontWeight: "800", color: C.ink, fontVariant: ["tabular-nums"], fontFamily: "Courier", minWidth: 40 },
  mode: { flexDirection: "row", borderWidth: 1.5, borderColor: C.line, borderRadius: 999, overflow: "hidden" },
  modeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: C.panel },
  restart: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.face, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  restartText: { fontWeight: "700", fontSize: 13, color: C.ink },
  grid: { backgroundColor: C.line, padding: 2, borderRadius: 6, gap: 2 },
  raised: {
    backgroundColor: C.tile,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: C.tileHi,
    borderLeftColor: C.tileHi,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomColor: C.tileLo,
    borderRightColor: C.tileLo,
  },
  sunk: { backgroundColor: C.sunk },
});
