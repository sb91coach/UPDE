"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AIContainer from "@/app/components/AIContainer";

const inputStyle: React.CSSProperties = {
  padding: "16px 20px",
  minHeight: 48,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "16px 20px",
  minHeight: 52,
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 16,
  width: "100%",
};

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
        <h1 style={{ fontSize: "clamp(24px, 5vw, 30px)", fontWeight: 600, marginBottom: 12 }}>
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
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
        />

        <button type="submit" style={buttonStyle}>
          Enter System →
        </button>
      </form>

      <div className="saveHint" role="complementary" aria-label="Tip for saving the app">
        <span className="saveHintIcon" aria-hidden>⊕</span>
        <div className="saveHintContent">
          <strong>Save for later</strong>
          <p>
            Add this page to your home screen for quick access: open your browser menu (⋮ or Share) and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.
          </p>
        </div>
      </div>

      <style jsx>{`
        .saveHint {
          display: none;
          margin-top: 28px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          gap: 12px;
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .saveHint {
            display: flex;
          }
        }
        .saveHintIcon {
          font-size: 20px;
          opacity: 0.8;
          flex-shrink: 0;
        }
        .saveHintContent {
          flex: 1;
        }
        .saveHintContent strong {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .saveHintContent p {
          margin: 0;
          font-size: 13px;
          opacity: 0.85;
          line-height: 1.45;
        }
      `}</style>
    </AIContainer>
  );
}