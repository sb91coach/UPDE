"use client";

import { useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function Page() {
  const [messages] = useState<Message[]>([
    { role: "assistant", content: "Test message" },
  ]);

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>{m.content}</div>
      ))}
    </div>
  );
}