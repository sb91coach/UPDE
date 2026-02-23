"use client";

import { useState } from "react";

export default function Page() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Dynamic Route Working</p>
      <button onClick={() => setCount(count + 1)}>
        Clicked {count}
      </button>
    </div>
  );
}