"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import {
  loadReadinessEntries,
  saveReadinessEntries,
  getStoredIdList,
  type ReadinessEntry,
} from "@/lib/tacticalReadinessStorage";

const DEFAULT_ID_LIST = ["ID 1", "ID 2", "ID 3", "ID 4", "ID 5"];

const defaultForm: Omit<ReadinessEntry, "id" | "date"> = {
  sleep_hours: 7,
  sleep_quality: 3,
  fatigue_level: 2,
  stress_level: 2,
  knee_pain: 0,
  back_pain: 0,
  shin_pain: 0,
  shoulder_pain: 0,
  hip_pain: 0,
  ankle_pain: 0,
  elbow_pain: 0,
  neck_pain: 0,
  muscle_tightness: 0,
  joint_stiffness: 0,
  tendon_irritation: 0,
  movement_restriction: 0,
  strength_index: 70,
  explosive_power: 70,
  neuromuscular_readiness: 70,
  aerobic_capacity: 70,
  movement_durability: 70,
  coordination_quality: 70,
  neuromuscular_fatigue: 2,
  central_fatigue: 2,
  training_load: 5,
  operational_hours: 8,
  high_intensity_exposure: false,
  external_workload: "moderate",
};

function NavTab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

export default function TacticalInputPage() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<ReadinessEntry[]>([]);
  const [idList, setIdList] = useState<string[]>(DEFAULT_ID_LIST);
  const [selectedId, setSelectedId] = useState<string>("ID 1");
  const [form, setForm] = useState(defaultForm);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newIdInput, setNewIdInput] = useState("");

  useEffect(() => {
    const loaded = loadReadinessEntries();
    setEntries(loaded);
    const fromStorage = getStoredIdList(loaded);
    if (fromStorage.length > 0) {
      setIdList((prev) => {
        const combined = new Set([...DEFAULT_ID_LIST, ...fromStorage]);
        return Array.from(combined).sort((a, b) => {
          const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
          return na - nb;
        });
      });
      if (!selectedId || !fromStorage.includes(selectedId)) setSelectedId(fromStorage[0]);
    }
  }, []);

  function addNewId() {
    const num = parseInt(newIdInput.trim(), 10);
    if (Number.isNaN(num) || num < 1) return;
    const label = `ID ${num}`;
    if (!idList.includes(label)) {
      setIdList((prev) => [...prev, label].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return na - nb;
      }));
      setSelectedId(label);
    }
    setNewIdInput("");
    setModalOpen(false);
  }

  function update<K extends keyof Omit<ReadinessEntry, "id" | "date">>(key: K, value: ReadinessEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const date = new Date().toISOString().slice(0, 10);
    const entry: ReadinessEntry = { id: selectedId, date, ...form };
    const next = [entry, ...entries];
    setEntries(next);
    saveReadinessEntries(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <RequireAuth>
      <OSLayer>
        <div className="tacticalOuter">
          <nav className="tacticalNav">
            <div className="tacticalBrand">PERFORMANCE PATHFINDER OS</div>
            <div className="tacticalTabs">
              <NavTab href="/profile" label="Dashboard" pathname={pathname} />
              <NavTab href="/programme" label="Programme" pathname={pathname} />
              <NavTab href="/tactical" label="Tactical" pathname={pathname} />
              <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
              <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
              <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
              <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
              <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
              <NavTab href="/strategy" label="Strategy" pathname={pathname} />
              <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
              <NavTab href="/settings" label="Settings" pathname={pathname} />
            </div>
          </nav>

          <div className="tacticalContainer mobile-polish">
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Tactical</p>
              <h1 className="text-xl font-semibold text-gray-900">Daily Readiness Input</h1>
              <p className="text-sm text-gray-500">Log recovery, structural, capacity and exposure. All data is stored per ID.</p>
              <Link href="/tactical" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to Tactical Dashboard</Link>
            </div>

            {/* SECTION 1 — ID MANAGEMENT */}
            <section className="polish-card rounded-2xl p-5 space-y-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">ID Management</h2>
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-sm text-gray-500">Select ID</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="h-10 rounded-lg border border-gray-200 bg-white text-gray-900 px-3 min-w-[140px]"
                  >
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium" onClick={() => setModalOpen(true)}>
                  Add New ID
                </button>
              </div>
            </section>

            {/* SECTION 2 — RECOVERY INPUTS */}
            <section className="polish-card rounded-2xl p-5 space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recovery Inputs</h2>
              <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">sleep_hours</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.sleep_hours}
                    onChange={(e) => update("sleep_hours", parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-center max-w-[120px]"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">sleep_quality (1–5)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={5} value={form.sleep_quality}
                      onChange={(e) => update("sleep_quality", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.sleep_quality}</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">fatigue_level (1–5)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={5} value={form.fatigue_level}
                      onChange={(e) => update("fatigue_level", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.fatigue_level}</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">stress_level (1–5)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={5} value={form.stress_level}
                      onChange={(e) => update("stress_level", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.stress_level}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 3 — STRUCTURAL INTEGRITY */}
            <section className="polish-card rounded-2xl p-5 space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Structural Integrity Inputs</h2>
              <p className="text-sm text-gray-500">Pain scale 0–10</p>
              <div className="grid grid-cols-1 gap-4">
                {(["knee_pain", "back_pain", "shin_pain", "shoulder_pain", "hip_pain", "ankle_pain", "elbow_pain", "neck_pain"] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-2">
                    <span className="text-sm text-gray-500">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                      <span className="text-sm font-semibold text-gray-700 w-8">{form[key]}</span>
                    </div>
                  </label>
                ))}
                {(["muscle_tightness", "joint_stiffness", "tendon_irritation", "movement_restriction"] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-2">
                    <span className="text-sm text-gray-500">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                      <span className="text-sm font-semibold text-gray-700 w-8">{form[key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* SECTION 4 — PERFORMANCE CAPACITY */}
            <section className="polish-card rounded-2xl p-5 space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Performance Capacity Inputs</h2>
              <p className="text-sm text-gray-500">Elite performance markers 0–100</p>
              <div className="grid grid-cols-1 gap-4">
                {(["strength_index", "explosive_power", "neuromuscular_readiness", "aerobic_capacity", "movement_durability", "coordination_quality"] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-2">
                    <span className="text-sm text-gray-500">{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={100} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                      <span className="text-sm font-semibold text-gray-700 w-10">{form[key]}</span>
                    </div>
                  </label>
                ))}
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">neuromuscular_fatigue (0–10)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={10} value={form.neuromuscular_fatigue}
                      onChange={(e) => update("neuromuscular_fatigue", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.neuromuscular_fatigue}</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">central_fatigue (0–10)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={10} value={form.central_fatigue}
                      onChange={(e) => update("central_fatigue", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.central_fatigue}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 5 — EXPOSURE */}
            <section className="polish-card rounded-2xl p-5 space-y-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Exposure Inputs</h2>
              <div className="grid grid-cols-1 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">training_load (1–10)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={form.training_load}
                      onChange={(e) => update("training_load", parseInt(e.target.value, 10))} className="rangeSlider flex-1 max-w-[200px]" />
                    <span className="text-sm font-semibold text-gray-700 w-8">{form.training_load}</span>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">operational_hours</span>
                  <input type="number" min={0} max={24} value={form.operational_hours}
                    onChange={(e) => update("operational_hours", parseInt(e.target.value, 10) || 0)} className="h-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-center max-w-[120px]" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">high_intensity_exposure</span>
                  <button type="button" role="switch" aria-checked={form.high_intensity_exposure}
                    className={`h-10 px-4 rounded-lg border font-medium w-fit min-w-[44px] ${form.high_intensity_exposure ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}
                    onClick={() => update("high_intensity_exposure", !form.high_intensity_exposure)}>
                    {form.high_intensity_exposure ? "Yes" : "No"}
                  </button>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">external_workload</span>
                  <select value={form.external_workload} onChange={(e) => update("external_workload", e.target.value as "light" | "moderate" | "heavy")} className="h-10 rounded-lg border border-gray-200 bg-white text-gray-900 px-3 min-w-[140px]">
                    <option value="light">light</option>
                    <option value="moderate">moderate</option>
                    <option value="heavy">heavy</option>
                  </select>
                </label>
              </div>
            </section>

            {/* SECTION 6 – SAVE */}
            <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                className="h-12 w-full rounded-xl font-medium bg-blue-600 text-white disabled:opacity-70"
                onClick={handleSave}
                disabled={saved}
              >
                {saved ? "Saved" : "Save Readiness Entry"}
              </button>
              {entries.length > 0 && <span className="text-sm text-gray-500">{entries.length} entries in log</span>}
            </section>
          </div>

          {/* Add New ID Modal */}
          {modalOpen && (
            <div className="modalOverlay" onClick={() => setModalOpen(false)}>
              <div className="modalGlass" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New ID</h3>
                <label className="text-sm text-gray-500 block mb-1">ID Number</label>
                <p className="text-sm text-gray-500 mb-2">e.g. 11 → creates ID 11</p>
                <input type="number" min={1} value={newIdInput} onChange={(e) => setNewIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewId()} className="h-10 w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-3 mb-4" placeholder="11" />
                <div className="flex gap-3 mt-4">
                  <button type="button" className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium flex-1" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="button" className="h-10 px-4 rounded-lg bg-blue-600 text-white font-medium flex-1" onClick={addNewId}>Add ID</button>
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            .tacticalOuter {
              min-height: 100vh;
              background: #f9fafb;
              position: relative;
              overflow-x: hidden;
            }
            .tacticalNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 20px;
              border-bottom: 1px solid #e5e7eb;
              background: #fff;
              position: relative;
              z-index: 2;
            }
            .tacticalBrand { font-size: 12px; letter-spacing: 0.05em; color: #374151; }
            .tacticalTabs { display: flex; gap: 16px; flex-wrap: wrap; }
            .tacticalContainer { position: relative; z-index: 1; }
            .modalOverlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.5);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
              animation: fadeIn 0.2s ease;
            }
            .modalGlass {
              padding: 1.5rem;
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 1rem;
              box-shadow: 0 10px 40px rgba(0,0,0,0.12);
              min-width: 280px;
              max-width: 90vw;
              animation: scaleIn 0.25s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @media (max-width: 768px) {
              .tacticalNav { padding: 12px 16px; }
              .tacticalTabs { gap: 12px; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
