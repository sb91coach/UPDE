"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/lib/requireAuth";
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
    <RequireAuth>
    <div className="outer">
      <nav className="topNav">
        <div className="logo">Performance Pathfinder</div>
        <div className="tabs">
          <Link href="/profile" className="tab">Dashboard</Link>
          <Link href="/programme" className="tab">Programme</Link>
          <Link href="/tactical" className="tab">Tactical</Link>
          <Link href="/nutrition" className="tab">Nutrition</Link>
          <span className="tab active">Benchmarks</span>
        </div>
      </nav>

      <div className="mobile-polish">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Benchmarks</p>
            <h1 className="text-xl font-semibold text-gray-900">Your numbers</h1>
            <p className="text-sm text-gray-500 mt-2">
              Add 1RMs (kg) for strength so the programme can prescribe loads. Add CV and power metrics if you track them.
            </p>
          </div>

          {BENCHMARK_SECTIONS.map((section) => {
            const isOpen = openSection === section.id;
            return (
              <div key={section.id} className="polish-card rounded-2xl overflow-visible">
                <button
                  type="button"
                  className="w-full flex justify-between items-center p-4 text-left text-gray-900 font-semibold rounded-2xl hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  aria-expanded={isOpen}
                >
                  <span>{section.title}</span>
                  <span className="text-gray-500 text-lg">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 px-4 pb-4 border-t border-gray-100 pt-3">
                    {getVisibleExercises(section.id).map((ex) => (
                      <label key={ex.key} className="flex items-center gap-4 text-sm">
                        <span className="flex-1 text-gray-700">{ex.label}</span>
                        <input
                          type="number"
                          min={0}
                          step={ex.unit === "sec" || ex.key.includes("time") ? 1 : 2.5}
                          placeholder="—"
                          value={values[ex.key] ?? ""}
                          onChange={(e) => handleChange(ex.key, e.target.value)}
                          className="h-10 w-24 rounded-lg border border-gray-200 text-center text-gray-900 bg-white"
                        />
                        <span className="text-xs text-gray-500 w-9">{ex.unit || "kg"}</span>
                      </label>
                    ))}
                    <div className="pt-2 relative">
                      <span className="block text-xs text-gray-500 mb-2">Add another exercise</span>
                      <input
                        type="text"
                        placeholder={ADD_EXERCISE_PLACEHOLDER}
                        value={addQuery[section.id] ?? ""}
                        onChange={(e) => setAddQuery((q) => ({ ...q, [section.id]: e.target.value }))}
                        onFocus={() => { setAddFocused((o) => ({ ...o, [section.id]: true })); setAddOpen((o) => ({ ...o, [section.id]: true })); }}
                        onBlur={() => setTimeout(() => { setAddFocused((o) => ({ ...o, [section.id]: false })); setAddOpen((o) => ({ ...o, [section.id]: false })); }, 150)}
                        className="h-10 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-900 px-3 text-sm"
                      />
                      {(addOpen[section.id] || addFocused[section.id]) && (
                        <ul className="absolute top-full left-0 right-0 mt-1 py-2 max-h-[280px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-10 list-none" role="listbox">
                          {getAddableOptions(section.id).length > 0 ? (
                            getAddableOptions(section.id).map((opt) => (
                              <li
                                key={opt.key}
                                role="option"
                                className="px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                                onMouseDown={(e) => { e.preventDefault(); addExercise(section.id, opt.key); }}
                              >
                                {opt.label}
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-3 text-sm text-gray-500" role="option" aria-disabled>
                              {addQuery[section.id]?.trim() ? "No matching exercises" : "Type to search…"}
                            </li>
                          )}
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
            className="h-12 w-full rounded-xl font-medium bg-blue-600 text-white disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save benchmarks"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .outer {
          background: #f9fafb;
          min-height: 100vh;
        }
        .topNav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
        }
        .logo {
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #111827;
        }
        .tabs { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
        .tab {
          font-size: 14px;
          color: #6b7280;
          text-decoration: none;
        }
        .tab.active { color: #111827; font-weight: 600; }
        .tab:hover:not(.active) { color: #374151; }
      `}</style>
    </div>
    </RequireAuth>
  );
}
