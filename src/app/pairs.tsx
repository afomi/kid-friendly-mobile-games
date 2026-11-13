import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { ANIMALS, Best, COLUMNS, LEVELS, Level, PairsGame, flip, hideMiss, isNewBest, newGame } from "@/games/pairs/logic";
import { clock } from "@/lib/format";
import { load, save, useStored } from "@/lib/storage";
import { Chip, Note, Row, Screen, Stats, Win, WinCard, useTicker } from "@/ui/kit";
import { C } from "@/ui/theme";
import { SaveStatus } from "@/ui/save-status";

const LABEL: Record<Level, string> = { 6: "Easy · 6", 10: "Normal · 10", 15: "Hard · 15" };
const GAP = 8;

export default function Pairs() {
  const [level, setLevel, ready, storage] = useStored<Level>("pairs-level", 10);
  const [g, setG] = useState<PairsGame>(() => newGame(10));
  const [secs, setSecs] = useState(0);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState<Best | null>(null);
  const [win, setWin] = useState<Win | null>(null);
  const [width, setWidth] = useState(0);
  const missTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const start = (lv: Level) => {
    clearTimeout(missTimer.current);
    setLevel(lv);
    setG(newGame(lv));
    setSecs(0);
    setStarted(false);
    setWin(null);
    load<Best | null>(`pairs-best-${lv}`, null).then(setBest);
  };

  useEffect(() => {
    if (ready) start(level);
    return () => clearTimeout(missTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const finished = g.done.length === g.deck.length;
  useTicker(started && !finished, () => setSecs((x) => x + 1));

  const onCard = (i: number) => {
    const { game, result } = flip(g, i);
    if (result === "ignored") return;
    if (!started) setStarted(true);
    setG(game);
    if (result === "match" || result === "won") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (result === "miss") missTimer.current = setTimeout(() => setG(hideMiss), 1000);
    if (result === "won") {
      const fresh = isNewBest(best, game.moves, secs);
      if (fresh) {
        const b = { moves: game.moves, secs };
        save(`pairs-best-${level}`, b);
        setBest(b);
      }
      setWin({
        title: "You found them all!",
        text: `You matched all ${game.pairs} pairs in ${game.moves} moves and ${clock(secs)}.`,
        best: fresh ? "New best!" : null,
        label: "Play again",
        onGo: () => start(level),
      });
    }
  };

  const cols = width < 400 && level === 15 ? 5 : COLUMNS[level];
  const cardW = width ? (width - GAP * (cols - 1)) / cols : 0;

  if (!ready) return <Screen><SaveStatus {...storage} ready={false} /></Screen>;

  return (
    <Screen>
      {storage.status === "error" && <SaveStatus {...storage} ready={ready} />}
      <Row>
        {LEVELS.map((lv) => (
          <Chip key={lv} label={LABEL[lv]} on={lv === level} onPress={() => start(lv)} />
        ))}
        <Chip label="New game" primary onPress={() => start(level)} />
      </Row>
      <Stats
        items={[
          ["Moves", g.moves],
          ["Time", clock(secs)],
          ["Pairs", `${g.done.length / 2}/${g.pairs}`],
          ["Best", best ? `${best.moves} mv` : "—"],
        ]}
      />
      <View style={st.board} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {cardW > 0 &&
          g.deck.map((d, i) => (
            <Card
              key={`${g.deck.length}-${i}-${d}`}
              animal={d}
              width={cardW}
              up={g.up.includes(i)}
              done={g.done.includes(i)}
              onPress={() => onCard(i)}
            />
          ))}
      </View>
      <View style={st.dex}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={st.dexH}>Found this round</Text>
          <Text style={st.dexCount}>{g.caught.length} / {g.pairs}</Text>
        </View>
        <View style={st.dexRow}>
          {g.caught.length ? (
            g.caught.map((d) => (
              <Text key={d} style={st.dexItem} accessibilityLabel={ANIMALS[d].name}>{ANIMALS[d].emoji}</Text>
            ))
          ) : (
            <Text style={{ color: C.muted }}>Match two cards to add an animal here.</Text>
          )}
        </View>
      </View>
      <Note>A new mix of animals every game.</Note>
      <WinCard win={win} />
    </Screen>
  );
}

function Card({ animal, width, up, done, onPress }: { animal: number; width: number; up: boolean; done: boolean; onPress: () => void }) {
  const faceUp = up || done;
  const turn = useRef(new Animated.Value(faceUp ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(turn, { toValue: faceUp ? 1 : 0, duration: 320, useNativeDriver: true }).start();
  }, [faceUp, turn]);

  const back = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const front = turn.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const { emoji, name } = ANIMALS[animal];
  const h = width * (4 / 3);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={faceUp ? name : "Hidden card"}
      style={{ width, height: h }}
    >
      <Animated.View style={[st.side, st.back, { transform: [{ perspective: 800 }, { rotateY: back }] }]}>
        <View style={[st.paw, { width: width * 0.55, height: width * 0.55, borderRadius: width }]}>
          <Text style={{ fontSize: width * 0.3 }}>🐾</Text>
        </View>
      </Animated.View>
      <Animated.View
        style={[st.side, st.front, done && st.done, { transform: [{ perspective: 800 }, { rotateY: front }] }]}
      >
        <Text style={{ fontSize: width * 0.5 }}>{emoji}</Text>
        <Text style={[st.name, done && { color: C.match }]} numberOfLines={1}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  board: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  side: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },
  back: { backgroundColor: C.panel },
  paw: { backgroundColor: "#fde7e1", alignItems: "center", justifyContent: "center" },
  front: { backgroundColor: C.face },
  done: { borderColor: C.match, backgroundColor: "#e6f4ec" },
  name: { fontSize: 11, fontWeight: "600", color: C.muted, paddingHorizontal: 2 },
  dex: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 8 },
  dexH: { fontSize: 13, fontWeight: "800", color: C.ink },
  dexCount: { fontSize: 13, color: C.muted },
  dexRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, minHeight: 36, alignItems: "center" },
  dexItem: { fontSize: 28 },
});
