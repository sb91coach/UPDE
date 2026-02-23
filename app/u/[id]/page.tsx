"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const INITIAL_MESSAGE =
  "Hello. I’m Pathfinder OS. Tell me what high performance means to you.";

export default function UserPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        {
          role: "assistant",
          content: "Connection error.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        color: "#fff",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "60px 20px 120px",
          maxWidth: 800,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 24,
              display: "flex",
              justifyContent:
                m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderRadius: 24,
                maxWidth: "75%",
                fontSize: 18,
                lineHeight: 1.5,
                background:
                  m.role === "user"
                    ? "linear-gradient(135deg, #0A84FF, #4C8DFF)"
                    : "rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                boxShadow:
                  m.role === "assistant"
                    ? "0 0 40px rgba(255,255,255,0.05)"
                    : "0 0 30px rgba(10,132,255,0.3)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ opacity: 0.5, fontSize: 14 }}>
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          padding: 20,
          background:
            "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            display: "flex",
            gap: 12,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak your intent..."
            style={{
              flex: 1,
              padding: 18,
              borderRadius: 40,
              border: "none",
              outline: "none",
              fontSize: 16,
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              padding: "0 26px",
              borderRadius: 40,
              border: "none",
              fontSize: 16,
              fontWeight: 600,
              background: "#0A84FF",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}