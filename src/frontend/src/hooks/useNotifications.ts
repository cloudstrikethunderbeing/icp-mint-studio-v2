import { useAuth } from "@/contexts/AuthContext";
import type { AppNotification } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Per-principal storage helpers ────────────────────────────────────────────

function storageKey(principalId: string): string {
  return `icpms_notifications_${principalId}`;
}

function loadFromStorage(principalId: string | null): AppNotification[] {
  if (!principalId) return [];
  try {
    const raw = localStorage.getItem(storageKey(principalId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AppNotification[];
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(principalId: string | null, items: AppNotification[]) {
  if (!principalId) return; // anonymous: ephemeral only, no persistence
  try {
    localStorage.setItem(
      storageKey(principalId),
      JSON.stringify(items.slice(0, 50)),
    );
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

// ── Module-level per-principal stores ────────────────────────────────────────
// Key: principalId (or "__anon__" for anonymous). Value: notification array.

const stores = new Map<string, AppNotification[]>();
const listeners = new Set<() => void>();

function resolveKey(principalId: string | null): string {
  return principalId ?? "__anon__";
}

function emit() {
  for (const fn of listeners) fn();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStore(principalId: string | null): AppNotification[] {
  const key = resolveKey(principalId);
  if (!stores.has(key)) {
    // Hydrate from localStorage on first access for this principal
    stores.set(key, loadFromStorage(principalId));
  }
  return stores.get(key) ?? [];
}

function setStore(principalId: string | null, next: AppNotification[]) {
  const key = resolveKey(principalId);
  stores.set(key, next);
  saveToStorage(principalId, next);
  emit();
}

// ── Public imperative API (used outside React components) ────────────────────
// These require a principalId to be supplied by callers.

export function addNotification(
  notif: Omit<AppNotification, "id" | "read" | "timestamp">,
  principalId: string | null = null,
) {
  const next: AppNotification = {
    ...notif,
    id: generateId(),
    read: false,
    timestamp: Date.now(),
  };
  const current = getStore(principalId);
  const trimmed = [next, ...current].slice(0, 20);
  setStore(principalId, trimmed);
  return next.id;
}

export function markAllRead(principalId: string | null = null) {
  const current = getStore(principalId);
  setStore(
    principalId,
    current.map((n) => ({ ...n, read: true })),
  );
}

// Clear in-memory store for a principal (e.g. on logout).
// Does NOT delete localStorage so data persists for next login.
export function clearMemoryStore(principalId: string | null = null) {
  const key = resolveKey(principalId);
  stores.delete(key);
  emit();
}

export function useNotifications(principalId: string | null = null) {
  const { principal: authPrincipal } = useAuth();
  const effectivePrincipal = principalId ?? authPrincipal;

  const [, setTick] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Guard against duplicate listener registration across rapid re-renders
    if (listenerRef.current) {
      listeners.delete(listenerRef.current);
    }
    const fn = () => setTick((t) => t + 1);
    listenerRef.current = fn;
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      listenerRef.current = null;
    };
  }, []);

  // Re-hydrate from localStorage whenever effectivePrincipal changes
  useEffect(() => {
    if (effectivePrincipal) {
      const key = resolveKey(effectivePrincipal);
      // Always re-hydrate from storage on principal switch to ensure fresh data
      stores.set(key, loadFromStorage(effectivePrincipal));
      emit();
    } else {
      // Anonymous: use ephemeral in-memory store, don't load from storage
      const key = resolveKey(null);
      if (!stores.has(key)) stores.set(key, []);
    }
  }, [effectivePrincipal]);

  const notifications = getStore(effectivePrincipal);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotif = useCallback(
    (notif: Omit<AppNotification, "id" | "read" | "timestamp">) => {
      addNotification(notif, effectivePrincipal);
    },
    [effectivePrincipal],
  );

  const markRead = useCallback(() => {
    markAllRead(effectivePrincipal);
  }, [effectivePrincipal]);

  return {
    notifications,
    unreadCount,
    addNotification: addNotif,
    markAllRead: markRead,
  };
}
