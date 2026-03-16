"use client";

import { useEffect, useState } from "react";
import OSLayer from "@/app/components/OSLayer";
import SettingsView from "@/app/components/SettingsView";
import { supabase } from "@/lib/supabaseClient";

type UserPreferences = {
  garmin_connected?: boolean;
  garmin_last_sync?: string;
  whoop_connected?: boolean;
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

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

  const handleGarminDisconnect = async () => {
    await fetch("/api/garmin/disconnect", { method: "POST" });
    setPrefs((prev) => ({ ...(prev ?? {}), garmin_connected: false }));
  };

  const handleWhoopSync = async () => {
    await fetch("/api/whoop/sync").catch(() => {});
  };

  const handleWhoopDisconnect = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whoop_connected: false }),
    }).catch(() => {});
    setPrefs((prev) => ({ ...(prev ?? {}), whoop_connected: false }));
  };

  return (
    <OSLayer>
      <div className="settings-root">
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
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(238, 240, 244, 0.35);
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
            <div className="devices-section-label">CONNECTED DEVICES</div>
            <div className="devices-grid">
              {/* Garmin */}
              <div className="device-card">
                <div className="device-main">
                  <div className="device-title">Garmin</div>
                  <div className="device-sub">Activity, HRV, Sleep, Body Battery</div>
                  {prefs?.garmin_last_sync && (
                    <div className="device-meta">
                      Last sync: {new Date(prefs.garmin_last_sync).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="device-actions">
                  {prefs?.garmin_connected ? (
                    <>
                      <span className="connected-pill">Connected</span>
                      <button
                        type="button"
                        className="link-text"
                        onClick={handleGarminDisconnect}
                      >
                        Disconnect
                      </button>
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
                  <div className="device-title">Whoop</div>
                  <div className="device-sub">Recovery, HRV, Sleep, Strain</div>
                </div>
                <div className="device-actions">
                  {prefs?.whoop_connected ? (
                    <>
                      <span className="connected-pill">Connected</span>
                      <button
                        type="button"
                        className="connect-btn"
                        onClick={handleWhoopSync}
                      >
                        Sync Now
                      </button>
                      <button
                        type="button"
                        className="link-text"
                        onClick={handleWhoopDisconnect}
                      >
                        Disconnect
                      </button>
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
      </div>
    </OSLayer>
  );
}

