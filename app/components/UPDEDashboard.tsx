"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  readiness_score: number;
  aerobic_score: number;
  strength_upper: number;
  strength_lower: number;
  mobility_score: number;
  sleep_score: number;
  primary_limiter: string;
  momentum: string;
};

export default function UPDEDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      setProfile(data);
    }

    load();
  }, []);

  if (!profile) return null;

  /* =========================
     DERIVED METRICS
  ========================= */

  const avgStrength =
    (profile.strength_upper + profile.strength_lower) / 2;

  const workCapacity = Math.round(
    profile.aerobic_score * 0.5 +
      avgStrength * 0.5
  );

  const load =
    (profile.aerobic_score +
      profile.strength_upper +
      profile.strength_lower) /
    3;

  const recovery =
    (profile.sleep_score +
      profile.mobility_score) /
    2;

  const circumference = 2 * Math.PI * 48;
  const offset =
    circumference -
    (profile.readiness_score / 100) *
      circumference;

  const domains = [
    { label: "Aerobic Capacity", value: profile.aerobic_score },
    { label: "Sleep Quality", value: profile.sleep_score },
    { label: "Hip Mobility", value: profile.mobility_score },
    { label: "Strength (Upper)", value: profile.strength_upper },
    { label: "Strength (Lower)", value: profile.strength_lower },
    { label: "Work Capacity", value: workCapacity },
  ];

  return (
    <div className="outer">

      {/* NAVIGATION */}

      <nav className="nav">
        <div className="brand">
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="tabs">
          <NavTab href="/" label="Home" pathname={pathname} />
          <NavTab href="/profile" label="Profile" pathname={pathname} />
          <NavTab href="/programme" label="Programme" pathname={pathname} />
          <NavTab href="/checkin" label="Check-in" pathname={pathname} />
        </div>
      </nav>

      <div className="container">

        {/* EXECUTIVE BRIDGE */}

        <div className="bridge">

          <div className="bridgeLeft">
            <svg width="120" height="120">
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="#2F80ED"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: "drop-shadow(0 0 6px rgba(47,128,237,0.6))",
                }}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dy=".3em"
                fontSize="24"
                fill="#fff"
                fontWeight="700"
              >
                {profile.readiness_score}
              </text>
            </svg>

            <div className="readyLabel">READY</div>
          </div>

          <div className="bridgeRight">
            <div className="phase">
              STRENGTH–ENDURANCE HYBRID · PHASE 2
            </div>

            <h1 className="headline">
              {profile.readiness_score > 65
                ? "Your body is primed."
                : "System stabilising."}
            </h1>

            <div className="metaRow">
              <Meta label="Primary Limiter" value={profile.primary_limiter} />
              <Meta label="Momentum" value={`↑ ${profile.momentum}`} highlight />
              <Meta label="Sessions This Week" value="3 of 4 done" />
            </div>

            <div className="loadTrack">
              <div className="loadFill" style={{ width: `${load}%` }} />
              <div className="recoveryFill" style={{ width: `${recovery}%` }} />
            </div>

            <div className="loadLabels">
              <span>Load {Math.round(load)}</span>
              <span>Recovery {Math.round(recovery)}</span>
            </div>
          </div>
        </div>

        {/* DOMAIN INTELLIGENCE */}

        <SectionTitle text="DOMAIN INTELLIGENCE" />

        <div className="grid">
          {domains.map((d, i) => (
            <DomainCard key={i} label={d.label} value={d.value} />
          ))}
        </div>

        {/* PERFORMANCE IDENTITY */}

        <SectionTitle text="PERFORMANCE IDENTITY" />

        <div className="identityRow">
          <Identity label="Training Bias" value="Strength–Aero" />
          <Identity label="Capacity Ceiling" value="~82 pts" />
          <Identity label="Current Phase" value="Base Build" />
          <Identity label="Recovery Profile" value="Moderate" />
        </div>

        {/* SYSTEM SIGNALS */}

        <SectionTitle text="SYSTEM SIGNALS" />

        <Signal title="Aerobic deficit widening" subtitle="Zone 2 volume below phase target" />
        <Signal title="HRV window — optimal output" subtitle="Readiness supports quality session" />
        <Signal title="Upper block closed" subtitle="Advancing to hypertrophy next week" />

        {/* TODAY SESSION */}

        <SectionTitle text="TODAY'S SESSION" />

        <SessionCard />

      </div>

      <style jsx>{`

        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height:100vh;
          color:white;
          position:relative;
          overflow:hidden;
        }

        .outer::before {
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size:40px 40px;
          opacity:0.4;
          animation:gridDrift 40s linear infinite;
        }

        @keyframes gridDrift {
          0% { background-position:0 0,0 0; }
          100% { background-position:200px 200px,200px 200px; }
        }

        .nav {
          display:flex;
          justify-content:space-between;
          padding:20px 40px;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }

        .brand {
          font-size:12px;
          letter-spacing:2px;
          opacity:0.6;
        }

        .tabs { display:flex; gap:30px; }

        .container {
          max-width:1200px;
          margin:40px auto;
          padding:0 40px;
        }

        .bridge {
          display:flex;
          gap:50px;
          background:linear-gradient(135deg,rgba(17,24,39,0.95),rgba(30,41,59,0.95));
          padding:40px;
          border-radius:24px;
          margin-bottom:50px;
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(47,128,237,0.15);
          position:relative;
          overflow:hidden;
        }

        .bridge::after {
          content:"";
          position:absolute;
          top:0;
          left:-100%;
          width:200%;
          height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent);
          animation:scan 6s linear infinite;
        }

        @keyframes scan {
          0% { transform:translateX(0); }
          100% { transform:translateX(50%); }
        }

        .grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:20px;
          margin-bottom:50px;
        }

        .identityRow {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:20px;
          margin-bottom:50px;
        }

      `}</style>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function NavTab({ href, label, pathname }: any) {
  const active = pathname === href;
  return (
    <Link href={href}>
      <span style={{
        fontSize:14,
        opacity:active?1:0.6,
        borderBottom:active?"2px solid #2F80ED":"2px solid transparent",
        paddingBottom:4,
        cursor:"pointer"
      }}>
        {label}
      </span>
    </Link>
  );
}

function Meta({ label, value, highlight }: any) {
  return (
    <div>
      <div style={{ fontSize:10, opacity:0.6 }}>{label}</div>
      <div style={highlight?{color:"#27E0A6"}:{}}>{value}</div>
    </div>
  );
}

function DomainCard({ label, value }: any) {
  const target = 70;
  const gap = Math.max(target - value, 0);

  const color =
    label === "Work Capacity"
      ? "linear-gradient(90deg,#27E0A6,#00FFA3)"
      : "linear-gradient(90deg,#2F80ED,#6C5CE7)";

  const trend = [
    value - 10,
    value - 6,
    value - 3,
    value - 1,
    value,
  ];

  const path = trend
    .map((p, i) => `${i * 25},${30 - p * 0.25}`)
    .join(" ");

  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",
      borderRadius:18,
      padding:22,
      transition:"all 0.3s ease"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span>{label}</span>
        <span style={{fontWeight:700,fontSize:18}}>{value}</span>
      </div>

      <div style={{
        height:4,
        background:"rgba(255,255,255,0.1)",
        borderRadius:4,
        marginBottom:12
      }}>
        <div style={{
          height:"100%",
          width:`${value}%`,
          background: color
        }} />
      </div>

      <svg width="120" height="30">
        <polyline
          fill="none"
          stroke="#2F80ED"
          strokeWidth="2"
          strokeLinecap="round"
          points={path}
        />
      </svg>

      <div style={{fontSize:12,opacity:0.6,marginTop:8}}>
        {gap > 0 ? `Gap ${gap}` : "On Target"}
      </div>
    </div>
  );
}

function Identity({ label, value }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16
    }}>
      <div style={{fontSize:10,opacity:0.6,marginBottom:4}}>
        {label}
      </div>
      <div style={{fontWeight:600}}>
        {value}
      </div>
    </div>
  );
}

function Signal({ title, subtitle }: any) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding:18,
      borderRadius:16,
      marginBottom:12
    }}>
      <div style={{fontWeight:600}}>
        {title}
      </div>
      <div style={{opacity:0.6,fontSize:13}}>
        {subtitle}
      </div>
    </div>
  );
}

function SessionCard() {
  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))",
      padding:28,
      borderRadius:22,
      marginBottom:60,
      transition:"all 0.3s ease"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,letterSpacing:2,opacity:0.6,marginBottom:6}}>
            AEROBIC DEVELOPMENT · ZONE 2
          </div>
          <div style={{fontSize:20,fontWeight:600,marginBottom:6}}>
            Lower Body Aerobic
          </div>
          <div style={{fontSize:13,opacity:0.6}}>
            60 min · 4 exercises · Intensity: Low–Mod
          </div>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:"#27E0A6"}}>
          +4 pts
        </div>
      </div>

      <div style={{marginTop:16,fontSize:13,opacity:0.7}}>
        Targets primary limiter: Aerobic Capacity
      </div>
    </div>
  );
}

function SectionTitle({ text }: any) {
  return (
    <div style={{
      fontSize:11,
      letterSpacing:2,
      opacity:0.6,
      marginBottom:14
    }}>
      {text}
    </div>
  );
}