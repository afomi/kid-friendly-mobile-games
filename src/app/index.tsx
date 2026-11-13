import { Href, router, useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ITEMS } from "@/games/alchemy/logic";
import { load } from "@/lib/storage";
import { Screen } from "@/ui/kit";
import { C } from "@/ui/theme";

type Bests = { alchemy: string; pairs: string; lights: string; mines: string; math: string };

async function readBests(): Promise<Bests> {
  const pb = (await Promise.all([6, 10, 15].map((n) => load<{ moves: number } | null>(`pairs-best-${n}`, null)))).filter(
    (b): b is { moves: number } => !!b,
  );
  const level = await load<number>("lights-level", 1);
  const mines = await load<number | null>("mines-best-beginner", null);
  const found = await load<Record<string, unknown> | null>("alchemy-found", null);
  const tally = await load<number>("math-tally", 0);
  return {
    alchemy: found ? `Discovered ${Object.keys(found).length} of ${ITEMS.length}` : `${ITEMS.length} things to discover`,
    pairs: pb.length ? `Best: ${Math.min(...pb.map((b) => b.moves))} moves` : "",
    lights: level > 1 ? `Reached level ${level}` : "",
    mines: mines ? `Beginner best: ${mines}s` : "",
    math: tally ? `Tally: ${tally.toLocaleString()}` : "",
  };
}

export default function Home() {
  const [b, setB] = useState<Bests | null>(null);
  useFocusEffect(
    useCallback(() => {
      readBests().then(setB);
    }, []),
  );

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text style={st.h}>Pick a game</Text>
        <Text style={st.sub}>Five small games in one place. Your progress is saved on this device.</Text>
      </View>
      <Tile href="/alchemy" title="Alchemy" best={b?.alchemy} art={<AlchemyArt />}
        text="Drag two things together to make something new. Start with water, fire, earth and air." />
      <Tile href="/pairs" title="Animal Pairs" best={b?.pairs} art={<PairsArt />}
        text="Flip two cards and find the matching animals." />
      <Tile href="/lights" title="Lights Out" best={b?.lights} art={<LightsArt />}
        text="Each press flips a light and its neighbors. Turn every light off." />
      <Tile href="/mines" title="Minesweeper" best={b?.mines} art={<MinesArt />}
        text="Clear the field using the numbers. Don't dig up a mine." />
      <Tile href="/math" title="Math Steps" best={b?.math} art={<MathArt />}
        text="Add, subtract, multiply and divide. Hints fill in the work one step at a time." />
    </Screen>
  );
}

function Tile({ href, title, text, best, art }: { href: Href; title: string; text: string; best?: string; art: ReactNode }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [st.tile, pressed && { borderColor: C.red }]}
    >
      <View style={st.art}>{art}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.title}>{title}</Text>
        <Text style={st.text}>{text}</Text>
        {best ? <Text style={st.best}>{best}</Text> : null}
      </View>
    </Pressable>
  );
}

const AlchemyArt = () => (
  <View style={[st.artFill, { backgroundColor: C.alcBoard, flexDirection: "row", gap: 3 }]}>
    {["💧", "+", "🔥", "=", "♨️"].map((c, i) => (
      <Text key={i} style={i % 2 ? { color: C.gold, fontWeight: "700" } : { fontSize: 18 }}>{c}</Text>
    ))}
  </View>
);

const PairsArt = () => (
  <View style={[st.artFill, { backgroundColor: C.face, flexDirection: "row", gap: 8 }]}>
    {[0, 6].map((r) => (
      <View key={r} style={[st.mini, { transform: [{ rotate: `${r}deg` }] }]}>
        <Text style={{ fontSize: 24 }}>🦊</Text>
      </View>
    ))}
  </View>
);

const LIT = [1, 5, 6, 7, 11, 13, 17, 18, 19, 23];
const LightsArt = () => (
  <View style={[st.artFill, { backgroundColor: C.loCase }]}>
    <View style={{ width: 5 * 10 + 4 * 3, flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
      {Array.from({ length: 25 }, (_, i) => (
        <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: LIT.includes(i) ? C.loOn : C.loOff }} />
      ))}
    </View>
  </View>
);

const MINES = ["r", "r", "1", "", "", "r", "1", "2", "", "", "r", "r", "1", "2", "", "r", "r", "r", "1", ""];
const MinesArt = () => (
  <View style={[st.artFill, { backgroundColor: C.sunk }]}>
    <View style={{ width: 5 * 14 + 4 * 2, flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
      {MINES.map((c, i) => (
        <View key={i} style={{ width: 14, height: 14, borderRadius: 2, alignItems: "center", justifyContent: "center", backgroundColor: c === "" ? C.tile : "transparent" }}>
          {c !== "" && c !== "r" ? <Text style={{ fontSize: 10, fontWeight: "800", color: C.num[+c] }}>{c}</Text> : null}
        </View>
      ))}
    </View>
  </View>
);

const MathArt = () => (
  <View style={[st.artFill, { backgroundColor: C.sunk }]}>
    {[[" ", "1", " "], [" ", "4", "7"], ["+", "3", "8"], [" ", "8", "5"]].map((r, y) => (
      <View key={y} style={{ flexDirection: "row", borderTopWidth: y === 3 ? 1.5 : 0, borderColor: C.ink }}>
        {r.map((c, x) => (
          <Text key={x} style={{ width: 14, textAlign: "center", fontSize: y === 0 ? 9 : 13, color: y === 0 || y === 3 ? C.pencil : C.ink }}>{c}</Text>
        ))}
      </View>
    ))}
  </View>
);

const st = StyleSheet.create({
  h: { fontSize: 22, fontWeight: "800", color: C.ink },
  sub: { fontSize: 15, color: C.muted },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  art: { width: 110, height: 84, borderRadius: 10, overflow: "hidden" },
  artFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  mini: { width: 36, height: 48, borderRadius: 6, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "800", color: C.ink },
  text: { fontSize: 13, color: C.muted, lineHeight: 18 },
  best: { fontSize: 12, fontWeight: "600", color: C.match },
});
