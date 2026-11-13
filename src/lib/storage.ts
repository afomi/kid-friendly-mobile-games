import AsyncStorage from "@react-native-async-storage/async-storage";
import { SetStateAction, useCallback, useEffect, useRef, useState } from "react";

// Serialize writes, including across screen unmounts. Reads wait for pending
// saves so returning to a game cannot restore an older snapshot.
const writes = new Map<string, Promise<boolean>>();

async function read<T>(key: string, fallback: T): Promise<T> {
  await writes.get(key);
  const raw = await AsyncStorage.getItem(key);
  return raw == null ? fallback : JSON.parse(raw) as T;
}

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    return await read(key, fallback);
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): Promise<boolean> {
  const previous = writes.get(key);
  const pending = (async () => {
    await previous;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("medley: could not save", key, error);
      return false;
    }
  })();
  writes.set(key, pending);
  void pending.then(() => {
    if (writes.get(key) === pending) writes.delete(key);
  });
  return pending;
}

export type StorageStatus = "loading" | "saved" | "saving" | "error";

// Defaults cannot replace a save before it loads. Read errors lock the game
// until retry succeeds; write errors retain progress in memory for retry.
export function useStored<T>(key: string, fallback: T, restore?: (value: unknown) => T) {
  const initial = useRef({ fallback, restore });
  const [snapshot, setSnapshot] = useState({ key, value: fallback, ready: false });
  const current = useRef(snapshot);
  const [status, setStatus] = useState<StorageStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    let live = true;
    current.current = { key, value: initial.current.fallback, ready: false };
    setSnapshot(current.current);
    setStatus("loading");
    void read<unknown>(key, initial.current.fallback).then((stored) => {
      const value = initial.current.restore ? initial.current.restore(stored) : stored as T;
      if (live) {
        current.current = { key, value, ready: true };
        setSnapshot(current.current);
        setStatus("saved");
      }
    }).catch(() => {
      if (live) setStatus("error");
    });
    // This is a request counter, not a DOM ref: invalidate the latest write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { live = false; revision.current++; };
  }, [key, attempt]);

  const persist = useCallback((value: T) => {
    const version = ++revision.current;
    setStatus("saving");
    void save(key, value).then((ok) => {
      if (version === revision.current) setStatus(ok ? "saved" : "error");
    });
  }, [key]);

  const set = useCallback((next: SetStateAction<T>) => {
    if (!current.current.ready || current.current.key !== key) return;
    const value = typeof next === "function"
      ? (next as (previous: T) => T)(current.current.value) : next;
    current.current = { key, value, ready: true };
    setSnapshot(current.current);
    persist(value);
  }, [key, persist]);

  const retry = useCallback(() => {
    if (current.current.ready && current.current.key === key) persist(current.current.value);
    else setAttempt((n) => n + 1);
  }, [key, persist]);

  return [snapshot.value, set, snapshot.key === key && snapshot.ready, { status, retry }] as const;
}
