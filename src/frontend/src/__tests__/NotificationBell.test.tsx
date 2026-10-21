import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppNotification } from "@/types";

// ── Characterization: NotificationBell rendering contract ────────────────────
// The bell dropdown renders each stored notification. This suite protects the
// *rendering* contract the mint-notification requirement depends on:
//   - a notification carrying an imageUrl renders a thumbnail <img> with that
//     exact src (the mint flow records the minted NFT's image here);
//   - a notification without an imageUrl falls back to the type icon rather
//     than mounting a broken/empty <img>;
//   - the title and message text are shown, and the unread badge reflects the
//     unread count.
// It deliberately does NOT assert the mint notification's title/message copy
// (the NFT name is the behavior the current request intentionally changes), and
// it does not exercise the real localStorage-backed store — the hook is mocked
// so the component's rendering is characterized in isolation.

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const notificationsMock = vi.hoisted(() => ({
  useNotifications: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: authMock.useAuth,
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: notificationsMock.useNotifications,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

import { NotificationBell } from "@/components/NotificationBell";

function makeNotification(
  overrides: Partial<AppNotification> = {},
): AppNotification {
  return {
    id: "n-1",
    type: "info",
    title: "NFT Minted",
    message: "Token ID: 7 created successfully",
    timestamp: Date.now(),
    read: false,
    ...overrides,
  };
}

function setNotifications(
  notifications: AppNotification[],
  unreadCount = notifications.filter((n) => !n.read).length,
) {
  notificationsMock.useNotifications.mockReturnValue({
    notifications,
    unreadCount,
    addNotification: vi.fn(),
    markAllRead: vi.fn(),
    clearAll: vi.fn(),
  });
}

async function openBell() {
  const user = userEvent.setup();
  render(<NotificationBell />);
  await user.click(screen.getByRole("button", { name: "Notifications" }));
  return user;
}

describe("NotificationBell rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ principal: "aaaaa-aa" });
    setNotifications([]);
  });

  it("renders a thumbnail image for a notification that carries an imageUrl", async () => {
    setNotifications([
      makeNotification({
        imageUrl: "https://example.com/minted.png",
      }),
    ]);

    await openBell();

    const img = document.querySelector(
      'img[src="https://example.com/minted.png"]',
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    // The thumbnail is decorative (the title/message carry the meaning), so it
    // is hidden from assistive tech rather than given an alt text.
    expect(img?.getAttribute("aria-hidden")).toBe("true");
    // The notification's text is still rendered alongside the thumbnail.
    expect(screen.getByText("NFT Minted")).toBeInTheDocument();
    expect(
      screen.getByText("Token ID: 7 created successfully"),
    ).toBeInTheDocument();
  });

  it("falls back to the type icon when a notification has no imageUrl", async () => {
    setNotifications([makeNotification({ imageUrl: undefined })]);

    await openBell();

    // No <img> is mounted for a notification without an image; the type icon
    // (an SVG) is rendered instead.
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("NFT Minted")).toBeInTheDocument();
  });

  it("shows the unread count badge and the empty state", async () => {
    setNotifications([makeNotification({ read: false })], 1);

    const user = userEvent.setup();
    render(<NotificationBell />);

    // The badge is visible before the panel is opened.
    expect(screen.getByText("1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("NFT Minted")).toBeInTheDocument();
  });

  it("shows the empty state when there are no notifications", async () => {
    setNotifications([]);

    await openBell();

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
