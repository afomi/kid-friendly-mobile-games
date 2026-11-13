import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LightsGame, SIZE, hintOptions, litCount, newPuzzle, press, restart } from "@/games/lights/logic";
import { pick } from "@/lib/random";
import { useStored } from "@/lib/storage";
import { Note, Screen, Win, WinCard } from "@/ui/kit";
import { C } from "@/ui/theme";
import { SaveStatus } from "@/ui/save-status";

export default function Lights() {
  const [saved, setSaved, ready, storage] = useStored<number>("lights-level", 1);
  const [g, setG] = useState<LightsGame>(() => newPuzzle(1));
  const [hint, setHint] = useState(-1);
  const [msg, setMsg] = useState("");
  const [win, setWin] = useState<Win | null>(null);

  const begin = (level: number) => {
    setG(newPuzzle(level));
    setHint(-1);
    setWin(null);
    setMsg(level === 1 ? "Press a light to flip it and its neighbors." : "");
  };

  useEffect(() => {
    if (ready) begin(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const onPress = (i: number) => {
    if (g.done) return;
    const next = press(g, i);
    setG(next);
    setHint(-1);
    setMsg("");
    Haptics.selectionAsync();
    if (next.done) {
      const up = next.level + 1;
      if (up > saved) setSaved(up);
      setWin({
        title: "Lights out!",
        text: `Level ${next.level} cleared in ${next.moves} moves${next.moves <= next.par ? ", at or under par." : ` (par ${next.par}).`}`,
        label: "Next level",
        onGo: () => begin(up),
      });
    }
  };

  const onHint = () => {
    const opts = hintOptions(g);
    if (!opts.length) return;
    setHint(pick(opts));
    setMsg("Try the outlined button.");
  };

  if (!ready) return <Screen><SaveStatus {...storage} ready={false} /></Screen>;

  return (
    <Screen>
      <SaveStatus {...storage} ready={ready} />
      <View style={st.unit}>
        <View style={st.head}>
          <Text style={st.brand}>
            LIGHTS <Text style={{ color: C.loOn }}>OUT</Text>
          </Text>
          <Text style={st.lcd}>LV {String(g.level).padStart(2, "0")}</Text>
        </View>
        <View style={st.grid}>
          {Array.from({ length: SIZE }, (_, y) => (
            <View key={y} style={st.gridRow}>
              {Array.from({ length: SIZE }, (_, x) => {
                const i = y * SIZE + x;
                const on = g.cells[i];
                return (
                  <Pressable
                    key={i}
                    onPress={() => onPress(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${y + 1}, column ${x + 1}, ${on ? "on" : "off"}`}
                    style={({ pressed }) => [
                      st.btn,
                      on && st.on,
                      i === hint && st.hint,
                      pressed && { transform: [{ scale: 0.94 }] },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View style={st.readout}>
          {([["Moves", g.moves], ["Par", g.par], ["Lit", litCount(g)]] as const).map(([k, v]) => (
            <View key={k} style={{ flex: 1, alignItems: "center" }}>
              <Text style={st.readK}>{k}</Text>
              <Text style={st.readV}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={st.msg} accessibilityLiveRegion="polite">{msg}</Text>
        <View style={st.keys}>
          <Key label="Restart" onPress={() => { setG(restart(g)); setHint(-1); setMsg("Board reset."); }} />
          <Key label="Hint" onPress={onHint} />
          <Key label="New puzzle" onPress={() => begin(g.level)} />
        </View>
      </View>
      <Note>Par is the number of presses used to scramble the board. Every puzzle can be solved.</Note>
      <WinCard win={win} />
    </Screen>
  );
}

const Key = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [st.key, pressed && { opacity: 0.7 }]}>
    <Text style={st.keyText}>{label}</Text>
  </Pressable>
);

const st = StyleSheet.create({
  unit: {
    backgroundColor: C.loCase,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    padding: 20,
    paddingBottom: 26,
    gap: 16,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: C.loText, fontSize: 18, fontWeight: "800", letterSpacing: 1.5 },
  lcd: {
    backgroundColor: C.loLcd,
    color: C.loLcdText,
    fontWeight: "700",
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    overflow: "hidden",
    fontVariant: ["tabular-nums"],
  },
  grid: { backgroundColor: C.loWell, padding: 12, borderRadius: 14, gap: 9 },
  gridRow: { flexDirection: "row", gap: 9 },
  btn: { flex: 1, aspectRatio: 1, borderRadius: 10, backgroundColor: C.loOff },
  on: {
    backgroundColor: C.loOn,
    shadowColor: C.loOn,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  hint: { borderWidth: 3, borderColor: C.hint, borderStyle: "dashed" },
  readout: { flexDirection: "row" },
  readK: { fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#a5a29c" },
  readV: { fontSize: 20, fontWeight: "800", color: C.loText, fontVariant: ["tabular-nums"] },
  msg: { textAlign: "center", minHeight: 20, fontSize: 15, color: "#ffb3a6" },
  keys: { flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  key: { backgroundColor: C.loKey, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  keyText: { color: C.loText, fontSize: 13, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
});
