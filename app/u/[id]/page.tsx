"use client";

import { useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div>
      <p>Dynamic Route Working</p>
    </div>
  );
}