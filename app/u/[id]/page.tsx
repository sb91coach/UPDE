"use client";

import { useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const INITIAL_MESSAGE =
  "Welcome to Pathfinder OS. Tell me what high performance means to you right now.";

export default function UserPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.message?.content || "No response.",
        },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error connecting to AI." },
      ]);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>Pathfinder OS</h1>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: 16,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
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
    </div>
  );
}