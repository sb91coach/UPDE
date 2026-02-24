"use client";

import { useState } from "react";

export default function OSLayer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      
      {/* ─────────────── Top OS Bar ─────────────── */}

      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: "0.12em", opacity: 0.6 }}>
          PERFORMANCE PATHFINDER OS
        </div>

        <div style={{ display: "flex", gap: 32, fontSize: 14 }}>
          <button style={navBtn}>Dashboard</button>
          <button style={navBtn} onClick={() => setOpen(true)}>AI</button>
          <button style={navBtn}>Settings</button>
        </div>
      </div>

      {/* ─────────────── Main Content ─────────────── */}

      <div
        style={{
          padding: "40px 64px",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {children}
      </div>

      {/* ─────────────── Floating Orb ─────────────── */}

      <div
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          zIndex: 9999,
        }}
      >
        ✦
      </div>

      {/* ─────────────── Slide AI Panel ─────────────── */}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 420,
          background: "rgba(15,15,20,0.98)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          padding: 40,
          zIndex: 10000,
        }}
      >
        <h2>Performance AI</h2>
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