import { createContext, useCallback, useEffect, useState } from "react";

// A client-side log of real events the app has already observed (disruption
// detected, resolution loaded, action confirmed, escalation created). There
// is no backend notifications API - nothing here is polled or invented,
// every entry is written at the moment a real API response is received.
const STORAGE_KEY = "aeroresolve_notifications";
const MAX_ENTRIES = 20;

export const NotificationsContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStored(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // localStorage unavailable (private mode, quota) - notifications just won't persist
  }
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(readStored);

  useEffect(() => {
    writeStored(notifications);
  }, [notifications]);

  const addNotification = useCallback(({ type, title, message, pnr }) => {
    setNotifications((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        title,
        message,
        pnr,
        createdAt: new Date().toISOString(),
        read: false,
      };
      return [entry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, clear }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
