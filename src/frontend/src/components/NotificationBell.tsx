import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification, NotificationType } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bell, BellOff, Info, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeColor(type: NotificationType): string {
  switch (type) {
    case "critical":
      return "border-l-4 border-destructive bg-destructive/5";
    case "warning":
      return "border-l-4 border-yellow-500 bg-yellow-500/5";
    default:
      return "border-l-4 border-muted-foreground/30 bg-muted/20";
  }
}

function typeIcon(type: NotificationType): React.ReactNode {
  switch (type) {
    case "critical":
      return <XCircle className="text-destructive mt-0.5 text-xs" />;
    case "warning":
      return <AlertTriangle className="text-yellow-500 mt-0.5 text-xs" />;
    default:
      return <Info className="text-muted-foreground mt-0.5 text-xs" />;
  }
}

function NotificationItem({
  notif,
  onClick,
}: {
  notif: AppNotification;
  onClick?: () => void;
}) {
  const isClickable = !!notif.navigationTarget;
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      onClick={isClickable ? onClick : undefined}
      className={`px-3 py-2.5 ${typeColor(notif.type)} ${
        notif.read ? "opacity-60" : ""
      } ${isClickable ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}
    >
      <div className="flex items-start gap-2">
        {notif.imageUrl ? (
          <img
            src={notif.imageUrl}
            alt=""
            aria-hidden="true"
            className="w-10 h-10 rounded-sm object-cover shrink-0 mt-0.5"
          />
        ) : (
          typeIcon(notif.type)
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight">
            {notif.title}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {notif.message}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {timeAgo(notif.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const { principal } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications(principal);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function handleNotifClick(notif: AppNotification) {
    if (!notif.navigationTarget) return;
    markAllRead();
    setOpen(false);
    navigate({ to: notif.navigationTarget });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        data-ocid="header.notification_bell"
      >
        <Bell className="text-sm" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-foreground">
              Notifications
            </span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    markAllRead();
                  }}
                  className="text-[11px] text-primary hover:underline"
                  data-ocid="header.mark_all_read_button"
                >
                  Mark all as read
                </button>
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                <button
                  type="button"
                  onClick={() => {
                    clearAll();
                    setOpen(false);
                  }}
                  className="text-[11px] text-destructive hover:underline"
                  data-ocid="header.clear_all_button"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <BellOff className="text-muted-foreground text-lg mb-1.5" />
                <p className="text-xs text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onClick={() => handleNotifClick(notif)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
