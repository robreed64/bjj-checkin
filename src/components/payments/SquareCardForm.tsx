"use client";

import { useEffect, useRef, useState } from "react";

// Square Web Payments SDK card form. Tokenization is fully client-side: the
// SDK renders the card fields, tokenize() returns a one-time nonce, and the
// caller decides which endpoint stores it (enroll vs member portal).

type SquareCard = {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
};

type SquarePayments = { card: () => Promise<SquareCard> };

declare global {
  interface Window {
    Square?: { payments: (applicationId: string, locationId: string) => SquarePayments };
  }
}

const SCRIPT_ID = "square-web-payments-sdk";

function loadSquareSdk(environment: string): Promise<void> {
  if (window.Square) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Square SDK failed to load")));
      if (window.Square) resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      environment === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Square SDK failed to load"));
    document.head.appendChild(script);
  });
}

export type SquareCardFormProps = {
  applicationId: string;
  locationId: string;
  environment: string; // 'sandbox' | 'production'
  /** Receives the tokenized card nonce; returns an error message or null on success. */
  onToken: (token: string) => Promise<string | null>;
  submitLabel?: string;
  busyLabel?: string;
  secondaryAction?: { label: string; onClick: () => void };
};

export default function SquareCardForm({
  applicationId,
  locationId,
  environment,
  onToken,
  submitLabel = "Save Card →",
  busyLabel = "Saving…",
  secondaryAction,
}: SquareCardFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSquareSdk(environment);
        if (cancelled || !window.Square || !containerRef.current) return;
        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        if (cancelled) { card.destroy().catch(() => {}); return; }
        await card.attach(containerRef.current);
        cardRef.current = card;
        setReady(true);
      } catch {
        if (!cancelled) setError("Failed to load the card form. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => {});
      cardRef.current = null;
    };
  }, [applicationId, locationId, environment]);

  const submit = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        setError(result.errors?.[0]?.message ?? "Card error — check the details and try again");
        return;
      }
      const submitError = await onToken(result.token);
      if (submitError) setError(submitError);
    } catch {
      setError("Failed to save card. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* The SDK injects an iframe with its own light styling */}
      <div ref={containerRef} className="rounded-xl bg-white p-3 min-h-[56px]" />
      {!ready && !error && (
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          Loading card form…
        </div>
      )}
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>
      )}
      <div className="flex justify-between items-center pt-1">
        {secondaryAction ? (
          <button onClick={secondaryAction.onClick} className="text-sm text-gray-500 hover:text-gray-300 transition">
            {secondaryAction.label}
          </button>
        ) : <span />}
        <button
          onClick={submit}
          disabled={!ready || saving}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
        >
          {saving ? busyLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
