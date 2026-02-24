"use client";

import { ReactNode } from "react";

export default function AIContainer({ children }: { children: ReactNode }) {
  return (
    <>
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', sans-serif;
          box-sizing: border-box;
        }
      `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(10,132,255,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(240,78,55,0.15), transparent 40%), #0C0F18",
        }}
      >
        <div
          style={{
            width: 760,
            maxWidth: "92%",
            background: "rgba(26,31,46,0.88)",
            backdropFilter: "blur(40px)",
            borderRadius: 28,
            padding: 56,
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#fff",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}