"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AIContainer from "@/app/components/AIContainer";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push("/profile");
    }
  }

  return (
    <AIContainer>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, marginBottom: 12 }}>
          Welcome back
        </h1>
        <p style={{ opacity: 0.65, fontSize: 14 }}>
          Access your performance dashboard and continue building.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle}>
          Enter System →
        </button>
      </form>
    </AIContainer>
  );
}

const inputStyle = {
  padding: "16px 20px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const buttonStyle = {
  padding: "16px 20px",
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};