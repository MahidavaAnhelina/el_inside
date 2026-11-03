"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type TurnstileApi = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({
  t,
  locale,
  resetCount,
  onToken,
}: {
  t: Dictionary;
  locale: Locale;
  resetCount: number;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !siteKey || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    let id: string | undefined;
    let size = "";
    const render = (width: number) => {
      const nextSize = width < 300 ? "compact" : "flexible";
      if (size === nextSize) return;
      size = nextSize;
      if (id) api.remove(id);
      onToken("");
      id = api.render(container.current!, {
        sitekey: siteKey,
        action: "order",
        // Turnstile does not offer Belarusian; use its browser-language fallback.
        language: locale === "be" ? "auto" : locale,
        theme: "light",
        size,
        "response-field": false,
        callback: (token: string) => {
          setFailed(false);
          onToken(token);
        },
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          setFailed(true);
          onToken("");
        },
        "timeout-callback": () => onToken(""),
      });
    };
    const observer = new ResizeObserver(([entry]) =>
      render(entry.contentRect.width),
    );
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      if (id) api.remove(id);
    };
  }, [ready, siteKey, locale, resetCount, onToken]);

  if (!siteKey)
    return (
      <p role="status" className="field-help">
        {t.unavailable}
      </p>
    );
  return (
    <div className="verification">
      <p className="field-help">{t.verificationLabel}</p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => {
          setFailed(true);
          onToken("");
        }}
      />
      <div ref={container} />
      {failed && (
        <p className="error" role="alert">
          {t.verificationUnavailable}
        </p>
      )}
    </div>
  );
}
