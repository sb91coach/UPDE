"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
}: {
  children: React.ReactNode;
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
            padding: 0 16px;
            flex-wrap: wrap;
            min-height: 56px;
            height: auto;
            padding-top: 12px;
            padding-bottom: 12px;
          }
          .osLayerRoot .osLayerBarTitle {
            font-size: 11px;
            letter-spacing: 0.08em;
            width: 100%;
            margin-bottom: 8px;
          }
          .osLayerRoot .osLayerBarNav {
            gap: 16px;
            font-size: 13px;
          }
          .osLayerRoot .osLayerContent {
            padding: 20px 16px;
          }
          .osLayerRoot .osLayerFloatingOrb {
            bottom: 16px !important;
            right: 16px !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
      {/* Top OS Bar */}
      <div className="osLayerBar">
        <div className="osLayerBarTitle" style={{ fontSize: 13, letterSpacing: "0.12em", opacity: 0.6 }}>
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="osLayerBarNav">
          <button style={navBtn}>Dashboard</button>
          <button style={navBtn} onClick={toggle}>AI</button>
          <button style={navBtn}>Settings</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="osLayerContent">
        {children}
      </div>

      {/* Floating Chat System */}
      <div ref={panelRef}>
        {open && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span>Performance AI</span>
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
              <p style={{ margin: 0, opacity: 0.9 }}>
                How can I optimise your performance today?
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="osLayerFloatingOrb"
          style={orbStyle}
          onClick={toggle}
          aria-label={open ? "Close" : "Open"}
        >
          {open ? "×" : "✦"}
        </button>
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