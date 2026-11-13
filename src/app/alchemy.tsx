import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CATEGORIES, Found, ITEMS, STARTERS, combine, discover, freshFound, milestone, pickHint } from "@/games/alchemy/logic";
import { useStored } from "@/lib/storage";
import { Chip, Note, Screen } from "@/ui/kit";
import { C } from "@/ui/theme";

type Node = { uid: number; id: number; x: number; y: number; nope?: number; pop?: boolean };
type Shown = { r: number; a: number; b: number; n: number; extra: string | null };

const NODE_W = 72;
const NODE_H = 76;
const BOARD_H = 340;
const REACH = 50; // how close a drop must land to combine

export default function Alchemy() {
  const [found, setFound, ready] = useStored<Found>("alchemy-found", freshFound());
  const [last, setLast] = useStored<number>("alchemy-last", -1);
  const [board, setBoard] = useState<Node[]>([]);
  const [boardW, setBoardW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<{ a: number; b: number; r: number; level: number } | null>(null);
  const [toast, setToast] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const uid = useRef(1);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const armT = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => [toastT, showT, armT].forEach((t) => clearTimeout(t.current)), []);

  const clampX = (x: number) => Math.max(NODE_W / 2, Math.min(boardW - NODE_W / 2, x));
  const clampY = (y: number) => Math.max(NODE_H / 2, Math.min(BOARD_H - NODE_H / 2, y));

  const make = (id: number, x: number, y: number, extra: Partial<Node> = {}): Node => ({
    uid: uid.current++, id, x: clampX(x), y: clampY(y), ...extra,
  });

  // A free spot: the best of 40 random tries, as far from other items as possible.
  const freeSpot = (nodes: Node[]) => {
    let best: [number, number] = [boardW / 2, BOARD_H / 2];
    let bestD = -1;
    for (let t = 0; t < 40; t++) {
      const cx = 50 + Math.random() * Math.max(1, boardW - 100);
      const cy = 50 + Math.random() * (BOARD_H - 110);
      const d = Math.min(999, ...nodes.map((n) => Math.hypot(n.x - cx, n.y - cy)));
      if (d > bestD) { bestD = d; best = [cx, cy]; }
      if (d > 90) break;
    }
    return best;
  };

  const seed = () => {
    setSel(null);
    setBoard(STARTERS.map((id, k) => make(id, boardW * (0.2 + 0.2 * k), BOARD_H * 0.42)));
  };

  useEffect(() => {
    if (ready && boardW && !board.length) seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, boardW]);

  const say = (msg: string) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(""), 1600);
  };

  const celebrate = (r: number, a: number, b: number, nextFound: Found) => {
    const extra = milestone(nextFound, r);
    setShown({ r, a, b, n: Object.keys(nextFound).length, extra });
    clearTimeout(showT.current);
    showT.current = setTimeout(() => setShown(null), extra ? 3200 : 2200);
  };

  // Combine the item `src` (already on the board) with `target`.
  const mix = (nodes: Node[], src: Node, target: Node) => {
    setSel(null);
    const r = combine(src.id, target.id);
    if (r === undefined) {
      say("Nothing happened. Try another pair.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return setBoard(
        nodes.map((n) =>
          n.uid === src.uid ? { ...n, x: clampX(target.x + 60), y: clampY(target.y + 10), nope: Date.now() }
          : n.uid === target.uid ? { ...n, nope: Date.now() } : n,
        ),
      );
    }
    const rest = nodes.filter((n) => n.uid !== src.uid && n.uid !== target.uid);
    setBoard([...rest, make(r, target.x, target.y, { pop: true })]);
    const d = discover(found, src.id, target.id);
    if (d.isNew) {
      setFound(d.found);
      setLast(r);
      if (hint?.r === r) setHint(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      celebrate(r, src.id, target.id, d.found);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      say(`${ITEMS[r].emoji} ${ITEMS[r].name}`);
    }
  };

  const nearest = (x: number, y: number, skip: number) => {
    let best: Node | null = null;
    let bd = REACH;
    for (const n of board) {
      if (n.uid === skip) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };

  const onTapNode = (u: number) => {
    if (sel === null || sel === u) return setSel(sel === u ? null : u);
    const a = board.find((n) => n.uid === sel);
    const b = board.find((n) => n.uid === u);
    if (a && b) mix(board, a, b);
    else setSel(null);
  };

  const onDrop = (u: number, x: number, y: number) => {
    const src = board.find((n) => n.uid === u);
    if (!src) return;
    const off = x < 0 || x > boardW || y < 0 || y > BOARD_H;
    if (off) {
      if (sel === u) setSel(null);
      return setBoard(board.filter((n) => n.uid !== u));
    }
    const t = nearest(x, y, u);
    if (t) return mix(board, src, t);
    setBoard(board.map((n) => (n.uid === u ? { ...n, x: clampX(x), y: clampY(y) } : n)));
  };

  const addFromLib = (id: number) => {
    const [x, y] = freeSpot(board);
    setBoard([...board, make(id, x, y, { pop: true })]);
  };

  const onHint = () => {
    let h = hint && !(hint.r in found) ? hint : null;
    if (!h) {
      const p = pickHint(found);
      if (!p) return setHint({ a: -1, b: -1, r: -1, level: 0 });
      h = { a: p[0], b: p[1], r: p[2], level: 0 };
    }
    setHint({ ...h, level: h.level + 1 });
  };

  const onReset = () => {
    if (!armed) {
      setArmed(true);
      armT.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(armT.current);
    setArmed(false);
    setFound(freshFound());
    setLast(-1);
    setHint(null);
    seed();
  };

  const ids = Object.keys(found).map(Number);
  const total = ITEMS.length;
  const counts = useMemo(() => {
    const have: Record<string, number> = {};
    const all: Record<string, number> = {};
    ids.forEach((i) => (have[ITEMS[i].category] = (have[ITEMS[i].category] ?? 0) + 1));
    ITEMS.forEach((it) => (all[it.category] = (all[it.category] ?? 0) + 1));
    return { have, all };
  }, [found]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = query.trim().toLowerCase();
  const library = ids
    .filter((i) => (cat === "All" || ITEMS[i].category === cat) && (!q || ITEMS[i].name.toLowerCase().includes(q)))
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));

  const hintText =
    !hint ? "" : hint.r < 0 ? "You've discovered everything!"
    : hint.level === 1 ? `Try mixing ${ITEMS[hint.a].emoji} ${ITEMS[hint.a].name} with something.`
    : `Try ${ITEMS[hint.a].emoji} ${ITEMS[hint.a].name} + ${ITEMS[hint.b].emoji} ${ITEMS[hint.b].name}.`;

  return (
    <Screen scrollEnabled={!dragging}>
      <View style={st.prog}>
        <Text style={st.progText}>{ids.length} / {total} discovered</Text>
        <View style={st.bar}>
          <View style={[st.barFill, { width: `${Math.max(1, (ids.length / total) * 100)}%` }]} />
        </View>
      </View>

      <View style={st.board} onLayout={(e) => setBoardW(e.nativeEvent.layout.width)}>
        <View style={st.ring} pointerEvents="none" />
        <Text style={st.boardHint} pointerEvents="none">Drag one thing onto another. Or tap two of them.</Text>
        {board.map((n) => (
          <BoardNode
            key={n.uid}
            node={n}
            selected={n.uid === sel}
            onTap={onTapNode}
            onDrop={onDrop}
            onDrag={setDragging}
          />
        ))}
        {toast ? <Text style={st.toast} numberOfLines={1}>{toast}</Text> : null}
        {shown && (
          <Pressable style={st.newWrap} onPress={() => setShown(null)} accessibilityRole="alert">
            <View style={st.newCard}>
              <Text style={st.newK}>NEW DISCOVERY</Text>
              <Text style={{ fontSize: 60 }}>{ITEMS[shown.r].emoji}</Text>
              <Text style={st.newName}>{ITEMS[shown.r].name}</Text>
              <Text style={st.newSub}>
                {ITEMS[shown.a].emoji} {ITEMS[shown.a].name} + {ITEMS[shown.b].emoji} {ITEMS[shown.b].name}
              </Text>
              <Text style={st.newSub}>{shown.n} of {total}</Text>
              {shown.extra ? <Text style={st.newExtra}>{shown.extra}</Text> : null}
            </View>
          </Pressable>
        )}
      </View>

      <View style={st.lib}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find something you've made"
          placeholderTextColor={C.muted}
          style={st.search}
          clearButtonMode="while-editing"
          accessibilityLabel="Search discoveries"
        />
        <View style={st.cats}>
          <Chip label="All" on={cat === "All"} onPress={() => setCat("All")} style={st.cat} />
          {CATEGORIES.filter((c) => counts.have[c]).map((c) => (
            <Chip key={c} label={`${c} ${counts.have[c]}/${counts.all[c]}`} on={cat === c} onPress={() => setCat(c)} style={st.cat} />
          ))}
        </View>
        <View style={st.grid}>
          {library.length ? (
            library.map((i) => (
              <Pressable
                key={i}
                onPress={() => addFromLib(i)}
                accessibilityRole="button"
                accessibilityLabel={`Put ${ITEMS[i].name} on the table`}
                style={({ pressed }) => [st.chip, i === last && st.chipFresh, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: 24 }}>{ITEMS[i].emoji}</Text>
                <Text style={st.chipName} numberOfLines={1}>{ITEMS[i].name}</Text>
              </Pressable>
            ))
          ) : (
            <Note>Nothing here matches.</Note>
          )}
        </View>
        {hintText ? <Text style={st.hint} accessibilityLiveRegion="polite">{hintText}</Text> : null}
        <View style={st.tools}>
          <Chip label="Hint" primary onPress={onHint} />
          <Chip label="Clear table" onPress={() => { setBoard([]); setSel(null); }} />
          <Chip label={armed ? "Tap again to erase all discoveries" : "Start over"} onPress={onReset} />
        </View>
      </View>
      <Note>Tap something in your collection to put it on the table. Drag it off the table to remove it.</Note>
    </Screen>
  );
}

function BoardNode({
  node, selected, onTap, onDrop, onDrag,
}: {
  node: Node;
  selected: boolean;
  onTap: (uid: number) => void;
  onDrop: (uid: number, x: number, y: number) => void;
  onDrag: (on: boolean) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(node.pop ? 0.3 : 1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  // Handlers change every render; the responder reads the latest through a ref.
  const latest = useRef({ node, onTap, onDrop, onDrag });
  latest.current = { node, onTap, onDrop, onDrag };

  useEffect(() => {
    if (node.pop) Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [node.pop, scale]);
  useEffect(() => {
    if (!node.nope) return;
    shake.setValue(0);
    Animated.sequence([-5, 5, -3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 70, useNativeDriver: true }))).start();
  }, [node.nope, shake]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => latest.current.onDrag(true),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          const { node: n, onTap: tap, onDrop: drop, onDrag: drag } = latest.current;
          drag(false);
          pan.setValue({ x: 0, y: 0 });
          if (Math.hypot(g.dx, g.dy) < 7) tap(n.uid);
          else drop(n.uid, n.x + g.dx, n.y + g.dy);
        },
        onPanResponderTerminate: () => {
          latest.current.onDrag(false);
          pan.setValue({ x: 0, y: 0 });
        },
      }),
    [pan],
  );

  const { name, emoji } = ITEMS[node.id];
  return (
    <Animated.View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onAccessibilityTap={() => onTap(node.uid)}
      style={[
        st.node,
        selected && st.nodeSel,
        {
          left: node.x - NODE_W / 2,
          top: node.y - NODE_H / 2,
          transform: [{ translateX: Animated.add(pan.x, shake) }, { translateY: pan.y }, { scale }],
        },
      ]}
    >
      <Text style={{ fontSize: 32 }}>{emoji}</Text>
      <Text style={st.nodeName} numberOfLines={1}>{name}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  prog: { flexDirection: "row", alignItems: "center", gap: 10 },
  progText: { fontSize: 15, fontWeight: "700", color: C.ink, fontVariant: ["tabular-nums"] },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: C.gold, borderRadius: 4 },
  board: { height: BOARD_H, borderRadius: 16, overflow: "hidden", backgroundColor: C.alcBoard },
  ring: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1.5,
    borderColor: "rgba(232,184,90,0.2)",
    alignSelf: "center",
    top: (BOARD_H - 260) / 2,
  },
  boardHint: { position: "absolute", left: 12, right: 12, bottom: 10, textAlign: "center", fontSize: 13, color: "rgba(241,236,255,0.55)" },
  node: {
    position: "absolute",
    width: NODE_W,
    height: NODE_H,
    borderRadius: 14,
    backgroundColor: C.alcNode,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 2,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 0,
    elevation: 3,
  },
  nodeSel: { borderWidth: 3, borderColor: C.gold },
  nodeName: { fontSize: 11, fontWeight: "500", color: C.alcText },
  toast: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    maxWidth: "92%",
    backgroundColor: "rgba(241,236,255,0.95)",
    color: C.ink,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  newWrap: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,17,40,0.55)", alignItems: "center", justifyContent: "center" },
  newCard: {
    backgroundColor: "#fffaf0",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 4,
    maxWidth: "86%",
    borderWidth: 4,
    borderColor: C.gold,
  },
  newK: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, color: C.goldDeep },
  newName: { fontSize: 22, fontWeight: "800", color: C.ink },
  newSub: { fontSize: 14, color: C.muted, textAlign: "center" },
  newExtra: { fontSize: 14, fontWeight: "700", color: C.goldDeep },
  lib: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 10 },
  search: {
    fontSize: 15,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.face,
    color: C.ink,
  },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cat: { paddingVertical: 4, paddingHorizontal: 9 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    width: 76,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.face,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    gap: 2,
  },
  chipFresh: { borderColor: C.gold, backgroundColor: "#fbf3e2" },
  chipName: { fontSize: 11, color: C.ink },
  hint: { fontSize: 15, color: C.ink },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
