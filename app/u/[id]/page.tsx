"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function UltraPremiumInterface() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Mouse parallax tracking
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

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
      setTimeout(() => setVisible(true), 200);
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
      <div className="background" />

      <div
        className="panel"
        style={{
          transform: `rotateX(${mouse.y}deg) rotateY(${mouse.x}deg)`
        }}
      >
        <div
          className={`orb ${listening ? "listening" : ""} ${
            loading ? "thinking" : ""
          }`}
        />

        <h1 className="title">What can I help you optimise?</h1>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Define your performance intent..."
          className="input"
        />

        <div className="buttons">
          <button onClick={handleSubmit} className="glass primary">
            {loading ? "Thinking..." : "Submit"}
          </button>

          <button onClick={startListening} className="glass">
            🎙 Speak
          </button>
        </div>

        {response && (
          <div className={`response ${visible ? "visible" : ""}`}>
  <ReactMarkdown
  components={{
    h1: ({ node, ...props }) => (
      <h1 style={{ fontSize: "26px", marginBottom: "16px", fontWeight: 600 }} {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 style={{ fontSize: "22px", marginTop: "20px", marginBottom: "10px", fontWeight: 600 }} {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 style={{ fontSize: "18px", marginTop: "18px", marginBottom: "8px", fontWeight: 600 }} {...props} />
    ),
    p: ({ node, ...props }) => (
      <p style={{ marginBottom: "12px", lineHeight: 1.6, opacity: 0.9 }} {...props} />
    ),
    li: ({ node, ...props }) => (
      <li style={{ marginBottom: "6px", lineHeight: 1.5 }} {...props} />
    ),
    strong: ({ node, ...props }) => (
      <strong style={{ fontWeight: 600 }} {...props} />
    ),
  }}
>
  {response}
</ReactMarkdown>
          </div>
        )}
      </div>

      <style jsx>{`
        .wrapper {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: black;
          overflow: hidden;
          perspective: 1000px;
          position: relative;
          color: white;
        }

        .background {
          position: absolute;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            #0A84FF,
            #9d4edd,
            #ff006e,
            #00f5ff,
            #0A84FF
          );
          animation: rotateBg 40s linear infinite;
          filter: blur(200px);
          opacity: 0.2;
        }

        @keyframes rotateBg {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .panel {
          position: relative;
          z-index: 2;
          width: 90%;
          max-width: 750px;
          padding: 60px;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(60px);
          box-shadow:
            0 0 80px rgba(0,150,255,0.3),
            inset 0 0 40px rgba(255,255,255,0.05);
          transition: transform 0.1s ease;
          text-align: center;
        }

        .orb {
          width: 160px;
          height: 160px;
          margin: 0 auto 50px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff, transparent 40%),
                      conic-gradient(#00f5ff, #0A84FF, #9d4edd, #ff006e, #00f5ff);
          animation: breathe 4s ease-in-out infinite;
          box-shadow: 0 0 100px rgba(0,150,255,0.8);
        }

        .listening {
          animation: spin 3s linear infinite;
        }

        .thinking {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes breathe {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .title {
          font-size: 30px;
          margin-bottom: 25px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .input {
          width: 100%;
          padding: 18px;
          border-radius: 50px;
          border: none;
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 16px;
          margin-bottom: 25px;
        }

        .buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .glass {
          padding: 14px 30px;
          border-radius: 50px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .glass:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-3px);
        }

        .primary {
          background: linear-gradient(135deg, #0A84FF, #9d4edd);
          border: none;
        }

        .response {
          margin-top: 50px;
          opacity: 0;
          transform: translateY(20px);
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