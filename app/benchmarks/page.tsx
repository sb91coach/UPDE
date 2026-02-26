"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { PerformanceBenchmarks, ExerciseBenchmark } from "@/lib/profile/benchmarkSchema";
import { BENCHMARK_SECTIONS } from "@/lib/profile/benchmarkSchema";
import { OPTIONS_BY_SECTION, type BenchmarkOption } from "@/lib/profile/benchmarkExerciseOptions";

type Profile = {
  id: string;
  performance_benchmarks?: PerformanceBenchmarks | null;
};

const ADD_EXERCISE_PLACEHOLDER = "Search or add an exercise…";
const FILTER_LIMIT = 60;

export default function BenchmarksPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [openSection, setOpenSection] = useState<string | null>("strength");
  const [addQuery, setAddQuery] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState<Record<string, boolean>>({});
  const [addFocused, setAddFocused] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, performance_benchmarks")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(data ?? null);
      const bench = data?.performance_benchmarks?.exerciseBenchmarks ?? {};
      const next: Record<string, string> = {};
      Object.entries(bench).forEach(([key, b]) => {
        const v = (b as ExerciseBenchmark)?.oneRM ?? (b as ExerciseBenchmark)?.estimatedOneRM;
        if (v != null && typeof v === "number" && v > 0) next[key] = String(v);
      });
      setValues(next);
    }
    load();
  }, [router]);

  function handleChange(key: string, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw.trim() }));
  }

  function getVisibleExercises(sectionId: string) {
    const section = BENCHMARK_SECTIONS.find((s) => s.id === sectionId);
    const fullList = OPTIONS_BY_SECTION[sectionId] ?? [];
    if (!section) return [];
    const defaultKeys = new Set(section.exercises.map((e) => e.key));
    const fromValues = Object.keys(values).filter(
      (key) => fullList.some((o) => o.key === key)
    );
    const extraKeys = fromValues.filter((k) => !defaultKeys.has(k));
    const defaultOpts = section.exercises.map((e) => ({ key: e.key, label: e.label, unit: e.unit }));
    const extraOpts = extraKeys.map((key) => {
      const o = fullList.find((x) => x.key === key);
      return o ? { key: o.key, label: o.label, unit: o.unit } : null;
    }).filter(Boolean) as BenchmarkOption[];
    return [...defaultOpts, ...extraOpts];
  }

  function getAddableOptions(sectionId: string): BenchmarkOption[] {
    const visibleKeys = new Set(getVisibleExercises(sectionId).map((e) => e.key));
    const fullList = OPTIONS_BY_SECTION[sectionId] ?? [];
    const q = (addQuery[sectionId] ?? "").toLowerCase().trim();
    return fullList
      .filter((o) => !visibleKeys.has(o.key))
      .filter((o) => !q || o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q))
      .slice(0, FILTER_LIMIT);
  }

  function addExercise(sectionId: string, key: string) {
    setValues((prev) => ({ ...prev, [key]: "" }));
    setAddQuery((prev) => ({ ...prev, [sectionId]: "" }));
    setAddOpen((prev) => ({ ...prev, [sectionId]: false }));
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const exerciseBenchmarks: Record<string, ExerciseBenchmark> = {};
    const now = new Date().toISOString().slice(0, 10);
    Object.entries(values).forEach(([key, v]) => {
      const num = v ? parseFloat(v) : null;
      if (num != null && !Number.isNaN(num) && num > 0) {
        exerciseBenchmarks[key] = {
          oneRM: num,
          estimatedOneRM: null,
          lastUpdated: now,
        };
      }
    });
    const next: PerformanceBenchmarks = {
      ...(profile.performance_benchmarks ?? {}),
      exerciseBenchmarks,
    };
    await supabase
      .from("profiles")
      .update({ performance_benchmarks: next })
      .eq("id", profile.id);
    setProfile((p) => (p ? { ...p, performance_benchmarks: next } : null));
    setSaving(false);
  }

  if (!profile) return null;

  return (
    <div className="outer">
      <nav className="topNav">
        <div className="logo">Performance Pathfinder</div>
        <div className="tabs">
          <Link href="/profile" className="tab">Dashboard</Link>
          <Link href="/programme" className="tab">Programme</Link>
          <Link href="/checkin" className="tab">Check-In</Link>
          <span className="tab active">Benchmarks</span>
        </div>
      </nav>

      <div className="container">
        <div className="header">
          <div className="phase">BENCHMARKS</div>
          <h1 className="headline">Your numbers</h1>
          <p className="sub">
            Add 1RMs (kg) for strength so the programme can prescribe loads. Add CV and power metrics if you track them.
          </p>
        </div>

        {BENCHMARK_SECTIONS.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <div key={section.id} className="benchSection">
              <button
                type="button"
                className="benchSectionHead"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                aria-expanded={isOpen}
              >
                <span>{section.title}</span>
                <span className="benchSectionToggle">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="benchGrid">
                  {getVisibleExercises(section.id).map((ex) => (
                    <label key={ex.key} className="benchRow">
                      <span className="benchLabel">{ex.label}</span>
                      <input
                        type="number"
                        min={0}
                        step={ex.unit === "sec" || ex.key.includes("time") ? 1 : 2.5}
                        placeholder="—"
                        value={values[ex.key] ?? ""}
                        onChange={(e) => handleChange(ex.key, e.target.value)}
                        className="benchInput"
                      />
                      <span className="benchUnit">{ex.unit || "kg"}</span>
                    </label>
                  ))}
                  <div className="addExerciseWrap">
                    <input
                      type="text"
                      className="addExerciseInput"
                      placeholder={ADD_EXERCISE_PLACEHOLDER}
                      value={addQuery[section.id] ?? ""}
                      onChange={(e) => setAddQuery((q) => ({ ...q, [section.id]: e.target.value }))}
                      onFocus={() => { setAddFocused((o) => ({ ...o, [section.id]: true })); setAddOpen((o) => ({ ...o, [section.id]: true })); }}
                      onBlur={() => setTimeout(() => { setAddFocused((o) => ({ ...o, [section.id]: false })); setAddOpen((o) => ({ ...o, [section.id]: false })); }, 150)}
                    />
                    {(addOpen[section.id] || addFocused[section.id]) && getAddableOptions(section.id).length > 0 && (
                      <ul className="addExerciseList" role="listbox">
                        {getAddableOptions(section.id).map((opt) => (
                          <li
                            key={opt.key}
                            role="option"
                            className="addExerciseItem"
                            onMouseDown={(e) => { e.preventDefault(); addExercise(section.id, opt.key); }}
                          >
                            {opt.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="saveBtn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save benchmarks"}
        </button>
      </div>

      <style jsx>{`
        .outer {
          background:
            radial-gradient(circle at 20% 10%, rgba(47,128,237,0.15), transparent 40%),
            radial-gradient(circle at 80% 90%, rgba(39,224,166,0.12), transparent 40%),
            #0A1220;
          min-height: 100vh;
          color: white;
        }
        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .logo {
          font-weight: 600;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        .tabs { display: flex; gap: 24px; align-items: center; }
        .tab {
          font-size: 14px;
          color: white;
          text-decoration: none;
          opacity: 0.6;
        }
        .tab.active { opacity: 1; font-weight: 600; }
        .tab:hover:not(.active) { opacity: 0.85; }
        .container {
          max-width: 720px;
          margin: 60px auto;
          padding: 0 40px;
        }
        .header { margin-bottom: 32px; }
        .phase {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .headline {
          font-size: 28px;
          margin: 8px 0 12px;
        }
        .sub {
          font-size: 14px;
          opacity: 0.75;
          line-height: 1.5;
          margin: 0;
        }
        .benchSection {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .benchSectionHead {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: none;
          border: none;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
        }
        .benchSectionHead:hover {
          background: rgba(255,255,255,0.04);
        }
        .benchSectionToggle {
          font-size: 18px;
          opacity: 0.7;
        }
        .benchGrid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 0 24px 24px;
        }
        .benchRow {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14px;
        }
        .benchLabel {
          flex: 1;
          opacity: 0.9;
        }
        .benchInput {
          width: 100px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: white;
          font-size: 15px;
          text-align: right;
        }
        .benchInput::placeholder { opacity: 0.4; }
        .benchUnit {
          width: 36px;
          opacity: 0.6;
          font-size: 12px;
        }
        .addExerciseWrap {
          position: relative;
          margin-top: 8px;
        }
        .addExerciseInput {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px dashed rgba(255,255,255,0.2);
          border-radius: 10px;
          color: white;
          font-size: 14px;
        }
        .addExerciseInput::placeholder { opacity: 0.5; }
        .addExerciseInput:focus {
          outline: none;
          border-color: rgba(47,128,237,0.5);
          background: rgba(255,255,255,0.08);
        }
        .addExerciseList {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin: 4px 0 0;
          padding: 8px 0;
          max-height: 280px;
          overflow-y: auto;
          background: rgba(10,18,32,0.98);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          list-style: none;
          z-index: 10;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .addExerciseItem {
          padding: 10px 16px;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.9;
        }
        .addExerciseItem:hover {
          background: rgba(47,128,237,0.2);
        }
        .saveBtn {
          margin-top: 24px;
          padding: 14px 24px;
          background: #2F80ED;
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }
        .saveBtn:hover:not(:disabled) { background: #2563eb; }
        .saveBtn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
