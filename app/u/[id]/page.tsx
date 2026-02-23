"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function UserPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  async function handleSubmit() {
    if (!input.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
        }),
      });

      const data = await res.json();
      setResponse(data.message?.content || "No response.");
    } catch {
      setResponse("Connection error.");
    }

    setLoading(false);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognition.start();
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "radial-gradient(circle at 20% 20%, #0A84FF33, transparent 40%), radial-gradient(circle at 80% 80%, #9d4edd33, transparent 40%), #000",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Animated Background Glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "conic-gradient(from 180deg, #00f5ff, #0A84FF, #9d4edd, #ff006e, #00f5ff)",
          filter: "blur(160px)",
          opacity: 0.25,
          animation: "spin 25s linear infinite",
        }}
      />

      {/* Main Panel */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "90%",
          maxWidth: 750,
          padding: 50,
          borderRadius: 30,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(40px)",
          boxShadow: "0 0 60px rgba(0,150,255,0.25)",
          textAlign: "center",
        }}
      >
        {/* Siri Orb */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            margin: "0 auto 40px auto",
            background:
              "conic-gradient(from 180deg, #00f5ff, #0A84FF, #9d4edd, #ff006e, #00f5ff)",
            animation: listening
              ? "spin 4s linear infinite"
              : loading
              ? "pulse 2s ease-in-out infinite"
              : "none",
            boxShadow: "0 0 60px rgba(0,150,255,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "#000",
              filter: "blur(6px)",
            }}
          />
        </div>

        <h1 style={{ fontSize: 30, marginBottom: 20 }}>
          What can I help you optimise?
        </h1>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Define your performance intent..."
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 40,
            border: "none",
            outline: "none",
            fontSize: 16,
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            marginBottom: 15,
          }}
        />

        <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "12px 30px",
              borderRadius: 30,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              background: "#0A84FF",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {loading ? "Thinking..." : "Submit"}
          </button>

          <button
            onClick={startListening}
            style={{
              padding: "12px 25px",
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            🎙 Speak
          </button>
        </div>

        {response && (
          <div
            style={{
              marginTop: 40,
              textAlign: "left",
              lineHeight: 1.6,
              fontSize: 16,
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
}