"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function IntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [goal, setGoal] = useState("General performance");
  const [sport, setSport] = useState("General");

  async function createProfile() {
    setLoading(true);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, sport }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(json?.error ?? "Something went wrong");
      return;
    }

    router.push(`/u/${json.id}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>UPDE Intake</h1>
      <p style={{ color: "#666" }}>Create a profile (no login). You’ll get a personal link.</p>

      <div style={{ marginTop: 18 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Goal</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Sport (optional)</label>
        <input
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </div>

      <button
        onClick={createProfile}
        disabled={loading}
        style={{
          marginTop: 16,
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "none",
          background: "#0A84FF",
          color: "white",
          fontWeight: 600,
          cursor: "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Creating..." : "Create my profile"}
      </button>
    </main>
  );
}
