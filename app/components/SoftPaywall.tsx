"use client";

interface SoftPaywallProps {
  children: React.ReactNode;
  isPro: boolean;
  feature: string;
}

function UpgradeModal({
  feature,
  onClose,
}: {
  feature: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(8,9,12,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: `0 0 env(safe-area-inset-bottom)`,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to unlock"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0D1018",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 0 0",
          padding: "28px 24px 36px",
          width: "100%",
          maxWidth: 480,
          animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Pull handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.12)",
            margin: "0 auto 24px",
          }}
        />

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#00C9A0",
            marginBottom: 10,
          }}
        >
          Unlock {feature}
        </div>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: 8,
            color: "#EEF0F4",
          }}
        >
          Start your performance system
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "rgba(238,240,244,0.5)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          You&apos;re previewing Performance Pathfinder OS. Upgrade to unlock your full programme, AI coaching, and adaptive training system.
        </p>

        {/* Pro card */}
        <div
          style={{
            background: "rgba(0,201,160,0.06)",
            border: "1px solid rgba(0,201,160,0.2)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: "#EEF0F4" }}>
              Pro
            </div>
            <div style={{ fontSize: 12, color: "rgba(238,240,244,0.4)" }}>
              Full programme · AI coaching · All modules
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00C9A0" }}>£29</div>
            <div style={{ fontSize: 10, color: "rgba(238,240,244,0.3)" }}>/month</div>
          </div>
        </div>

        {/* Elite card */}
        <div
          style={{
            background: "rgba(61,126,255,0.05)",
            border: "1px solid rgba(61,126,255,0.18)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: "#EEF0F4" }}>
              Elite + Coaching
            </div>
            <div style={{ fontSize: 12, color: "rgba(238,240,244,0.4)" }}>
              Pro + 1:1 coaching sessions
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3D7EFF" }}>£79</div>
            <div style={{ fontSize: 10, color: "rgba(238,240,244,0.3)" }}>/month</div>
          </div>
        </div>

        <a
          href="/upgrade"
          style={{
            display: "block",
            width: "100%",
            padding: "15px",
            background: "#00C9A0",
            color: "#08090C",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 800,
            textAlign: "center",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Unlock Full Access →
        </a>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: "block",
            width: "100%",
            padding: "13px",
            background: "transparent",
            color: "rgba(238,240,244,0.35)",
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            marginTop: 10,
            fontFamily: "inherit",
          }}
        >
          Continue browsing
        </button>
      </div>
    </div>
  );
}

export function SoftPaywall({ children }: SoftPaywallProps) {
  return <>{children}</>;
}
