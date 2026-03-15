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
        className="upgrade-page-wrap"
        style={{
          maxWidth: 440,
          margin: "0 auto",
          padding: "32px 20px",
          paddingBottom: "calc(100px + env(safe-area-inset-bottom))",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#00C9A0",
              marginBottom: 10,
            }}
          >
            Upgrade
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.6px",
              marginBottom: 10,
              color: "#EEF0F4",
            }}
          >
            Unlock full access
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(238,240,244,0.45)",
              lineHeight: 1.6,
            }}
          >
            Get your periodised programme, AI coaching, tactical modules, and adaptive check-ins.
          </p>
        </header>

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

        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24 }}>
          <div
            style={{
              background: "rgba(0,201,160,0.06)",
              border: "1px solid rgba(0,201,160,0.25)",
              borderRadius: 14,
              padding: "22px 20px",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#EEF0F4" }}>Pro</div>
                <div style={{ fontSize: 13, color: "rgba(238,240,244,0.6)", marginTop: 4 }}>
                  Full programme · AI coaching · All features
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", color: "#00C9A0" }}>£29</div>
                <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>/month</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade(PRICE_PRO)}
              disabled={!!loading}
              style={{
                width: "100%",
                height: 52,
                background: "#00C9A0",
                color: "#08090C",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
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
              borderRadius: 14,
              padding: "22px 20px",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#EEF0F4" }}>Elite + Coaching</div>
                <div style={{ fontSize: 13, color: "rgba(238,240,244,0.6)", marginTop: 4 }}>
                  Pro + 1:1 coaching · Priority support
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px", color: "#3D7EFF" }}>£79</div>
                <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>/month</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade(PRICE_ELITE)}
              disabled={!!loading}
              style={{
                width: "100%",
                height: 52,
                background: "rgba(61,126,255,0.2)",
                color: "#93c5fd",
                border: "1px solid rgba(61,126,255,0.5)",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 800,
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
