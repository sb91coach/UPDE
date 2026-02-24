"use client";

import { useState } from "react";

export default function AIBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div style={chatWindow}>
          <div style={chatHeader}>
            Performance AI
            <button onClick={() => setOpen(false)} style={closeBtn}>
              ×
            </button>
          </div>

          <div style={chatBody}>
            <div style={botMessage}>
              How can I optimise your performance today?
            </div>
          </div>
        </div>
      )}

      <button style={bubble} onClick={() => setOpen(!open)}>
        AI
      </button>
    </>
  );
}

const bubble = {
  position: "fixed" as const,
  bottom: 30,
  right: 30,
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg,#2F80ED,#6C5CE7)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  zIndex: 1000,
};

const chatWindow = {
  position: "fixed" as const,
  bottom: 110,
  right: 30,
  width: 320,
  height: 420,
  background: "rgba(20,25,40,0.95)",
  borderRadius: 20,
  backdropFilter: "blur(20px)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column" as const,
  zIndex: 1000,
};

const chatHeader = {
  padding: 16,
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 600,
};

const chatBody = {
  flex: 1,
  padding: 16,
  overflowY: "auto" as const,
};

const botMessage = {
  background: "rgba(255,255,255,0.08)",
  padding: 12,
  borderRadius: 12,
};

const closeBtn = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: 18,
  cursor: "pointer",
};