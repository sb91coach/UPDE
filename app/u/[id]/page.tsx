"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const INITIAL_MESSAGE =
  "Welcome to Pathfinder OS. Tell me what high performance means to you right now.";

const FOLLOW_UP_MESSAGE =
  "Understood. What constraints in your current lifestyle are limiting that performance?";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
  }, []);

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content: FOLLOW_UP_MESSAGE,
      };

      setMessages([...newMessages, assistantMessage]);
      setLoading(false);
    }, 600);
  }

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Pathfinder OS</h1>

      <div style={{ minHeight: 300, marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: m.role === "user" ? "#0A84FF" : "#eee",
                color: m.role === "user" ? "white" : "black",
                display: "inline-block",
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
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}