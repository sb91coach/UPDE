# Profile Page — Full Code Reference for UI Redesign

This document contains the complete code for the **profile page** (home/dashboard) and all components and styles that affect it, for use with an external AI to redesign to a premium Apple/iOS standard.

---

## 1. Profile page (entry point)

**File:** `app/profile/page.tsx`

```tsx
"use client";

import AthleteHomeDashboard from "@/app/components/AthleteHomeDashboard";
import OSLayer from "@/app/components/OSLayer";
import { RequireAuth } from "@/lib/requireAuth";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <OSLayer>
        <AthleteHomeDashboard />
      </OSLayer>
    </RequireAuth>
  );
}
```

---

## 2. Root layout (wraps all pages)

**File:** `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Performance Pathfinder Coaching System",
  description: "AI-driven performance coaching: diagnostics, capacity profile, programme generation, readiness monitoring, automatic adaptation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

---

## 3. Auth wrapper (loading + redirect)

**File:** `lib/requireAuth.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  loading: boolean;
};

export function useRequireAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  return { user, loading };
}

const spinnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  width: "100%",
  background: "linear-gradient(180deg, #0a0a0f 0%, #0f1117 100%)",
  color: "rgba(255,255,255,0.6)",
  fontSize: 14,
};

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div style={spinnerStyle} aria-live="polite">
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
```

---

## 4. OSLayer (top bar, content area, bottom nav, AI orb)

**File:** `app/components/OSLayer.tsx`

Wraps page content. Renders: top bar (logo + nav on desktop; teal dot + logo + avatar on mobile), main content area, optional mobile bottom tab bar, floating AI Coach orb (wrapped in `SoftPaywall`). Uses inline `<style>` and inline `style={}` objects.

**Full source (copy for external AI):**

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import MobileTabBar from "@/app/components/MobileTabBar";
import { SoftPaywall } from "@/app/components/SoftPaywall";

const orbStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 32,
  right: 32,
  width: 58,
  height: 58,
  borderRadius: "50%",
  background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
  border: "none",
  color: "#fff",
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10001,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 100,
  right: 32,
  width: 360,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "min(500px, 70vh)",
  background: "rgba(15,15,20,0.98)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  zIndex: 10000,
};

const panelHeaderStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  letterSpacing: "0.08em",
};

const panelBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: 20,
  overflowY: "auto",
  fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  padding: "8px 12px",
  fontSize: 18,
};

export default function OSLayer({
  children,
  hideBottomNav,
  isPro = true,
}: {
  children: React.ReactNode;
  hideBottomNav?: boolean;
  isPro?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  return (
    <div className="osLayerRoot" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <style>{`
        .osLayerRoot .osLayerBar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
        }
        .osLayerRoot .osLayerBarLogoDot { display: none; }
        .osLayerRoot .osLayerBarNav { display: flex; gap: 32px; font-size: 14px; }
        .osLayerRoot .osLayerContent { padding: 40px 64px; width: 100%; max-width: 100%; }
        @media (max-width: 768px) {
          .osLayerRoot .osLayerBar {
            padding: 0 20px;
            padding-top: env(safe-area-inset-top);
            padding-bottom: 12px;
            flex-wrap: nowrap;
            min-height: 52px;
            height: calc(52px + env(safe-area-inset-top));
            align-items: flex-end;
            background: rgba(10, 12, 18, 0.97);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .osLayerRoot .osLayerBarTitle {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: rgba(238, 240, 244, 0.9);
            flex: 1;
            margin: 0;
            display: flex;
            align-items: center;
          }
          .osLayerRoot .osLayerBarLogoDot {
            display: block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #00c9a0;
            box-shadow: 0 0 8px rgba(0, 201, 160, 0.6);
            margin-right: 8px;
            flex-shrink: 0;
          }
          .osLayerRoot .desktop-nav-tabs { display: none !important; }
          .osLayerRoot .osLayerBarNav { gap: 16px; font-size: 13px; }
          .osLayerRoot .osLayerContent {
            padding: 20px 16px;
            padding-bottom: calc(80px + env(safe-area-inset-bottom));
          }
          .osLayerRoot .osLayerFloatingOrb {
            bottom: calc(16px + env(safe-area-inset-bottom) + 60px) !important;
            right: 16px !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
      <div className="osLayerBar">
        <div className="osLayerBarTitle" style={{ fontSize: 13, letterSpacing: "0.12em", opacity: 0.6 }}>
          <span className="osLayerBarLogoDot" aria-hidden />
          PERFORMANCE PATHFINDER OS
        </div>
        <div className="osLayerBarNav desktop-nav-tabs">
          <Link href="/profile" style={navBtn}>Home</Link>
          <Link href="/programme" style={navBtn}>Programme</Link>
          <Link href="/benchmarks" style={navBtn}>Progress</Link>
          <Link href="/coach" style={navBtn}>Coach</Link>
          <Link href="/tactical/input" style={navBtn}>Readiness</Link>
          <button style={navBtn} onClick={toggle}>AI Coach</button>
          <Link href="/settings" style={navBtn}>Settings</Link>
        </div>
        <Link
          href="/settings"
          className="osLayerBarAvatar"
          style={{
            display: "none",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#fff",
            textDecoration: "none",
          }}
          aria-label="Settings / menu"
        >
          ⋯
        </Link>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .osLayerRoot .osLayerBarAvatar { display: flex !important; }
        }
      `}</style>
      <div className="osLayerContent main-content">
        {children}
      </div>
      {!hideBottomNav && <MobileTabBar />}
      <div ref={panelRef}>
        {open && (
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span>AI Coach</span>
              <button type="button" style={closeBtnStyle} onClick={close} aria-label="Close">×</button>
            </div>
            <div style={panelBodyStyle}>
              <p style={{ margin: "0 0 16px", opacity: 0.9 }}>How can I optimise your performance today?</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Explain training</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Ask about any session, exercise, or phase. I can clarify intent and progressions.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Adjust programmes</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Request changes to volume, intensity, or exercise selection based on your readiness.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Interpret readiness</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>I'll help you understand your readiness score and what to prioritise today.</p>
                </section>
                <section>
                  <strong style={{ fontSize: 12, letterSpacing: "0.04em", opacity: 0.9 }}>Generate reports</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>Request summaries of training history, goal progress, or capacity trends.</p>
                </section>
              </div>
            </div>
          </div>
        )}
        <SoftPaywall isPro={isPro} feature="AI Coaching">
          <button
            type="button"
            className="osLayerFloatingOrb"
            style={orbStyle}
            onClick={() => isPro && toggle()}
            aria-label={open ? "Close AI Coach" : "Open AI Coach"}
          >
            {open ? "×" : "✦"}
          </button>
        </SoftPaywall>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
};
```

---

## 5. Mobile bottom tab bar

**File:** `app/components/MobileTabBar.tsx`

- Tabs: Home (`/profile`), Plan (`/programme`), Input (`/tactical/input`), More (`/settings`).
- Inline SVG icons: HomeIcon, PlanIcon, CheckIcon, MoreIcon (22×22, stroke 1.8).
- **Classes:** `mobile-tab-bar`, `tab-item`, `tab-item.active`, `tab-icon`, `tab-label`.
- **Styles (styled-jsx):**  
  `.mobile-tab-bar`: `display: none` by default; `@media (max-width: 768px)` → `display: flex`, `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `z-index: 200`, `height: calc(64px + env(safe-area-inset-bottom))`, `padding-bottom: env(safe-area-inset-bottom)`, `padding-top: 10px`, `background: rgba(10, 12, 18, 0.97)`, `backdrop-filter: blur(24px)`, `-webkit-backdrop-filter: blur(24px)`, `border-top: 1px solid rgba(255, 255, 255, 0.06)`, `align-items: flex-start`, `justify-content: space-around`.  
  `.tab-item`: flex column, center, `gap: 4px`, `min-width: 64px`, `min-height: 44px`, `color: rgba(238, 240, 244, 0.28)`, `transition: color 0.15s`, no underline, cursor pointer.  
  `.tab-item.active`: `color: #00c9a0`.  
  `.tab-icon`: 22×22, flex center.  
  `.tab-label`: `font-size: 10px`, `font-weight: 600`, `letter-spacing: 0.04em`, `text-transform: uppercase`.

Full component (for full JSX/CSS copy):

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const PlanIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

const TABS = [
  { label: "Home", icon: HomeIcon, href: "/profile" },
  { label: "Plan", icon: PlanIcon, href: "/programme" },
  { label: "Input", icon: CheckIcon, href: "/tactical/input" },
  { label: "More", icon: MoreIcon, href: "/settings" },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="mobile-tab-bar" role="navigation" aria-label="Main navigation">
      {TABS.map(({ label, icon: Icon, href }) => {
        const isActive =
          pathname === href ||
          (href === "/profile" && pathname?.startsWith("/profile") && !pathname?.startsWith("/programme")) ||
          (href === "/programme" && pathname?.startsWith("/programme")) ||
          (href === "/tactical/input" && pathname?.startsWith("/tactical/input")) ||
          (href === "/settings" && pathname?.startsWith("/settings"));
        return (
          <Link key={label} href={href} className={`tab-item ${isActive ? "active" : ""}`} aria-current={isActive ? "page" : undefined}>
            <span className="tab-icon" aria-hidden><Icon /></span>
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .mobile-tab-bar { display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; height: calc(64px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: rgba(10, 12, 18, 0.97); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-top: 1px solid rgba(255, 255, 255, 0.06); align-items: flex-start; justify-content: space-around; padding-top: 10px; }
        @media (max-width: 768px) { .mobile-tab-bar { display: flex; } }
        .tab-item { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 64px; min-height: 44px; color: rgba(238, 240, 244, 0.28); transition: color 0.15s; text-decoration: none; cursor: pointer; }
        .tab-item.active { color: #00c9a0; }
        .tab-icon { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
        .tab-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
      `}</style>
    </nav>
  );
}
```

---

## 6. Main profile content — AthleteHomeDashboard

**File:** `app/components/AthleteHomeDashboard.tsx`

This is the **main content** shown on the profile page (inside OSLayer).

**Behaviour:** Fetches session + profile (readiness, check-in date), shows loading state, then:
- Title: "Today"
- Readiness card: label "Readiness Score", big score %, label from `readinessLabel(score)` (Good to train / Moderate / Recovery recommended)
- Today’s session card: label "Today's Session", session title, Focus + Duration
- Quick actions: "Start Workout" button (link to `/programme`), then two text links: Coach, Log readiness

**Tailwind / classes used:**  
`mobile-polish`, `min-h-[60vh]`, `flex`, `items-center`, `justify-center`, `text-gray-500`, `text-sm`, `space-y-6`, `text-xl`, `font-semibold`, `text-gray-900`, `polish-card`, `space-y-3`, `text-2xl`, `font-bold`, `text-gray-600`, `text-lg`, `space-y-1`, `flex-col`, `pt-2`, `h-12`, `w-full`, `rounded-xl`, `font-medium`, `bg-blue-600`, `hover:bg-blue-700`, `text-white`, `transition-colors`, `active:scale-[0.98]`, `gap-4`, `text-xs`, `underline`, `hover:text-gray-700`.

**Full component:**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type TodaySession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  exercisesCount: number;
  detail: string;
};

function readinessLabel(score: number): string {
  if (score >= 75) return "Good to train";
  if (score >= 55) return "Moderate – consider reducing load";
  return "Recovery recommended";
}

export default function AthleteHomeDashboard() {
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (mounted) setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("readiness_score, checkin_readiness, checkin_date").eq("id", session.user.id).maybeSingle();
      const rs = profile?.checkin_date === new Date().toISOString().slice(0, 10) ? profile?.checkin_readiness ?? profile?.readiness_score ?? 70 : profile?.readiness_score ?? 70;
      if (mounted) setReadinessScore(typeof rs === "number" ? rs : 70);
      const res = await fetch("/api/today-session");
      const json = res.ok ? await res.json() : null;
      if (mounted && json?.todaySession) setTodaySession(json.todaySession);
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mobile-polish min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  const score = readinessScore ?? 70;
  const session = todaySession ?? {
    sessionTitle: "Lower Body Strength",
    duration: "55 min",
    intensity: "Moderate–High",
    exercisesCount: 4,
    detail: "Force production focus",
  };
  const trainingFocus = session.intensity === "Low" ? "Recovery" : session.detail || "Force Production";

  return (
    <div className="mobile-polish flex flex-col space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Today</h1>

      <section className="polish-card space-y-3">
        <p className="text-sm text-gray-500">Readiness Score</p>
        <p className="text-2xl font-bold text-gray-900">{Math.round(score)}%</p>
        <p className="text-sm text-gray-600">{readinessLabel(score)}</p>
      </section>

      <section className="polish-card space-y-3">
        <p className="text-sm text-gray-500">Today&apos;s Session</p>
        <p className="text-lg font-semibold text-gray-900">{session.sessionTitle}</p>
        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="text-gray-500">Focus:</span> {trainingFocus}</p>
          <p><span className="text-gray-500">Duration:</span> {session.duration}</p>
        </div>
      </section>

      <div className="flex flex-col space-y-3 pt-2">
        <Link
          href="/programme"
          className="h-12 w-full flex items-center justify-center rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors active:scale-[0.98]"
        >
          Start Workout
        </Link>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <Link href="/coach" className="underline hover:text-gray-700">Coach</Link>
          <Link href="/tactical/input" className="underline hover:text-gray-700">Log readiness</Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Global stylesheet (affects profile page)

**File:** `app/globals.css`

Classes used by the profile flow: `antialiased` (body), `mobile-polish`, `polish-card`, and (on other pages) `train-card`, `safe-area-pb`, `rangeSlider`, `info-card`, `info-card-label`, `info-card-value`. Mobile typography under `.container` does not wrap the profile content (no `.container` on profile), but the same design system applies.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --space-page: 16px;
  --space-inner: 12px;
  --space-block: 24px;
  --card-padding: 16px;
  --section-gap: 24px;
  --btn-min-height: 44px;
  --radius-card: 16px;
  --radius-btn: 12px;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.08);
  --accent: #2F80ED;
  --accent-hover: #2563eb;
  --success: rgba(39, 224, 166, 0.9);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

html { min-width: 0; }

html, body {
  height: 100%;
  margin: 0;
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: 480px) {
  body { min-width: 280px; }
}

.safe-area-pb {
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0));
}

@media (max-width: 768px) {
  .desktop-only-nav { display: none !important; }
}

@media (max-width: 767px) {
  .restTimerFloating.restTimerRoot {
    position: fixed !important;
    bottom: calc(72px + env(safe-area-inset-bottom, 0));
    left: 16px; right: 16px;
    z-index: 9000;
    margin-top: 0 !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.train-card {
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: var(--shadow-card);
}
@media (prefers-color-scheme: dark) {
  .train-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.mobile-polish {
  max-width: 28rem;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem 1rem 1.5rem;
  background: #f9fafb;
}
@media (min-width: 768px) {
  .mobile-polish {
    max-width: 32rem;
    padding: 1.5rem 1.5rem 2rem;
  }
}

.polish-card {
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f3f4f6;
  padding: 1rem 1.25rem;
}
@media (min-width: 768px) {
  .polish-card { padding: 1.25rem 1.5rem; }
}

.rangeSlider {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 9999px;
  background: #e5e7eb;
}
.rangeSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.rangeSlider::-moz-range-thumb {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@media (max-width: 768px) {
  .container h1, .container h2 {
    letter-spacing: -0.5px;
    line-height: 1.15;
  }
  .container p, .container li {
    font-size: 14px;
    line-height: 1.65;
    color: rgba(238, 240, 244, 0.55);
  }
  .container [class*="card"], .container [class*="Card"],
  .container .performanceAdjustmentsSignal, .container .briefWrap > div {
    border-radius: 12px;
  }
  .container .week-section + * { margin-bottom: 24px; }
}

.info-card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 20px 18px;
  margin-bottom: 12px;
}
.info-card-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(238, 240, 244, 0.25);
  margin-bottom: 5px;
}
.info-card-value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(238, 240, 244, 0.85);
  line-height: 1.4;
}
```

---

## 8. Tailwind config (theme)

**File:** `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
```

No custom theme — Tailwind defaults (e.g. `gray-500`, `blue-600`, `rounded-xl`) are used.

---

## 9. OSLayer full inline styles (copy-paste)

For the external AI, the exact `<style>` block used inside `OSLayer.tsx`:

```css
.osLayerRoot .osLayerBar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(12px);
}
.osLayerRoot .osLayerBarLogoDot { display: none; }
.osLayerRoot .osLayerBarNav {
  display: flex;
  gap: 32px;
  font-size: 14px;
}
.osLayerRoot .osLayerContent {
  padding: 40px 64px;
  width: 100%;
  max-width: 100%;
}
@media (max-width: 768px) {
  .osLayerRoot .osLayerBar {
    padding: 0 20px;
    padding-top: env(safe-area-inset-top);
    padding-bottom: 12px;
    flex-wrap: nowrap;
    min-height: 52px;
    height: calc(52px + env(safe-area-inset-top));
    align-items: flex-end;
    background: rgba(10, 12, 18, 0.97);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .osLayerRoot .osLayerBarTitle {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(238, 240, 244, 0.9);
    flex: 1;
    margin: 0;
    display: flex;
    align-items: center;
  }
  .osLayerRoot .osLayerBarLogoDot {
    display: block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #00c9a0;
    box-shadow: 0 0 8px rgba(0, 201, 160, 0.6);
    margin-right: 8px;
    flex-shrink: 0;
  }
  .osLayerRoot .desktop-nav-tabs { display: none !important; }
  .osLayerRoot .osLayerBarNav { gap: 16px; font-size: 13px; }
  .osLayerRoot .osLayerContent {
    padding: 20px 16px;
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
  }
  .osLayerRoot .osLayerFloatingOrb {
    bottom: calc(16px + env(safe-area-inset-bottom) + 60px) !important;
    right: 16px !important;
    width: 52px !important;
    height: 52px !important;
    font-size: 16px !important;
  }
}
@media (max-width: 768px) {
  .osLayerRoot .osLayerBarAvatar { display: flex !important; }
}
```

---

## Summary for external AI

- **Page:** Profile = `RequireAuth` → `OSLayer` → `AthleteHomeDashboard`.
- **Layout:** Top bar (logo + nav or mobile teal dot + logo + avatar), main content (`.osLayerContent`), bottom tab bar on mobile, floating AI orb.
- **Content:** "Today" heading, readiness card, today’s session card, "Start Workout" CTA, Coach + Log readiness links.
- **Design tokens:** `globals.css` (CSS variables, `.mobile-polish`, `.polish-card`, `.info-card`, mobile typography in `.container`). Tailwind default palette; no custom theme.
- **Profile-specific classes:** `mobile-polish`, `polish-card`, Tailwind utility classes as listed in section 6. For an Apple/iOS-style redesign, consider reworking these and the OSLayer/MobileTabBar styles for a more premium, native-feel layout and typography.
