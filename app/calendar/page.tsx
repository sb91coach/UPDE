"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/lib/requireAuth";
import OSLayer from "@/app/components/OSLayer";
import { supabase } from "@/lib/supabaseClient";

type ProfileCalendar = {
  current_week?: number | null;
  days_per_week?: number | null;
  training_days?: unknown;
  plan?: unknown;
  focus?: string | null;
  goal?: string | null;
  minutes_per_session?: number | null;
};

type SessionLogRow = {
  id: string;
  week: number;
  created_at: string;
  session_name: string | null;
};

type DerivedSession = {
  sessionTitle: string;
  duration: string;
  intensity: string;
  isRecovery: boolean;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function deriveSessionForDate(date: Date, profile: ProfileCalendar | null): DerivedSession {
  if (!profile) {
    return { sessionTitle: "—", duration: "—", intensity: "—", isRecovery: false };
  }
  const daysPerWeek = Math.min(5, Math.max(2, profile.days_per_week ?? 3));
  const sessionMins = Math.min(90, Math.max(30, profile.minutes_per_session ?? 60));
  const focus = (profile.focus ?? profile.goal ?? "").toLowerCase();
  const isPower = focus.includes("power") || focus.includes("neural");

  const dayOfWeek = date.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const sessionIndex = Math.min(dayIndex, daysPerWeek - 1);
  const isRecoveryDay = sessionIndex === Math.floor(daysPerWeek / 2);

  if (isRecoveryDay) {
    return {
      sessionTitle: "Regeneration",
      duration: "20–30 min",
      intensity: "Low",
      isRecovery: true,
    };
  }

  const title = isPower ? "Lower Body · RFD / Power" : "Lower Body Strength · Neural Bias";
  const mins = `${sessionMins - 10}–${sessionMins}`;
  return {
    sessionTitle: title,
    duration: `${mins} min`,
    intensity: "Moderate–High",
    isRecovery: false,
  };
}

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 20,
  padding: 20,
};

export default function CalendarPage() {
  const [profile, setProfile] = useState<ProfileCalendar | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [focusedWeek, setFocusedWeek] = useState<number>(1);

  const currentWeek = profile?.current_week ?? 1;

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("current_week, days_per_week, training_days, plan, focus, goal, minutes_per_session")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(profileData ?? null);

    const { data: logs } = await supabase
      .from("session_logs")
      .select("id, week, created_at, session_name")
      .eq("profile_id", session.user.id)
      .order("created_at", { ascending: true });
    setSessionLogs((logs ?? []) as SessionLogRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = new Date();
  const todayKey = dateKey(today);

  const week1Monday = (() => {
    const m = getMonday(today);
    m.setDate(m.getDate() - (currentWeek - 1) * 7);
    return m;
  })();

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const startPad = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = startPad + lastOfMonth.getDate();
  const numRows = Math.ceil(totalCells / 7);

  const grid: (Date | null)[][] = [];
  let day = 1;
  for (let r = 0; r < numRows; r++) {
    const row: (Date | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startPad || day > lastOfMonth.getDate()) {
        row.push(null);
      } else {
        row.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
        day++;
      }
    }
    grid.push(row);
  }

  const logsByDate = new Map<string, SessionLogRow[]>();
  sessionLogs.forEach((log) => {
    const key = log.created_at.slice(0, 10);
    const list = logsByDate.get(key) ?? [];
    list.push(log);
    logsByDate.set(key, list);
  });

  const goPrevMonth = () => {
    setViewMonth((m) => {
      const next = new Date(m);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const goNextMonth = () => {
    setViewMonth((m) => {
      const next = new Date(m);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const scrollToWeek = (weekNum: number) => {
    setFocusedWeek(weekNum);
    const weekMonday = new Date(week1Monday);
    weekMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
    setViewMonth(new Date(weekMonday.getFullYear(), weekMonday.getMonth(), 1));
  };

  if (loading) {
    return (
      <RequireAuth>
        <OSLayer>
          <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(238,240,244,0.55)", fontSize: 14 }}>
            Loading…
          </div>
        </OSLayer>
      </RequireAuth>
    );
  }

  const monthTitle = viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <RequireAuth>
      <OSLayer>
        <div className="calendar-page">
          <style>{`
            .calendar-page {
              max-width: 860px;
              margin: 0 auto;
              padding: 0 16px 24px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .calendar-card {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 20px;
              padding: 20px;
            }
            .calendar-month-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 16px;
            }
            .calendar-month-title {
              font-size: 22px;
              font-weight: 700;
              color: rgba(238,240,244,0.95);
            }
            .calendar-month-nav {
              display: flex;
              gap: 8px;
            }
            .calendar-month-btn {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(238,240,244,0.85);
              font-size: 18px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .calendar-week-strip {
              display: flex;
              gap: 8px;
              overflow-x: auto;
              padding: 8px 0 16px;
              -webkit-overflow-scrolling: touch;
            }
            .calendar-week-strip::-webkit-scrollbar {
              height: 4px;
            }
            .calendar-week-pill {
              flex-shrink: 0;
              padding: 8px 16px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.08);
              color: rgba(238,240,244,0.6);
              cursor: pointer;
            }
            .calendar-week-pill.active {
              border-color: #00c9a0;
              color: #00c9a0;
            }
            .calendar-grid-wrap {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            .calendar-day-headers {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 4px;
              margin-bottom: 8px;
            }
            .calendar-day-header {
              font-size: 10px;
              font-weight: 600;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: rgba(238,240,244,0.35);
              text-align: center;
            }
            .calendar-week-row {
              display: grid;
              grid-template-columns: repeat(7, 1fr);
              gap: 4px;
              margin-bottom: 4px;
            }
            .calendar-day-cell {
              height: 44px;
              border-radius: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              border: 1px solid transparent;
              transition: background 0.2s, border-color 0.2s;
            }
            .calendar-day-cell.today {
              background: rgba(0,201,160,0.15);
              border-color: #00c9a0;
            }
            .calendar-day-cell.selected {
              background: rgba(10,132,255,0.2);
              border-color: #0A84FF;
            }
            .calendar-day-cell .day-num {
              font-size: 14px;
              font-weight: 600;
            }
            .calendar-day-cell.today .day-num { color: #00c9a0; }
            .calendar-day-cell.past .day-num { color: rgba(238,240,244,0.3); }
            .calendar-day-cell.future .day-num { color: rgba(238,240,244,0.55); }
            .calendar-day-cell .day-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #00c9a0;
              margin-top: 2px;
            }
            .calendar-day-detail {
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 20px;
              padding: 20px;
            }
            .calendar-day-detail-title {
              font-size: 16px;
              font-weight: 600;
              color: rgba(238,240,244,0.95);
              margin-bottom: 8px;
            }
            .calendar-day-detail-meta {
              font-size: 12px;
              color: rgba(238,240,244,0.5);
              margin-bottom: 10px;
            }
            .calendar-day-detail-pills {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .calendar-pill {
              font-size: 12px;
              padding: 4px 10px;
              border-radius: 8px;
              background: rgba(255,255,255,0.06);
              color: rgba(238,240,244,0.7);
            }
            .calendar-pill.completed {
              background: rgba(0,201,160,0.2);
              color: #00c9a0;
            }
          `}</style>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(238,240,244,0.95)", margin: "0 0 8px" }}>
            Calendar
          </h1>

          <div className="calendar-card">
            <div className="calendar-month-header">
              <button type="button" className="calendar-month-btn" onClick={goPrevMonth} aria-label="Previous month">
                ‹
              </button>
              <span className="calendar-month-title">{monthTitle}</span>
              <button type="button" className="calendar-month-btn" onClick={goNextMonth} aria-label="Next month">
                ›
              </button>
            </div>

            <div className="calendar-week-strip">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((weekNum) => (
                <button
                  key={weekNum}
                  type="button"
                  className={`calendar-week-pill ${weekNum === currentWeek ? "active" : ""}`}
                  onClick={() => scrollToWeek(weekNum)}
                >
                  Week {weekNum}
                </button>
              ))}
            </div>

            <div className="calendar-grid-wrap">
              <div className="calendar-day-headers">
                {DAY_LABELS.map((label) => (
                  <div key={label} className="calendar-day-header">
                    {label}
                  </div>
                ))}
              </div>
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="calendar-week-row">
                  {row.map((date, colIdx) => {
                    if (!date) {
                      return <div key={`e-${rowIdx}-${colIdx}`} className="calendar-day-cell" style={{ visibility: "hidden" }} />;
                    }
                    const key = dateKey(date);
                    const isToday = key === todayKey;
                    const isPast = date < today && !isToday;
                    const isFuture = date > today;
                    const logs = logsByDate.get(key) ?? [];
                    const hasSession = logs.length > 0;
                    const selected = selectedDate && dateKey(selectedDate) === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`calendar-day-cell ${isToday ? "today" : ""} ${isPast ? "past" : ""} ${isFuture ? "future" : ""} ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <span className="day-num">{date.getDate()}</span>
                        {hasSession && <span className="day-dot" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="calendar-day-detail">
              {(() => {
                const key = dateKey(selectedDate);
                const logs = logsByDate.get(key) ?? [];
                const derived = deriveSessionForDate(selectedDate, profile);
                const dateLabel = selectedDate.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                });

                if (logs.length > 0) {
                  const log = logs[logs.length - 1];
                  return (
                    <>
                      <div className="calendar-day-detail-title">
                        {log.session_name ?? "Session completed"}
                      </div>
                      <div className="calendar-day-detail-meta">{dateLabel}</div>
                      <div className="calendar-day-detail-pills">
                        <span className="calendar-pill completed">Completed</span>
                      </div>
                    </>
                  );
                }

                if (selectedDate > today) {
                  return (
                    <>
                      <div className="calendar-day-detail-title">{derived.sessionTitle}</div>
                      <div className="calendar-day-detail-meta">{dateLabel}</div>
                      <div className="calendar-day-detail-pills">
                        <span className="calendar-pill">{derived.duration}</span>
                        <span className="calendar-pill">{derived.intensity}</span>
                      </div>
                    </>
                  );
                }

                if (derived.isRecovery) {
                  return (
                    <>
                      <div className="calendar-day-detail-title">Recovery Day</div>
                      <div className="calendar-day-detail-meta">{dateLabel}</div>
                      <p style={{ fontSize: 12, color: "rgba(238,240,244,0.4)", margin: 0 }}>Zone 1 · Mobility · Breathing</p>
                    </>
                  );
                }

                if (key === todayKey) {
                  return (
                    <>
                      <div className="calendar-day-detail-title">{derived.sessionTitle}</div>
                      <div className="calendar-day-detail-meta">{dateLabel}</div>
                      <div className="calendar-day-detail-pills">
                        <span className="calendar-pill">{derived.duration}</span>
                        <span className="calendar-pill">{derived.intensity}</span>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="calendar-day-detail-title">No session data for this day</div>
                    <div className="calendar-day-detail-meta">{dateLabel}</div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </OSLayer>
    </RequireAuth>
  );
}
