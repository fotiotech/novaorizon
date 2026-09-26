"use client";

type EventType = "view" | "cart_add" | "purchase" | "like" | "page_view";

interface QueuedEvent {
  itemId?: string;
  eventType: EventType;
  metadata?: Record<string, any>;
  sessionId?: string;
  idempotencyKey: string;
}

const QUEUE: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function makeKey(
  e: Omit<QueuedEvent, "idempotencyKey">,
  sessionId: string,
): string {
  return `${e.eventType}:${e.itemId ?? "_"}:${sessionId}:${Math.floor(
    Date.now() / 5000,
  )}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("analytics_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics_sid", id);
  }
  return id;
}

export function enqueue(
  payload: Omit<QueuedEvent, "idempotencyKey" | "sessionId">,
) {
  const sessionId = getSessionId();
  const key = makeKey(payload, sessionId);
  if (QUEUE.some((q) => q.idempotencyKey === key)) return;
  QUEUE.push({ ...payload, sessionId, idempotencyKey: key });

  if (!flushTimer) {
    flushTimer = setTimeout(() => flush(false), 1500);
  }
}

export async function flush(useBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (QUEUE.length === 0) return;

  const batch = QUEUE.splice(0, QUEUE.length);

  if (
    useBeacon &&
    typeof navigator !== "undefined" &&
    "sendBeacon" in navigator
  ) {
    navigator.sendBeacon(
      "/api/analytics/batch",
      new Blob([JSON.stringify({ events: batch })], {
        type: "application/json",
      }),
    );
    return;
  }

  try {
    await fetch("/api/analytics/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    if (QUEUE.length < 200) QUEUE.unshift(...batch);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush(true);
  });
  window.addEventListener("pagehide", () => void flush(true));
}
