"use client";

import { useEffect, useState } from "react";
import OSLayer from "@/app/components/OSLayer";
import SettingsView from "@/app/components/SettingsView";
import { supabase } from "@/lib/supabaseClient";

type UserPreferences = {
  garmin_connected?: boolean;
  garmin_last_sync?: string;
  whoop_connected?: boolean;
  whoop_last_sync?: string;
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [garminSyncing, setGarminSyncing] = useState(false);
  const [whoopSyncing, setWhoopSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        if (!cancelled) setLoadingPrefs(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("user_preferences")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!cancelled) {
        setPrefs((data?.user_preferences as UserPreferences) ?? {});
        setLoadingPrefs(false);
      }
    }
    loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGarminSync = async () => {
    setGarminSyncing(true);
    try {
      await fetch("/api/garmin/sync");
      setPrefs((prev) => ({
        ...(prev ?? {}),
        garmin_last_sync: new Date().toISOString(),
      }));
    } catch {
      // ignore
    } finally {
      setGarminSyncing(false);
    }
  };

  const handleGarminDisconnect = async () => {
    await fetch("/api/garmin/disconnect", { method: "DELETE" }).catch(() => {});
    setPrefs((prev) => ({
      ...(prev ?? {}),
      garmin_connected: false,
      garmin_last_sync: undefined,
    }));
  };

  const handleWhoopSync = async () => {
    setWhoopSyncing(true);
    try {
      await fetch("/api/whoop/sync");
      setPrefs((prev) => ({
        ...(prev ?? {}),
        whoop_last_sync: new Date().toISOString(),
      }));
    } catch {
      // ignore
    } finally {
      setWhoopSyncing(false);
    }
  };

  const handleWhoopDisconnect = async () => {
    await fetch("/api/whoop/disconnect", { method: "DELETE" }).catch(() => {});
    setPrefs((prev) => ({
      ...(prev ?? {}),
      whoop_connected: false,
      whoop_last_sync: undefined,
    }));
  };

  return (
    <OSLayer>
      <div
        className="settings-root"
        style={{
          background: "#0a0c12",
          minHeight: "100vh",
          color: "rgba(238,240,244,0.9)",
        }}
      >
        <style jsx>{`
          .settings-root {
            max-width: 860px;
            margin: 0 auto;
            padding: 16px 16px 120px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .devices-section-label {
            margin-bottom: 12px;
          }
          .devices-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .device-card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .device-main {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .device-title {
            font-size: 15px;
            font-weight: 700;
            color: rgba(238, 240, 244, 0.95);
          }
          .device-sub {
            font-size: 12px;
            color: rgba(238, 240, 244, 0.4);
          }
          .device-meta {
            font-size: 11px;
            color: rgba(238, 240, 244, 0.35);
            margin-top: 4px;
          }
          .whoop-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justifyContent: center;
            border: 1px solid rgba(0, 201, 160, 0.4);
          }
          .whoop-actions-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .whoop-sync-btn {
            border-radius: 10px;
            padding: 7px 14px;
            font-size: 12px;
            font-weight: 600;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(238, 240, 244, 0.8);
            cursor: pointer;
          }
          .device-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
          }
          .connect-btn {
            border: none;
            border-radius: 10px;
            padding: 9px 18px;
            font-size: 13px;
            font-weight: 700;
            background: linear-gradient(135deg, #0a84ff, #7b61ff);
            color: #ffffff;
            cursor: pointer;
          }
          .connected-pill {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 9999px;
            background: rgba(0, 201, 160, 0.1);
            border: 1px solid rgba(0, 201, 160, 0.2);
            color: #00c9a0;
            font-size: 11px;
            font-weight: 700;
          }
          .link-text {
            font-size: 11px;
            color: rgba(238, 240, 244, 0.55);
            text-decoration: underline;
            cursor: pointer;
          }
          @media (max-width: 640px) {
            .device-card {
              flex-direction: column;
              align-items: flex-start;
            }
            .device-actions {
              align-items: flex-start;
            }
          }
        `}</style>

        {!loadingPrefs && (
          <section>
            <div
              className="devices-section-label"
              style={{
                color: "rgba(238,240,244,0.25)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              CONNECTED DEVICES
            </div>
            <div className="devices-grid">
              {/* Garmin */}
              <div className="device-card">
                <div className="device-main">
                  <div
                    className="device-title"
                    style={{ fontWeight: 600, color: "rgba(238,240,244,0.95)" }}
                  >
                    Garmin
                  </div>
                  <div
                    className="device-sub"
                    style={{ color: "rgba(238,240,244,0.7)" }}
                  >
                    HRV · Sleep · Stress · Daily Activity
                  </div>
                  {prefs?.garmin_last_sync && prefs.garmin_connected && (
                    <div
                      className="device-meta"
                      style={{ color: "rgba(238,240,244,0.35)" }}
                    >
                      {(() => {
                        const last = new Date(prefs.garmin_last_sync!);
                        const diffMs = Date.now() - last.getTime();
                        const mins = Math.max(0, Math.round(diffMs / 60000));
                        return `Last sync: ${mins} min${mins === 1 ? "" : "s"} ago`;
                      })()}
                    </div>
                  )}
                </div>
                <div className="device-actions">
                  {prefs?.garmin_connected ? (
                    <>
                      <span className="connected-pill">Connected</span>
                      <div className="whoop-actions-row">
                        <button
                          type="button"
                          className="whoop-sync-btn"
                          onClick={handleGarminSync}
                          disabled={garminSyncing}
                        >
                          {garminSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button
                          type="button"
                          className="link-text"
                          onClick={handleGarminDisconnect}
                          style={{ color: "rgba(238,240,244,0.35)" }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="connect-btn"
                      onClick={() => {
                        window.location.href = "/api/garmin/auth";
                      }}
                    >
                      Connect Garmin
                    </button>
                  )}
                </div>
              </div>

              {/* Whoop */}
              <div className="device-card">
                <div className="device-main">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="whoop-icon" aria-hidden>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="7"
                          fill="none"
                          stroke="#00c9a0"
                          strokeWidth="1.6"
                        />
                      </svg>
                    </div>
                    <div>
                      <div
                        className="device-title"
                        style={{ fontWeight: 600, color: "rgba(238,240,244,0.95)" }}
                      >
                        Whoop
                      </div>
                      <div
                        className="device-sub"
                        style={{ color: "rgba(238,240,244,0.7)" }}
                      >
                        Recovery · HRV · Sleep · Strain
                      </div>
                    </div>
                  </div>
                  {prefs?.whoop_last_sync && prefs.whoop_connected && (
                    <div
                      className="device-meta"
                      style={{ color: "rgba(238,240,244,0.35)" }}
                    >
                      {(() => {
                        const last = new Date(prefs.whoop_last_sync!);
                        const diffMs = Date.now() - last.getTime();
                        const mins = Math.max(0, Math.round(diffMs / 60000));
                        return `Last sync: ${mins} min${mins === 1 ? "" : "s"} ago`;
                      })()}
                    </div>
                  )}
                </div>
                <div className="device-actions">
                  {prefs?.whoop_connected ? (
                    <>
                      <span className="connected-pill">Connected</span>
                      <div className="whoop-actions-row">
                        <button
                          type="button"
                          className="whoop-sync-btn"
                          onClick={handleWhoopSync}
                          disabled={whoopSyncing}
                        >
                          {whoopSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button
                          type="button"
                          className="link-text"
                          onClick={handleWhoopDisconnect}
                          style={{ color: "rgba(238,240,244,0.35)" }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="connect-btn"
                      onClick={() => {
                        window.location.href = "/api/whoop/auth";
                      }}
                    >
                      Connect Whoop
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <SettingsView />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12,
            color: "rgba(238,240,244,0.3)",
          }}
        >
          <a
            href="/privacy"
            style={{
              color: "rgba(238,240,244,0.4)",
              textDecoration: "underline",
            }}
          >
            Privacy Policy
          </a>
          <span>Version 1.0</span>
        </div>
      </div>
    </OSLayer>
  );
}

