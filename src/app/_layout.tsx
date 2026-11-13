import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { C } from "@/ui/theme";

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: C.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Medley" }} />
        <Stack.Screen name="pokemon" options={{ title: "Pokémon Guess Who" }} />
        <Stack.Screen name="alchemy" options={{ title: "Alchemy" }} />
        <Stack.Screen name="pairs" options={{ title: "Animal Pairs" }} />
        <Stack.Screen name="lights" options={{ title: "Lights Out" }} />
        <Stack.Screen name="mines" options={{ title: "Minesweeper" }} />
        <Stack.Screen name="math" options={{ title: "Math Steps" }} />
      </Stack>
    </>
  );
}
