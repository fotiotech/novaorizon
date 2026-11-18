"use client";

/**
 * Client-side session store backed by the Express API.
 *
 * The backend owns authentication: it sets an httpOnly `session` cookie and
 * exposes `GET /api/auth/me` + `POST /api/auth/logout`. This module replaces
 * the *read* side of next-auth/react while keeping the same hook surface the
 * pages already use.
 *
 * The store is module-level so every `useSession()` consumer shares one
 * `/auth/me` request. Call `update()` (or `refreshSession()`) to re-fetch.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import api from "@/lib/api";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

/** next-auth-like user. Keeps `_id` because several pages still read it. */
export interface SessionUser {
  id: string;
  _id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  /** Extra backend fields (status, preferences, phone, ...) are preserved. */
  [key: string]: any;
}

export interface SessionData {
  user: SessionUser;
}

export interface SessionSnapshot {
  data: SessionData | null;
  status: SessionStatus;
}

export interface UseSessionResult extends SessionSnapshot {
  update: () => Promise<void>;
}

const INITIAL_STATE: SessionSnapshot = { data: null, status: "loading" };

let state: SessionSnapshot = INITIAL_STATE;
const listeners = new Set<() => void>();

let inFlight: Promise<void> | null = null;
let inFlightForced = false;

function emit(): void {
  // Copy first so a listener that unsubscribes during notification is safe.
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {
      // A misbehaving subscriber must never break the store.
    }
  }
}

function setSnapshot(next: SessionSnapshot): void {
  state = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionSnapshot {
  return state;
}

/** Server render / hydration always starts from the loading state. */
function getServerSnapshot(): SessionSnapshot {
  return INITIAL_STATE;
}

/**
 * Normalise the backend user into the shape the UI expects.
 *
 * `/auth/me` returns a Mongo lean document (`_id`), while login responses
 * use `id`. Expose both, preferring the backend's values, and keep every
 * other field the backend returned.
 */
function mapUser(payload: any): SessionUser | null {
  if (!payload || typeof payload !== "object") return null;

  // Tolerate `{ data: { user } }` as well as `{ data: user }`.
  const raw =
    payload.user && !payload._id && !payload.id ? payload.user : payload;
  if (!raw || typeof raw !== "object") return null;

  const rawId = raw._id ?? raw.id;
  if (rawId === undefined || rawId === null || rawId === "") return null;

  const id = String(rawId);

  return {
    ...raw,
    id,
    _id: raw._id !== undefined && raw._id !== null ? String(raw._id) : id,
    name: raw.name ?? null,
    email: raw.email ?? "",
    image: raw.image ?? null,
    role: raw.role ?? null,
  };
}

async function requestSession(): Promise<void> {
  try {
    const res = await api.get("/auth/me");
    const body: any = res?.data;
    const payload = body?.data?.user ?? body?.data ?? body?.user ?? null;
    const user = mapUser(payload);

    setSnapshot(
      user
        ? { data: { user }, status: "authenticated" }
        : { data: null, status: "unauthenticated" },
    );
  } catch {
    // 401/network/parse errors all mean "not signed in" for the UI.
    setSnapshot({ data: null, status: "unauthenticated" });
  }
}

function fetchSession(force: boolean): Promise<void> {
  if (inFlight) {
    // Coalesce normal reads. A forced refresh waits for the in-flight
    // request, then issues a fresh one.
    if (!force || inFlightForced) return inFlight;
    return inFlight.then(() => fetchSession(true));
  }

  inFlightForced = force;

  const request = Promise.resolve().then(requestSession);
  inFlight = request.finally(() => {
    inFlight = null;
    inFlightForced = false;
  });

  return inFlight;
}

/** Fetch once (per page load) unless a request is already in flight. */
function ensureSession(): Promise<void> {
  if (inFlight) return inFlight;
  if (state.status !== "loading") return Promise.resolve();
  return fetchSession(false);
}

/** Force a session re-fetch. Never rejects. */
export function refreshSession(): Promise<void> {
  return fetchSession(true);
}

export function useSession(): UseSessionResult {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    void ensureSession();
  }, []);

  const update = useCallback(async (): Promise<void> => {
    await fetchSession(true);
  }, []);

  return { data: snapshot.data, status: snapshot.status, update };
}

/**
 * Client-side redirect to the app's login page (which calls the backend).
 * Accepts an optional provider argument for call-site compatibility; the
 * backend login page is credential-based.
 */
export function signIn(_provider?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = "/auth/login";
}

/**
 * Clear the backend session cookie, reset the local store, then return home.
 * Never throws.
 */
export async function signOut(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Still clear the local state and leave the page even if the API fails.
  }

  setSnapshot({ data: null, status: "unauthenticated" });

  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}
