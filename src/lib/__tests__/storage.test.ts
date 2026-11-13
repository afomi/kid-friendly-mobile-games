import { beforeEach, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { load, save, useStored } from "../storage";
import { SAVE_KEY, ask, freshProgress, guess, restoreProgress, startRound, usefulQuestions } from "@/games/pokemon/logic";
import { seeded } from "@/lib/random";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

it("restores a collection and unfinished mystery after unmount and remount", async () => {
  const first = await renderHook(() => useStored(SAVE_KEY, freshProgress(), restoreProgress));
  await waitFor(() => expect(first.result.current[2]).toBe(true));
  let progress = startRound(freshProgress(), seeded(1));
  progress = guess(progress, progress.round!.target);
  progress = startRound(progress, seeded(2));
  progress = ask(progress, usefulQuestions(progress.round!)[0].id);
  await act(() => first.result.current[1](progress));
  await waitFor(() => expect(first.result.current[3].status).toBe("saved"));
  await first.unmount();
  const second = await renderHook(() => useStored(SAVE_KEY, freshProgress(), restoreProgress));
  await waitFor(() => expect(second.result.current[2]).toBe(true));
  expect(second.result.current[0]).toEqual(progress);
  expect(second.result.current[0].caught).toHaveLength(1);
});

it("does not overwrite progress while the initial read is delayed", async () => {
  let resolve!: (raw: string) => void;
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  const hook = await renderHook(() => useStored("slow", 0));
  expect(hook.result.current[2]).toBe(false);
  await act(() => hook.result.current[1](1));
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await act(() => resolve("42"));
  expect(hook.result.current[0]).toBe(42);
});

it("keeps rapid functional updates in order", async () => {
  const hook = await renderHook(() => useStored("counter", 0));
  await act(() => {
    hook.result.current[1]((n) => n + 1);
    hook.result.current[1]((n) => n + 1);
    hook.result.current[1]((n) => n + 1);
  });
  await waitFor(() => expect(hook.result.current[3].status).toBe("saved"));
  expect(await load("counter", 0)).toBe(3);
});

it("serializes writes and waits for them before loading", async () => {
  let finish!: () => void;
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const first = save("ordered", 1);
  const second = save("ordered", 2);
  const read = load("ordered", 0);
  await Promise.resolve();
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([first, second]);
  expect(await read).toBe(2);
});

it("shows write failures and retries the same progress", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const hook = await renderHook(() => useStored("retry", 0));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("disk full"));
  await act(() => hook.result.current[1](99));
  await waitFor(() => expect(hook.result.current[3].status).toBe("error"));
  expect(hook.result.current[0]).toBe(99);
  await act(() => hook.result.current[3].retry());
  await waitFor(() => expect(hook.result.current[3].status).toBe("saved"));
  expect(await load("retry", 0)).toBe(99);
  warn.mockRestore();
});

it("blocks play after a failed read, then restores on retry without writing defaults", async () => {
  await AsyncStorage.setItem("read-retry", "18");
  jest.mocked(AsyncStorage.setItem).mockClear();
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("read failed"));
  const hook = await renderHook(() => useStored("read-retry", 0));
  expect(hook.result.current[2]).toBe(false);
  expect(hook.result.current[3].status).toBe("error");
  await act(() => hook.result.current[1](1));
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await act(() => hook.result.current[3].retry());
  expect(hook.result.current[0]).toBe(18);
  expect(hook.result.current[2]).toBe(true);
});

it("leaves corrupt saves untouched", async () => {
  await AsyncStorage.setItem(SAVE_KEY, "{broken");
  const hook = await renderHook(() => useStored(SAVE_KEY, freshProgress(), restoreProgress));
  expect(hook.result.current[2]).toBe(false);
  expect(hook.result.current[3].status).toBe("error");
  expect(await AsyncStorage.getItem(SAVE_KEY)).toBe("{broken");
});

it("keeps existing Alchemy discoveries under their original key", async () => {
  const found = { 0: null, 1: null, 2: null, 3: null, 4: [0, 1] };
  await AsyncStorage.setItem("alchemy-found", JSON.stringify(found));
  const hook = await renderHook(() => useStored("alchemy-found", {}));
  expect(hook.result.current[0]).toEqual(found);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
});
