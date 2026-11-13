export const clock = (secs: number) =>
  Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");

export const pad3 = (n: number) =>
  String(Math.max(-99, Math.min(999, n))).padStart(3, "0");
