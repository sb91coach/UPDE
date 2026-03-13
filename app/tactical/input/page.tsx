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

  const sectionClass = "tacticalInputSection";
  const labelClass = "tacticalLabel";

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

          <div className="tacticalContainer">
            <div className="tacticalHeader">
              <div className="tacticalPhase">TACTICAL</div>
              <h1 className="tacticalHeadline">Daily Readiness Input</h1>
              <p className="tacticalSub">Log recovery, structural, capacity and exposure. All data is stored per ID.</p>
              <Link href="/tactical" className="tacticalBackLink">← Back to Tactical Dashboard</Link>
            </div>

            {/* SECTION 1 — ID MANAGEMENT */}
            <section className={`${sectionClass} idManagementPanel`}>
              <h2 className="tacticalSectionTitle">ID Management</h2>
              <div className="idManagementRow">
                <div className="idSelectWrap">
                  <label className={labelClass}>Select ID</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="idSelect"
                  >
                    {idList.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="addIdBtn" onClick={() => setModalOpen(true)}>
                  Add New ID
                </button>
              </div>
            </section>

            {/* SECTION 2 — RECOVERY INPUTS */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Recovery Inputs</h2>
              <div className="tacticalInputGrid">
                <label className="tacticalField">
                  <span className={labelClass}>sleep_hours</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.sleep_hours}
                    onChange={(e) => update("sleep_hours", parseFloat(e.target.value) || 0)}
                    className="tacticalInput numInput"
                  />
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>sleep_quality (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.sleep_quality}
                      onChange={(e) => update("sleep_quality", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.sleep_quality}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>fatigue_level (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.fatigue_level}
                      onChange={(e) => update("fatigue_level", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.fatigue_level}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>stress_level (1–5)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={5} value={form.stress_level}
                      onChange={(e) => update("stress_level", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.stress_level}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 3 — STRUCTURAL INTEGRITY */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Structural Integrity Inputs</h2>
              <p className="tacticalSectionSub">Pain scale 0–10</p>
              <div className="tacticalInputGrid">
                {(["knee_pain", "back_pain", "shin_pain", "shoulder_pain", "hip_pain", "ankle_pain", "elbow_pain", "neck_pain"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
                {(["muscle_tightness", "joint_stiffness", "tendon_irritation", "movement_restriction"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={10} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* SECTION 4 — PERFORMANCE CAPACITY */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Performance Capacity Inputs</h2>
              <p className="tacticalSectionSub">Elite performance markers 0–100</p>
              <div className="tacticalInputGrid">
                {(["strength_index", "explosive_power", "neuromuscular_readiness", "aerobic_capacity", "movement_durability", "coordination_quality"] as const).map((key) => (
                  <label key={key} className="tacticalField sliderField">
                    <span className={labelClass}>{key.replace(/_/g, " ")}</span>
                    <div className="sliderRow">
                      <input type="range" min={0} max={100} value={form[key]}
                        onChange={(e) => update(key, parseInt(e.target.value, 10))} className="glowSlider" />
                      <span className="liveVal">{form[key]}</span>
                    </div>
                  </label>
                ))}
                <label className="tacticalField sliderField">
                  <span className={labelClass}>neuromuscular_fatigue (0–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={0} max={10} value={form.neuromuscular_fatigue}
                      onChange={(e) => update("neuromuscular_fatigue", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.neuromuscular_fatigue}</span>
                  </div>
                </label>
                <label className="tacticalField sliderField">
                  <span className={labelClass}>central_fatigue (0–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={0} max={10} value={form.central_fatigue}
                      onChange={(e) => update("central_fatigue", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.central_fatigue}</span>
                  </div>
                </label>
              </div>
            </section>

            {/* SECTION 5 — EXPOSURE */}
            <section className={sectionClass}>
              <h2 className="tacticalSectionTitle">Exposure Inputs</h2>
              <div className="tacticalInputGrid">
                <label className="tacticalField sliderField">
                  <span className={labelClass}>training_load (1–10)</span>
                  <div className="sliderRow">
                    <input type="range" min={1} max={10} value={form.training_load}
                      onChange={(e) => update("training_load", parseInt(e.target.value, 10))} className="glowSlider" />
                    <span className="liveVal">{form.training_load}</span>
                  </div>
                </label>
                <label className="tacticalField">
                  <span className={labelClass}>operational_hours</span>
                  <input type="number" min={0} max={24} value={form.operational_hours}
                    onChange={(e) => update("operational_hours", parseInt(e.target.value, 10) || 0)} className="tacticalInput numInput" />
                </label>
                <label className="tacticalField toggleField">
                  <span className={labelClass}>high_intensity_exposure</span>
                  <button type="button" role="switch" aria-checked={form.high_intensity_exposure}
                    className={`tacticalToggle ${form.high_intensity_exposure ? "on" : ""}`}
                    onClick={() => update("high_intensity_exposure", !form.high_intensity_exposure)}>
                    {form.high_intensity_exposure ? "Yes" : "No"}
                  </button>
                </label>
                <label className="tacticalField">
                  <span className={labelClass}>external_workload</span>
                  <select value={form.external_workload} onChange={(e) => update("external_workload", e.target.value as "light" | "moderate" | "heavy")} className="idSelect workloadSelect">
                    <option value="light">light</option>
                    <option value="moderate">moderate</option>
                    <option value="heavy">heavy</option>
                  </select>
                </label>
              </div>
            </section>

            {/* SECTION 6 – SAVE */}
            <section className={`${sectionClass} saveSection`}>
              <button
                type="button"
                className="saveEntryBtn"
                onClick={handleSave}
                disabled={saved}
              >
                {saved ? "Saved" : "Save Readiness Entry"}
              </button>
              {entries.length > 0 && <span className="entryCount">{entries.length} entries in log</span>}
            </section>
          </div>

          {/* Add New ID Modal */}
          {modalOpen && (
            <div className="modalOverlay" onClick={() => setModalOpen(false)}>
              <div className="modalGlass" onClick={(e) => e.stopPropagation()}>
                <h3 className="modalTitle">Add New ID</h3>
                <label className={labelClass}>ID Number</label>
                <p className="modalHint">e.g. 11 → creates ID 11</p>
                <input type="number" min={1} value={newIdInput} onChange={(e) => setNewIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewId()} className="tacticalInput modalInput" placeholder="11" />
                <div className="modalActions">
                  <button type="button" className="modalBtn secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="button" className="modalBtn primary" onClick={addNewId}>Add ID</button>
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            .tacticalOuter {
              min-height: 100vh;
              background: #08090c;
              background-image:
                radial-gradient(ellipse 80% 50% at 20% 20%, rgba(47,128,237,0.14), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(39,224,166,0.08), transparent),
                linear-gradient(180deg, #08090c 0%, #0c0e12 50%, #08090c 100%);
              color: #fff;
              position: relative;
              overflow-x: hidden;
            }
            .tacticalOuter::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
              background-size: 40px 40px;
              opacity: 0.35;
              pointer-events: none;
            }
            .tacticalNav {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 40px;
              border-bottom: 1px solid rgba(255,255,255,0.06);
              position: relative;
              z-index: 2;
            }
            .tacticalBrand { font-size: 12px; letter-spacing: 2px; opacity: 0.7; }
            .tacticalTabs { display: flex; gap: 20px; flex-wrap: wrap; }
            .tacticalContainer { max-width: 820px; margin: 0 auto; padding: 40px; position: relative; z-index: 1; }
            .tacticalHeader { margin-bottom: 36px; }
            .tacticalPhase { font-size: 11px; letter-spacing: 0.12em; opacity: 0.6; margin-bottom: 8px; }
            .tacticalHeadline { font-size: 26px; font-weight: 600; margin: 0 0 10px; }
            .tacticalSub { font-size: 14px; opacity: 0.8; margin: 0 0 14px; line-height: 1.5; }
            .tacticalBackLink { font-size: 13px; color: rgba(47,128,237,0.95); text-decoration: none; }
            .tacticalBackLink:hover { text-decoration: underline; }
            .tacticalInputSection {
              margin-bottom: 32px;
              padding: 24px;
              background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 14px;
              box-shadow: 0 0 30px rgba(47,128,237,0.06);
              backdrop-filter: blur(8px);
            }
            .idManagementPanel { border-color: rgba(39,224,166,0.2); box-shadow: 0 0 24px rgba(39,224,166,0.08); }
            .tacticalSectionTitle { font-size: 15px; font-weight: 600; margin: 0 0 6px; letter-spacing: 0.03em; }
            .tacticalSectionSub { font-size: 12px; opacity: 0.7; margin: 0 0 16px; }
            .idManagementRow { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
            .idSelectWrap { display: flex; flex-direction: column; gap: 8px; }
            .idSelect, .workloadSelect {
              padding: 12px 16px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(47,128,237,0.35);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              min-width: 140px;
              box-shadow: 0 0 16px rgba(47,128,237,0.15);
            }
            .idSelect:focus, .workloadSelect:focus { outline: none; border-color: rgba(47,128,237,0.6); box-shadow: 0 0 20px rgba(47,128,237,0.25); }
            .addIdBtn {
              padding: 12px 24px;
              font-size: 14px; font-weight: 600;
              background: linear-gradient(135deg, rgba(39,224,166,0.25), rgba(47,128,237,0.2));
              border: 1px solid rgba(39,224,166,0.5);
              border-radius: 10px;
              color: #fff;
              cursor: pointer;
              transition: box-shadow 0.2s, transform 0.2s;
            }
            .addIdBtn:hover { box-shadow: 0 0 24px rgba(39,224,166,0.35); transform: translateY(-1px); }
            .tacticalInputGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
            .tacticalField { display: flex; flex-direction: column; gap: 8px; }
            .tacticalLabel { font-size: 13px; opacity: 0.92; }
            .tacticalInput.numInput {
              padding: 12px 14px;
              background: rgba(255,255,255,0.06);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 10px;
              color: #fff;
              font-size: 14px;
              max-width: 120px;
            }
            .tacticalInput:focus { outline: none; border-color: rgba(47,128,237,0.5); box-shadow: 0 0 0 2px rgba(47,128,237,0.2); }
            .sliderField .sliderRow { display: flex; align-items: center; gap: 12px; }
            .glowSlider {
              flex: 1;
              max-width: 200px;
              height: 8px;
              -webkit-appearance: none;
              appearance: none;
              background: linear-gradient(90deg, rgba(47,128,237,0.3), rgba(39,224,166,0.3));
              border-radius: 4px;
              box-shadow: 0 0 12px rgba(47,128,237,0.25), inset 0 0 8px rgba(0,0,0,0.2);
            }
            .glowSlider::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 20px; height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #2F80ED, #27E0A6);
              box-shadow: 0 0 16px rgba(47,128,237,0.6), 0 0 8px rgba(39,224,166,0.4);
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .glowSlider::-webkit-slider-thumb:hover { transform: scale(1.1); box-shadow: 0 0 24px rgba(47,128,237,0.8); }
            .glowSlider::-moz-range-thumb {
              width: 20px; height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #2F80ED, #27E0A6);
              box-shadow: 0 0 16px rgba(47,128,237,0.6);
              cursor: pointer;
              border: none;
            }
            .liveVal { font-size: 14px; font-weight: 700; min-width: 28px; color: rgba(39,224,166,0.95); text-shadow: 0 0 12px rgba(39,224,166,0.5); }
            .toggleField { flex-direction: row; align-items: center; flex-wrap: wrap; }
            .tacticalToggle {
              padding: 10px 20px;
              font-size: 13px; font-weight: 500;
              background: rgba(255,255,255,0.08);
              border: 1px solid rgba(255,255,255,0.15);
              border-radius: 10px;
              color: rgba(255,255,255,0.85);
              cursor: pointer;
              transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
            }
            .tacticalToggle:hover { background: rgba(255,255,255,0.1); }
            .tacticalToggle.on {
              background: rgba(47,128,237,0.25);
              border-color: rgba(47,128,237,0.5);
              color: #fff;
              box-shadow: 0 0 20px rgba(47,128,237,0.3);
            }
            .saveSection { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
            .saveEntryBtn {
              padding: 16px 32px;
              font-size: 16px; font-weight: 600;
              background: linear-gradient(135deg, rgba(47,128,237,0.45), rgba(39,224,166,0.25));
              border: 1px solid rgba(47,128,237,0.55);
              border-radius: 12px;
              color: #fff;
              cursor: pointer;
              transition: opacity 0.2s, box-shadow 0.2s, transform 0.2s;
              box-shadow: 0 0 28px rgba(47,128,237,0.25);
            }
            .saveEntryBtn:hover:not(:disabled) { box-shadow: 0 0 36px rgba(47,128,237,0.4); transform: translateY(-1px); }
            .saveEntryBtn:disabled { opacity: 0.85; cursor: default; }
            .entryCount { font-size: 13px; opacity: 0.75; }
            .modalOverlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.7);
              backdrop-filter: blur(6px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
              animation: fadeIn 0.2s ease;
            }
            .modalGlass {
              padding: 28px;
              background: rgba(12,14,18,0.95);
              border: 1px solid rgba(47,128,237,0.3);
              border-radius: 16px;
              box-shadow: 0 0 40px rgba(47,128,237,0.2), inset 0 0 20px rgba(255,255,255,0.02);
              min-width: 280px;
              animation: scaleIn 0.25s ease;
            }
            .modalTitle { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
            .modalHint { font-size: 12px; opacity: 0.7; margin: 0 0 8px; }
            .modalInput { max-width: 100%; }
            .modalActions { display: flex; gap: 12px; margin-top: 20px; }
            .modalBtn { padding: 10px 20px; font-size: 14px; font-weight: 500; border-radius: 10px; cursor: pointer; transition: opacity 0.2s; }
            .modalBtn.secondary { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #fff; }
            .modalBtn.primary { background: linear-gradient(135deg, rgba(47,128,237,0.5), rgba(39,224,166,0.3)); border: 1px solid rgba(47,128,237,0.5); color: #fff; }
            .modalBtn.primary:hover { opacity: 0.95; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @media (max-width: 768px) {
              .tacticalNav { padding: 16px; }
              .tacticalTabs { gap: 14px; }
              .tacticalContainer { padding: 16px; }
              .tacticalInputGrid { grid-template-columns: 1fr; }
              .idManagementRow { flex-direction: column; align-items: stretch; }
            }
          `}</style>
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
