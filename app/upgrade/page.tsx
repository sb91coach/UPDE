"use client";

import { useState } from "react";
import OSLayer from "@/app/components/OSLayer";
import Link from "next/link";

const PRICE_PRO = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "price_pro_placeholder";
const PRICE_ELITE = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE ?? "price_elite_placeholder";

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string) => {
    if (priceId.includes("placeholder")) {
      setError("Stripe price IDs not configured. Add NEXT_PUBLIC_STRIPE_PRICE_PRO and NEXT_PUBLIC_STRIPE_PRICE_ELITE.");
      return;
    }
    setError(null);
    setLoading(priceId);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <OSLayer>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "24px 16px",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#00C9A0",
            marginBottom: 8,
          }}
        >
          Upgrade
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            marginBottom: 8,
          }}
        >
          Unlock full access
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(238,240,244,0.5)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          Get your periodised programme, AI coaching, tactical modules, and adaptive check-ins.
        </p>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              fontSize: 13,
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <div
            style={{
              background: "rgba(0,201,160,0.06)",
              border: "1px solid rgba(0,201,160,0.25)",
              borderRadius: 10,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Pro</div>
                <div style={{ fontSize: 12, color: "rgba(238,240,244,0.45)", marginTop: 2 }}>
                  Full programme · AI coaching · All features
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#00C9A0" }}>£29</div>
                <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>/month</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade(PRICE_PRO)}
              disabled={!!loading}
              style={{
                width: "100%",
                padding: 14,
                background: "#00C9A0",
                color: "#08090C",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading === PRICE_PRO ? "Redirecting…" : "Subscribe to Pro"}
            </button>
          </div>

          <div
            style={{
              background: "rgba(61,126,255,0.06)",
              border: "1px solid rgba(61,126,255,0.2)",
              borderRadius: 10,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Elite + Coaching</div>
                <div style={{ fontSize: 12, color: "rgba(238,240,244,0.45)", marginTop: 2 }}>
                  Pro + 1:1 coaching · Priority support
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#3D7EFF" }}>£79</div>
                <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>/month</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade(PRICE_ELITE)}
              disabled={!!loading}
              style={{
                width: "100%",
                padding: 14,
                background: "rgba(61,126,255,0.25)",
                color: "#93c5fd",
                border: "1px solid rgba(61,126,255,0.5)",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading === PRICE_ELITE ? "Redirecting…" : "Subscribe to Elite"}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(238,240,244,0.25)", textAlign: "center" }}>
          Cancel anytime · Secure payment via Stripe
        </p>

        <Link
          href="/profile"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 24,
            fontSize: 14,
            color: "rgba(238,240,244,0.6)",
            textDecoration: "none",
          }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </OSLayer>
  );
}
