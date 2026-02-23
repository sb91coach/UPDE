"use client";

import { useState } from "react";

export default function UserPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!input.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: input,
            },
          ],
        }),
      });

      const data = await res.json();
      setResponse(data.message?.content || "No response.");
    } catch {
      setResponse("Connection error.");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at 30% 30%, #1e3c72, transparent 50%), radial-gradient(circle at 70% 70%, #2a5298, transparent 50%), #000",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient Glow Layer */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,150,255,0.4), transparent 60%)",
          filter: "blur(120px)",
          animation: "pulse 8s infinite ease-in-out",
        }}
      />

      {/* Glass Panel */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "90%",
          maxWidth: 700,
          padding: 40,
          borderRadius: 30,
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 0 80px rgba(0,150,255,0.2)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 20 }}>
          What can I help you optimise?
        </h1>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Define your performance intent..."
          style={{
            width: "100%",
            padding: 20,
            borderRadius: 40,
            border: "none",
            outline: "none",
            fontSize: 18,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            marginBottom: 20,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: "14px 40px",
            borderRadius: 40,
            border: "none",
            fontSize: 16,
            fontWeight: 600,
            background: "#0A84FF",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Thinking..." : "Submit"}
        </button>

        {response && (
          <div
            style={{
              marginTop: 30,
              fontSize: 18,
              lineHeight: 1.6,
              opacity: 0.9,
            }}
          >
            {response}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 0.6; }
          }
        `}
      </style>
    </div>
  );
}