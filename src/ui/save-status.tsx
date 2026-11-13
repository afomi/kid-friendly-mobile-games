import { View } from "react-native";
import { StorageStatus } from "@/lib/storage";
import { Chip, Note } from "./kit";

export function SaveStatus({ status, retry, ready }: { status: StorageStatus; retry: () => void; ready: boolean }) {
  return (
    <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
      <Note>{status === "error"
        ? ready ? "Couldn't save yet. Keep this game open and try again." : "Couldn't load your progress. Try again to keep your collection safe."
        : status === "loading" ? "Loading your progress…"
        : status === "saving" ? "Saving your progress…" : "Progress saved on this device"}</Note>
      {status === "error" && <Chip label={ready ? "Try saving again" : "Try loading again"} onPress={retry} style={{ alignSelf: "center" }} />}
    </View>
  );
}
