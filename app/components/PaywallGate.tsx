"use client";

export interface PaywallGateProps {
  feature: string;
  description: string;
  tier?: "pro" | "elite";
}

export function PaywallGate({
  feature,
  description,
  tier = "pro",
}: PaywallGateProps) {
  return (
    <div
      style={{
        background: "rgba(13,15,22,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "48px 32px",
        textAlign: "center",
        maxWidth: 480,
        margin: "40px auto",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
      <div
        style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#00C9A0",
          marginBottom: 12,
        }}
      >
        {tier === "elite" ? "Elite Plan" : "Pro Plan"} Required
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.4px",
          marginBottom: 10,
        }}
      >
        {feature}
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "rgba(238,240,244,0.5)",
          lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 340,
          margin: "0 auto 32px",
        }}
      >
        {description}
      </p>

      {/* Pricing cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "rgba(0,201,160,0.06)",
            border: "1px solid rgba(0,201,160,0.25)",
            borderRadius: 10,
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Pro</div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(238,240,244,0.45)",
                marginTop: 2,
              }}
            >
              Full programme access · AI coaching · All features
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00C9A0" }}>
              £29
            </div>
            <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>
              /month
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(61,126,255,0.06)",
            border: "1px solid rgba(61,126,255,0.2)",
            borderRadius: 10,
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Elite + Coaching
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(238,240,244,0.45)",
                marginTop: 2,
              }}
            >
              Pro + 1:1 coaching sessions · Priority support
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3D7EFF" }}>
              £79
            </div>
            <div style={{ fontSize: 10, color: "rgba(238,240,244,0.35)" }}>
              /month
            </div>
          </div>
        </div>
      </div>

      <a
        href="/upgrade"
        style={{
          display: "block",
          width: "100%",
          padding: "14px",
          background: "#00C9A0",
          color: "#08090C",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.02em",
          textDecoration: "none",
          textAlign: "center",
        }}
      >
        Unlock Full Access →
      </a>
      <div
        style={{
          fontSize: 11,
          color: "rgba(238,240,244,0.25)",
          marginTop: 12,
        }}
      >
        Cancel anytime · Instant access · Secure payment via Stripe
      </div>
    </div>
  );
}
