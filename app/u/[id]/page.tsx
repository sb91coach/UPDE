"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function UserPage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [visible, setVisible] = useState(false);

  async function handleSubmit() {
    if (!input.trim()) return;

    setLoading(true);
    setResponse("");
    setVisible(false);

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
      setTimeout(() => setVisible(true), 100);
    } catch {
      setResponse("Connection error.");
      setVisible(true);
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
    <div className="wrapper">
      {/* Animated Gradient Background */}
      <div className="background" />

      {/* Glass Panel */}
      <div className="panel">

        {/* Animated Orb */}
        <div
          className={`orb ${listening ? "orbListening" : ""} ${
            loading ? "orbThinking" : ""
          }`}
        />

        <h1 className="title">What can I help you optimise?</h1>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Define your performance intent..."
          className="input"
        />

        <div className="buttonRow">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="glassButton primary"
          >
            {loading ? "Thinking..." : "Submit"}
          </button>

          <button
            onClick={startListening}
            className="glassButton"
          >
            🎙 Speak
          </button>
        </div>

        {response && (
          <div className={`response ${visible ? "visible" : ""}`}>
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>

      <style jsx>{`
        .wrapper {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background: #000;
          position: relative;
          color: white;
        }

        .background {
          position: absolute;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 20% 30%, #0A84FF40, transparent 40%),
                      radial-gradient(circle at 70% 70%, #9d4edd40, transparent 40%),
                      radial-gradient(circle at 40% 80%, #ff006e30, transparent 40%);
          animation: drift 30s infinite linear;
          filter: blur(120px);
        }

        @keyframes drift {
          0% { transform: translate(0%, 0%) rotate(0deg); }
          50% { transform: translate(-10%, -5%) rotate(180deg); }
          100% { transform: translate(0%, 0%) rotate(360deg); }
        }

        .panel {
          position: relative;
          z-index: 2;
          width: 90%;
          max-width: 700px;
          padding: 50px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(40px);
          box-shadow: 0 0 60px rgba(0, 150, 255, 0.2);
          text-align: center;
        }

        .orb {
          width: 140px;
          height: 140px;
          margin: 0 auto 40px;
          border-radius: 50%;
          background: conic-gradient(#00f5ff, #0A84FF, #9d4edd, #ff006e, #00f5ff);
          animation: breathe 4s ease-in-out infinite;
          box-shadow: 0 0 80px rgba(0, 150, 255, 0.7);
        }

        .orbListening {
          animation: spin 3s linear infinite;
        }

        .orbThinking {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .title {
          font-size: 28px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .input {
          width: 100%;
          padding: 16px;
          border-radius: 40px;
          border: none;
          outline: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          margin-bottom: 20px;
          font-size: 16px;
        }

        .buttonRow {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        .glassButton {
          padding: 12px 28px;
          border-radius: 40px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .glassButton:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .primary {
          background: linear-gradient(135deg, #0A84FF, #9d4edd);
          border: none;
        }

        .response {
          margin-top: 40px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.6s ease;
          text-align: left;
          max-height: 300px;
          overflow-y: auto;
        }

        .response.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}