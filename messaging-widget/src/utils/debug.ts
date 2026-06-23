declare global {
  interface Window {
    __INFL_MSG_DEBUG__?: boolean;
  }
}

export function isMessengerDebug(): boolean {
  return (
    import.meta.env.DEV ||
    (typeof window !== "undefined" && window.__INFL_MSG_DEBUG__ === true)
  );
}

export function logMessenger(...args: unknown[]): void {
  if (isMessengerDebug()) {
    console.log("[infl-messenger]", ...args);
  }
}
