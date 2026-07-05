"use client";

// Lightweight event tracking. No-ops unless the relevant env var is set.
// - Google Analytics 4 via the gtag script (see components/Analytics.tsx)
// - Mixpanel via its HTTP track API (no extra script/dependency needed)

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, props: Props = {}): void {
  if (typeof window === "undefined") return;

  // Google Analytics
  if (window.gtag) {
    window.gtag("event", event, props);
  }

  // Mixpanel (HTTP API — CORS-enabled for /track)
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (token) {
    try {
      const payload = {
        event,
        properties: { token, ...props },
      };
      const data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      // keepalive so the request survives a navigation (e.g. buy click)
      fetch(`https://api.mixpanel.com/track?data=${encodeURIComponent(data)}`, {
        method: "GET",
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore analytics failures
    }
  }
}
