"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "@/components/language";

const POLL_MS = 45000;
type State = { count: number | null; error: boolean; loading: boolean };
let state: State = { count: null, error: false, loading: false };
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export async function refreshNotifications() {
  set({ loading: true });
  try {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) throw new Error("Unavailable");
    const data = (await response.json()) as { unread: number };
    set({ count: data.unread, error: false, loading: false });
  } catch {
    set({ error: true, loading: false });
  }
}

function start() {
  const tick = () => {
    if (document.visibilityState === "visible") void refreshNotifications();
  };
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      tick();
      timer ??= setInterval(tick, POLL_MS);
    } else stop();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("notifications:refresh", tick);
  onVisibility();
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("notifications:refresh", tick);
  };
}

let teardown: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (subscribers++ === 0) teardown = start();
  return () => {
    listeners.delete(listener);
    if (--subscribers === 0) teardown?.();
  };
}

// One shared poller serves every badge on the page.
export function useNotifications(initial?: number) {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  useEffect(() => {
    if (initial !== undefined && state.count === null) set({ count: initial });
  }, [initial]);
  return { ...current, count: current.count ?? initial ?? null };
}

export function UnreadBadge({ initial }: { initial?: number }) {
  const t = useTranslation();
  const { count } = useNotifications(initial);
  if (!count) return null;
  return (
    <span className="unread-badge" role="status">
      {count > 99 ? "99+" : count}
      <span className="sr-only">{" " + t("unread notifications")}</span>
    </span>
  );
}

export function NotificationStatus({ initial }: { initial: number }) {
  const t = useTranslation();
  const { count, error, loading } = useNotifications(initial);
  useEffect(() => {
    window.dispatchEvent(new Event("notifications:refresh"));
  }, []);
  return (
    <div className="notice notification-status" aria-live="polite">
      {error ? (
        <>
          <p className="error">{t("We couldn’t refresh notifications.")}</p>
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={() => void refreshNotifications()}
          >
            {loading ? t("Checking…") : t("Try again")}
          </button>
        </>
      ) : count === null ? (
        <p>{t("Checking for new requests…")}</p>
      ) : count > 0 ? (
        <p>
          <UnreadBadge initial={initial} />{" "}
          {t("New requests are waiting for your review.")}
        </p>
      ) : (
        <p>{t("You’re all caught up.")}</p>
      )}
    </div>
  );
}
