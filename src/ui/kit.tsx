import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "./theme";

export function Screen({ children, scroll = true, scrollEnabled = true }: { children: ReactNode; scroll?: boolean; scrollEnabled?: boolean }) {
  const body = <View style={s.body}>{children}</View>;
  return (
    <SafeAreaView style={s.safe} edges={["bottom", "left", "right"]}>
      {scroll ? <ScrollView contentContainerStyle={s.scroll} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Chip({
  label,
  on,
  onPress,
  primary,
  disabled,
  style,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={({ pressed }) => [
        s.chip,
        on && s.chipOn,
        primary && s.chipPrimary,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[s.chipText, (on || primary) && { color: primary ? "#fff" : C.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.row, style]}>{children}</View>;
}

export function Stats({ items }: { items: [string, string | number][] }) {
  return (
    <View style={s.stats}>
      {items.map(([k, v], i) => (
        <View key={k} style={[s.stat, i > 0 && s.statDivider]}>
          <Text style={s.statK}>{k}</Text>
          <Text style={s.statV} numberOfLines={1}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={s.note}>{children}</Text>;
}

export type Win = { title: string; text: string; best?: string | null; label: string; onGo: () => void };

// The end-of-game card. Appears after a short pause so the last move is seen.
export function WinCard({ win }: { win: Win | null }) {
  const [shown, setShown] = useState<Win | null>(null);
  useEffect(() => {
    if (!win) return setShown(null);
    const t = setTimeout(() => setShown(win), 450);
    return () => clearTimeout(t);
  }, [win]);
  return (
    <Modal visible={!!shown} transparent animationType="fade" onRequestClose={() => shown?.onGo()}>
      <View style={s.winWrap}>
        {shown && (
          <View style={s.winBox} accessibilityRole="alert">
            <Text style={s.winTitle}>{shown.title}</Text>
            <Text style={s.winText}>{shown.text}</Text>
            {shown.best ? <Text style={s.winBest}>{shown.best}</Text> : null}
            <Chip label={shown.label} primary onPress={shown.onGo} style={{ alignSelf: "center" }} />
          </View>
        )}
      </View>
    </Modal>
  );
}

// Calls fn every second while `running` is true.
export function useTicker(running: boolean, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => ref.current(), 1000);
    return () => clearInterval(t);
  }, [running]);
}

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1 },
  body: { flex: 1, padding: 16, gap: 14, width: "100%", maxWidth: 760, alignSelf: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: {
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipPrimary: { backgroundColor: C.red, borderColor: C.red },
  chipText: { fontSize: 14, fontWeight: "500", color: C.ink },
  stats: { flexDirection: "row", backgroundColor: C.panel, borderColor: C.line, borderWidth: 1.5, borderRadius: 12 },
  stat: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, gap: 2 },
  statDivider: { borderLeftWidth: 1.5, borderLeftColor: C.line },
  statK: { fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: C.muted },
  statV: { fontSize: 17, fontWeight: "700", color: C.ink, fontVariant: ["tabular-nums"] },
  note: { fontSize: 13, color: C.muted, textAlign: "center" },
  winWrap: { flex: 1, backgroundColor: "rgba(238,241,246,0.8)", justifyContent: "center", alignItems: "center", padding: 16 },
  winBox: {
    backgroundColor: C.panel,
    borderColor: C.line,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 10,
  },
  winTitle: { fontSize: 22, fontWeight: "800", color: C.ink, textAlign: "center" },
  winText: { fontSize: 15, color: C.muted, textAlign: "center" },
  winBest: { fontSize: 15, fontWeight: "700", color: C.match, textAlign: "center" },
});
