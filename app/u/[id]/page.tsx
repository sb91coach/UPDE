"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function UserPage({
  params,
}: {
  params: { id: string };
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Welcome to Pathfinder OS. Before we build your performance architecture, tell me: what does high performance mean to you right now?",
      },
    ]);
  }, []);

  function sendMessage() {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Understood. And what constraints in your current lifestyle are limiting that performance?",
        },
      ]);
      setLoading(false);
    }, 800);
  }

  return (
    <main style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Pathfinder OS</h1>

      <div style={{ minHeight: 400 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 16,
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: 12,
                borderRadius: 12,
                background:
                  m.role === "user" ? "#0A84FF" : "#eee",
                color: m.role === "user" ? "white" : "black",
                maxWidth: "80%",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Respond here..."
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: "#0A84FF",
            color: "white",
            fontWeight: 600,
          }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </main>
  );
}