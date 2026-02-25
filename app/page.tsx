"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="outer">

      {/* ===== OS NAVIGATION ===== */}

      <div className="topNav">
        <div className="logo">
          Performance Pathfinder
        </div>

        <div className="tabs">
          <button onClick={() => router.push("/login")}>
            Login
          </button>

          <button onClick={() => router.push("/signup")}>
            Sign Up
          </button>
        </div>
      </div>

      {/* ===== HERO OS PANEL ===== */}

      <div className="container">

        <div className="heroCard">

          <div className="phase">
            HUMAN PERFORMANCE INTELLIGENCE OS
          </div>

          <h1 className="headline">
            Adaptive Programming.
            <br />
            Built From Your Physiology.
          </h1>

          <p className="subtext">
            Performance Pathfinder OS generates fully adaptive,
            phase-driven strength and conditioning programmes
            using real performance inputs — not templates.
          </p>

          <div className="ctaRow">
            <button
              className="primaryBtn"
              onClick={() => router.push("/signup")}
            >
              Build Your Programme
            </button>

            <button
              className="secondaryBtn"
              onClick={() => router.push("/login")}
            >
              Enter OS
            </button>
          </div>

        </div>

        {/* ===== INTELLIGENCE PREVIEW ===== */}

        <div className="intelGrid">

          <div className="intelCard">
            <div className="intelTitle">
              Adaptive Periodisation
            </div>
            <div className="intelText">
              Phase progression automatically shifts based on readiness,
              fatigue accumulation, and recovery balance.
            </div>
          </div>

          <div className="intelCard">
            <div className="intelTitle">
              Domain Intelligence
            </div>
            <div className="intelText">
              Strength, aerobic capacity, mobility, and recovery are
              continuously modelled and recalibrated.
            </div>
          </div>

          <div className="intelCard">
            <div className="intelTitle">
              Tactical-Grade Programming
            </div>
            <div className="intelText">
              Detailed session architecture including main lifts,
              accessory blocks, trunk capacity, and energy systems.
            </div>
          </div>

        </div>

      </div>

      {/* ===== STYLES ===== */}

      <style jsx>{`
        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
        }

        .topNav {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:20px 40px;
          border-bottom:1px solid rgba(255,255,255,0.08);
        }

        .logo {
          font-weight:600;
          letter-spacing:1px;
          opacity:0.85;
        }

        .tabs button {
          margin-left:18px;
          background:none;
          border:none;
          color:white;
          cursor:pointer;
          opacity:0.6;
          font-size:14px;
        }

        .tabs button:hover {
          opacity:1;
        }

        .container {
          max-width:1400px;
          margin:100px auto;
          padding:0 40px;
        }

        .heroCard {
          background:rgba(255,255,255,0.05);
          border-radius:24px;
          padding:60px;
          backdrop-filter:blur(8px);
          margin-bottom:60px;
        }

        .phase {
          font-size:12px;
          letter-spacing:2px;
          opacity:0.6;
          margin-bottom:16px;
        }

        .headline {
          font-size:42px;
          line-height:1.2;
          margin-bottom:24px;
        }

        .subtext {
          font-size:16px;
          opacity:0.75;
          max-width:700px;
          margin-bottom:40px;
        }

        .ctaRow {
          display:flex;
          gap:20px;
        }

        .primaryBtn {
          padding:14px 28px;
          background:#2F80ED;
          border:none;
          border-radius:10px;
          color:white;
          font-weight:600;
          cursor:pointer;
        }

        .secondaryBtn {
          padding:14px 28px;
          background:rgba(255,255,255,0.08);
          border:none;
          border-radius:10px;
          color:white;
          cursor:pointer;
        }

        .intelGrid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:30px;
        }

        .intelCard {
          background:rgba(255,255,255,0.04);
          padding:28px;
          border-radius:20px;
        }

        .intelTitle {
          font-weight:600;
          margin-bottom:10px;
        }

        .intelText {
          font-size:14px;
          opacity:0.7;
        }
      `}</style>

    </div>
  );
}