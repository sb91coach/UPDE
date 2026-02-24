"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AIContainer from "@/app/components/AIContainer";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error) {
      router.push("/intake");
    }
  }

  return (
    <AIContainer>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, marginBottom: 12 }}>
          Build your performance system
        </h1>

        <p style={{ opacity: 0.65, fontSize: 14, lineHeight: 1.6 }}>
          Answer a few intelligent questions and we’ll generate your adaptive
          training model — tailored to your goals, constraints, and capacity.
        </p>
      </div>

      <form
        onSubmit={handleSignup}
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
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle}>
          Begin →
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