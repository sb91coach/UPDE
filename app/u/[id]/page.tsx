"use client";

import { useState } from "react";

export default function Page() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 20 }}>
      <p>Count: {count}</p>
      <button
        style={{ padding: 10, background: "black", color: "white" }}
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
}