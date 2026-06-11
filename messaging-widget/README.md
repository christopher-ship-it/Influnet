# Influnet Floating Messaging Widget

Production React + TypeScript messaging panel for business and influencer dashboards.

## Stack

- React 19, TypeScript, Tailwind CSS v4, Zustand, Framer Motion
- Integrates with existing `/api/conversations` + `/api/events` (SSE) bridge

## Build

```powershell
.\scripts\build-messaging-widget.ps1
```

Output: `influnet/messaging/infl-messenger.js` + `infl-messenger.css`

## Usage

Loaded automatically on `/dashboard` and `/dashboard/influencer` when signed in.

```js
window.influnetOpenFloatingMessenger?.();
```

Dispatch toast notifications from anywhere:

```js
window.dispatchEvent(
  new CustomEvent("influnet-messenger-notify", {
    detail: {
      title: "Collaboration request",
      body: "Nike sent you a request",
      kind: "collab",
    },
  })
);
```

## Architecture

| Component | Role |
|-----------|------|
| `MessagingLauncher` | Bottom-right minimized bar + expanded list |
| `ConversationList` | Search, Active/Archived tabs |
| `ConversationItem` | Sidebar row with avatar + unread |
| `ChatWindow` | Floating multi-chat window (desktop) / fullscreen (mobile) |
| `MessageBubble` | Sent/received bubbles + read receipt UI |
| `TypingIndicator` | Animated typing dots |
| `NotificationToast` | Bottom-right auto-dismiss toasts |

Real-time: SSE `/api/events` (message, typing, presence) + polling fallback.

## Sidebar badges

- `GET /api/notifications/summary` — unread conversation count + pending requests
- Pink badge (`#ee3e96`) on Messages, coral badge (`#f26e59`) on Requests
- Framer Motion pulse when counts increase
- Toasts with [View Conversation] / [View Request] (suppressed on active tab)
