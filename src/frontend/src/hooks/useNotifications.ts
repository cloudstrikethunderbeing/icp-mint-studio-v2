import type { AppNotification, NotificationType } from "@/types";
import { useCallback, useEffect, useState } from "react";

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem("icpms_notifications");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AppNotification[];
    return [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(
      "icpms_notifications",
      JSON.stringify(notificationsStore.slice(0, 50)),
    );
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

let notificationsStore: AppNotification[] = loadFromStorage();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) {
    fn();
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getStore(): AppNotification[] {
  return notificationsStore;
}

function setStore(next: AppNotification[]) {
  notificationsStore = next;
  saveToStorage();
  emit();
}

export function addNotification(
  notif: Omit<AppNotification, "id" | "read" | "timestamp">,
) {
  const next: AppNotification = {
    ...notif,
    id: generateId(),
    read: false,
    timestamp: Date.now(),
  };
  const current = getStore();
  const trimmed = [next, ...current].slice(0, 20);
  setStore(trimmed);
  return next.id;
}

export function markAllRead() {
  const current = getStore();
  setStore(current.map((n) => ({ ...n, read: true })));
}

export function useNotifications() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const notifications = getStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotif = useCallback(
    (notif: Omit<AppNotification, "id" | "read" | "timestamp">) => {
      addNotification(notif);
    },
    [],
  );

  const markRead = useCallback(() => {
    markAllRead();
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification: addNotif,
    markAllRead: markRead,
  };
}
