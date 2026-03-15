"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import MobileTabBar from "@/app/components/MobileTabBar";
import { SoftPaywall } from "@/app/components/SoftPaywall";

const orbStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 32,
  right: 32,
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  border: "none",
  color: "#fff",
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10001,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 100,
  right: 32,
  width: 360,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "min(500px, 70vh)",
  background: "rgba(15,15,20,0.98)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  zIndex: 10000,
};

const panelHeaderStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  letterSpacing: "0.08em",
};

const panelBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: 20,
  overflowY: "auto",
  fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  padding: "8px 12px",
  fontSize: 18,
};

export default function OSLayer({
  children,
  hideBottomNav,
  isPro = true,
}: {
  children: React.ReactNode;
  /** When true, hide mobile bottom nav (e.g. during workout mode). */
  hideBottomNav?: boolean;
  /** When false, AI Coach orb is gated behind soft paywall */
  isPro?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  /* ESC key close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  /* Click outside close */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  return (
    <div className="osLayerRoot" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <style>{`
        .osLayerRoot .osLayerBar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
        }
        .osLayerRoot .osLayerBarLogoDot {
          display: none;
        }
        .osLayerRoot .osLayerBarNav {
          display: flex;
          gap: 32px;
          font-size: 14px;
        }
        .osLayerRoot .osLayerContent {
          padding: 40px 64px;
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .osLayerRoot .osLayerBar {
            padding: 0 20px;
            padding-top: env(safe-area-inset-top);
            padding-bottom: 12px;
            flex-wrap: nowrap;
            min-height: 52px;
            height: calc(52px + env(safe-area-inset-top));
            align-items: flex-end;
            background: rgba(10, 12, 18, 0.97);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .osLayerRoot .osLayerBarTitle {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: rgba(238, 240, 244, 0.9);
            flex: 1;
            margin: 0;
            display: flex;
            align-items: center;
          }
          .osLayerRoot .osLayerBarLogoDot {
            display: block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #00c9a0;
            box-shadow: 0 0 8px rgba(0, 201, 160, 0.6);
            margin-right: 8px;
            flex-shrink: 0;
          }
          .osLayerRoot .desktop-nav-tabs {
            display: none !important;
          }
          .osLayerRoot .osLayerBarNav {
            gap: 16px;
            font-size: 13px;
          }
          .osLayerRoot .osLayerContent {
            padding: 20px 16px;
            padding-bottom: calc(80px + env(safe-area-inset-bottom));
          }
          .osLayerRoot .osLayerFloatingOrb {
            bottom: calc(16px + env(safe-area-inset-bottom) + 60px) !important;
            right: 16px !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
      {/* Top OS Bar — on mobile: teal dot + logo (left) + avatar (right); no nav tabs */}
      <div className="osLayerBar">
        <div className="osLayerBarTitle" style={{ fontSize: 13, letterSpacing: "0.12em", opacity: 0.6 }}>
          <span className="osLayerBarLogoDot" aria-hidden />
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="osLayerBarNav desktop-nav-tabs">
          <Link href="/profile" style={navBtn}>Home</Link>
          <Link href="/programme" style={navBtn}>Programme</Link>
          <Link href="/benchmarks" style={navBtn}>Progress</Link>
          <Link href="/coach" style={navBtn}>Coach</Link>
          <Link href="/tactical/input" style={navBtn}>Readiness</Link>
          <button style={navBtn} onClick={toggle}>AI Coach</button>
          <Link href="/settings" style={navBtn}>Settings</Link>
        </div>
        <Link
          href="/settings"
          className="osLayerBarAvatar"
          style={{
            display: "none",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#fff",
            textDecoration: "none",
          }}
          aria-label="Settings / menu"
        >
          ⋯
        </Link>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .osLayerRoot .osLayerBarAvatar { display: flex !important; }
        }
      `}</style>

      {/* Main Content — extra padding on mobile for bottom tab bar */}
      <div className="osLayerContent main-content">
        {children}
      </div>

      {/* Mobile bottom tab bar: hidden during workout mode */}
      {!hideBottomNav && <MobileTabBar />}

      {/* Floating Chat System — AI Coach */}
      <div ref={panelRef}>
        {open && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span>AI Coach</span>
              <button
                type="button"
                style={closeBtnStyle}
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={panelBodyStyle}>
              <p style={{ margin: "0 0 16px", opacity: 0.9 }}>
                How can I optimise your performance today?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Explain training</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Ask about any session, exercise, or phase. I can clarify intent and progressions.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Adjust programmes</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Request changes to volume, intensity, or exercise selection based on your readiness.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Interpret readiness</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>I’ll help you understand your readiness score and what to prioritise today.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Generate reports</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Request summaries of training history, goal progress, or capacity trends.</p>
                </section>
              </div>
            </div>
          </div>
        )}

        <SoftPaywall isPro={isPro} feature="AI Coaching">
          <button
            type="button"
            className="osLayerFloatingOrb"
            style={orbStyle}
            onClick={() => isPro && toggle()}
            aria-label={open ? "Close AI Coach" : "Open AI Coach"}
          >
            {open ? "×" : "✦"}
          </button>
        </SoftPaywall>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};