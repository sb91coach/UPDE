"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserPreferences = {
  weight_unit?: "kg" | "lb";
  session_reminders?: boolean;
  weekly_summary_email?: boolean;
  marketing_emails?: boolean;
  product_updates?: boolean;
  sms_notifications?: boolean;
  garmin_connected?: boolean;
  stripe_customer_id?: string;
};

const DEFAULT_PREFS: UserPreferences = {
  weight_unit: "kg",
  session_reminders: true,
  weekly_summary_email: true,
  marketing_emails: false,
  product_updates: true,
  sms_notifications: false,
  garmin_connected: false,
};

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link href={href}>
      <span
        style={{
          fontSize: 14,
          opacity: active ? 1 : 0.6,
          borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
          paddingBottom: 4,
          cursor: "pointer",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.6,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}

function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="settingsCard">
      <div className="settingsCardHead">
        <div>
          <div className="settingsCardTitle">{title}</div>
          <div className="settingsCardDesc">{description}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function SettingsView() {
  const pathname = usePathname();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMessage = useCallback((type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") setPrefs({ ...DEFAULT_PREFS, ...data });
      })
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, []);

  const updatePref = useCallback(
    async (key: keyof UserPreferences, value: unknown) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      setSaving(key);
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showMessage("err", (data.error as string) || "Failed to save");
          setPrefs(prefs);
          return;
        }
        showMessage("ok", "Saved");
      } catch {
        showMessage("err", "Failed to save");
        setPrefs(prefs);
      } finally {
        setSaving(null);
      }
    },
    [prefs, showMessage]
  );

  const openStripePortal = useCallback(async () => {
    setSaving("stripe");
    try {
      const res = await fetch("/api/stripe-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage("err", (data.error as string) || "Could not open billing portal");
        return;
      }
      if (data.url) window.open(data.url, "_blank");
    } catch {
      showMessage("err", "Could not open billing portal");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  const connectGarmin = useCallback(async () => {
    setSaving("garmin");
    try {
      const res = await fetch("/api/garmin/connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.connected) {
        setPrefs((p) => ({ ...p, garmin_connected: true }));
        showMessage("ok", "Garmin connected");
      } else {
        showMessage("err", (data.error as string) || "Could not connect Garmin");
      }
    } catch {
      showMessage("err", "Could not connect Garmin");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  const disconnectGarmin = useCallback(async () => {
    setSaving("garmin");
    try {
      const res = await fetch("/api/garmin/disconnect", { method: "POST" });
      if (res.ok) {
        setPrefs((p) => ({ ...p, garmin_connected: false }));
        showMessage("ok", "Garmin disconnected");
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage("err", (data.error as string) || "Could not disconnect");
      }
    } catch {
      showMessage("err", "Could not disconnect");
    } finally {
      setSaving(null);
    }
  }, [showMessage]);

  if (loading) {
    return (
      <div className="settingsOuter">
        <nav className="nav">
          <div className="brand">PERFORMANCE PATHFINDER OS</div>
          <div className="tabs">
            <NavTab href="/" label="Home" pathname={pathname} />
            <NavTab href="/profile" label="Profile" pathname={pathname} />
            <NavTab href="/programme" label="Programme" pathname={pathname} />
            <NavTab href="/tactical" label="Tactical" pathname={pathname} />
            <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
            <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
            <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
            <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
            <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
            <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
            <NavTab href="/settings" label="Settings" pathname={pathname} />
          </div>
        </nav>
        <div className="container" style={{ paddingTop: 80, textAlign: "center", opacity: 0.7 }}>
          Loading settings…
        </div>
        <style jsx>{` .settingsOuter { min-height: 100vh; background: linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%); color: #fff; } .nav { display: flex; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid rgba(255,255,255,0.05); } .brand { font-size: 12px; letter-spacing: 2px; opacity: 0.6; } .tabs { display: flex; gap: 30px; } .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; } `}</style>
      </div>
    );
  }

  return (
    <div className="settingsOuter">
      {message && (
        <div className={`settingsToast ${message.type}`}>
          {message.text}
        </div>
      )}
      <nav className="nav">
        <div className="brand">PERFORMANCE PATHFINDER OS</div>
        <div className="tabs">
          <NavTab href="/" label="Home" pathname={pathname} />
          <NavTab href="/profile" label="Profile" pathname={pathname} />
          <NavTab href="/programme" label="Programme" pathname={pathname} />
          <NavTab href="/tactical" label="Tactical" pathname={pathname} />
          <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
          <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
          <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
          <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
          <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
          <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
          <NavTab href="/settings" label="Settings" pathname={pathname} />
        </div>
      </nav>

      <div className="container">
        <div className="settingsHero sectionBlock delay1">
          <h1 className="settingsPageTitle">Settings</h1>
          <p className="settingsPageSub">
            Manage your profile, subscription, payment methods, preferences, marketing, and connected devices.
          </p>
        </div>

        <div className="sectionBlock delay2">
          <SectionTitle text="PROFILE" />
          <SettingsCard
            title="Profile & identity"
            description="View and edit your performance profile, readiness inputs, and programme identity. Benchmarks and intake live on their own pages."
            action={
              <Link href="/profile" className="settingsCardBtn">
                Open dashboard
              </Link>
            }
          />
        </div>

        <div className="sectionBlock delay3">
          <SectionTitle text="SUBSCRIPTION" />
          <SettingsCard
            title="Plan & billing"
            description="Your current plan, renewal date, and upgrade or cancel options. Invoices and billing history are in the Stripe customer portal."
            action={
              <button
                type="button"
                className="settingsCardBtn"
                onClick={openStripePortal}
                disabled={saving === "stripe"}
              >
                {saving === "stripe" ? "Opening…" : "Manage subscription"}
              </button>
            }
          >
            <div className="settingsCardMeta">
              <span>Active plan</span>
              <span className="settingsCardMetaValue">Performance Pathfinder</span>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay4">
          <SectionTitle text="STRIPE GATEWAY" />
          <SettingsCard
            title="Payment methods"
            description="Add or remove payment methods used for your subscription. Secured by Stripe; we never store card details."
            action={
              <button
                type="button"
                className="settingsCardBtn"
                onClick={openStripePortal}
                disabled={saving === "stripe"}
              >
                {saving === "stripe" ? "Opening…" : "Manage payments"}
              </button>
            }
          />
        </div>

        <div className="sectionBlock delay5">
          <SectionTitle text="PREFERENCES" />
          <SettingsCard
            title="Units & notifications"
            description="Choose units (kg/lb), session reminders, and weekly summary email."
          >
            <div className="settingsPrefList">
              <label className="settingsPrefRow">
                <span>Weight units</span>
                <select
                  className="settingsSelect"
                  value={prefs.weight_unit ?? "kg"}
                  onChange={(e) => updatePref("weight_unit", e.target.value as "kg" | "lb")}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>
              <label className="settingsPrefRow">
                <span>Session reminders</span>
                <input
                  type="checkbox"
                  checked={prefs.session_reminders ?? true}
                  onChange={(e) => updatePref("session_reminders", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>Weekly summary email</span>
                <input
                  type="checkbox"
                  checked={prefs.weekly_summary_email ?? true}
                  onChange={(e) => updatePref("weekly_summary_email", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay6">
          <SectionTitle text="MARKETING PREFERENCES" />
          <SettingsCard
            title="Emails & communications"
            description="Choose whether to receive marketing emails, product updates, and optional SMS. We never sell your data."
          >
            <div className="settingsPrefList">
              <label className="settingsPrefRow">
                <span>Marketing emails (offers, tips)</span>
                <input
                  type="checkbox"
                  checked={prefs.marketing_emails ?? false}
                  onChange={(e) => updatePref("marketing_emails", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>Product updates & new features</span>
                <input
                  type="checkbox"
                  checked={prefs.product_updates ?? true}
                  onChange={(e) => updatePref("product_updates", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
              <label className="settingsPrefRow">
                <span>SMS notifications</span>
                <input
                  type="checkbox"
                  checked={prefs.sms_notifications ?? false}
                  onChange={(e) => updatePref("sms_notifications", e.target.checked)}
                  className="settingsCheck"
                />
              </label>
            </div>
          </SettingsCard>
        </div>

        <div className="sectionBlock delay7">
          <SectionTitle text="WEARABLE & INTEGRATIONS" />
          <SettingsCard
            title="Garmin Connect"
            description="Sync activities, heart rate, and recovery metrics from Garmin to improve readiness and programme recommendations."
            action={
              prefs.garmin_connected ? (
                <button
                  type="button"
                  className="settingsCardBtn"
                  onClick={disconnectGarmin}
                  disabled={saving === "garmin"}
                >
                  {saving === "garmin" ? "…" : "Disconnect Garmin"}
                </button>
              ) : (
                <button
                  type="button"
                  className="settingsCardBtn settingsCardBtnPrimary"
                  onClick={connectGarmin}
                  disabled={saving === "garmin"}
                >
                  {saving === "garmin" ? "Connecting…" : "Connect Garmin"}
                </button>
              )
            }
          >
            {prefs.garmin_connected && (
              <div className="settingsCardMeta">
                <span>Status</span>
                <span className="settingsCardMetaValue">Connected</span>
              </div>
            )}
          </SettingsCard>
          <SettingsCard
            title="More integrations"
            description="Whoop, Apple Health, Polar, and other wearables are on the roadmap."
            action={<span className="settingsCardBadge muted">Coming soon</span>}
          />
        </div>

        <div className="sectionBlock delay8">
          <SectionTitle text="PRIVACY & ACCOUNT" />
          <SettingsCard
            title="Data & privacy"
            description="Your data is used only to run your programme and improve your experience. Export or delete your data anytime."
          >
            <div className="settingsPrefList">
              <p className="settingsCardMeta" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                Account and programme data are stored securely. To request an export or account deletion, contact support from your profile email.
              </p>
            </div>
          </SettingsCard>
        </div>
      </div>

      <style jsx>{`
        .settingsOuter {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #0f1117 50%, #0a0a0f 100%);
          color: #fff;
        }
        .settingsToast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 10002;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .settingsToast.ok {
          background: rgba(39, 224, 166, 0.2);
          border: 1px solid rgba(39, 224, 166, 0.5);
          color: #27E0A6;
        }
        .settingsToast.err {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #f87171;
        }
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .brand {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.6;
        }
        .tabs {
          display: flex;
          gap: 30px;
        }
        .container {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 40px;
        }
        .settingsHero {
          margin-bottom: 48px;
        }
        .settingsPageTitle {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 8px 0;
        }
        .settingsPageSub {
          font-size: 15px;
          opacity: 0.7;
          margin: 0;
          max-width: 560px;
        }
        .sectionBlock {
          margin-bottom: 36px;
          animation: sectionFadeIn 0.5s ease-out backwards;
        }
        .sectionBlock.delay1 { animation-delay: 0.08s; }
        .sectionBlock.delay2 { animation-delay: 0.16s; }
        .sectionBlock.delay3 { animation-delay: 0.24s; }
        .sectionBlock.delay4 { animation-delay: 0.32s; }
        .sectionBlock.delay5 { animation-delay: 0.4s; }
        .sectionBlock.delay6 { animation-delay: 0.48s; }
        .sectionBlock.delay7 { animation-delay: 0.56s; }
        .sectionBlock.delay8 { animation-delay: 0.64s; }
        @keyframes sectionFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .settingsCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .settingsCardHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .settingsCardTitle {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .settingsCardDesc {
          font-size: 14px;
          opacity: 0.7;
          line-height: 1.45;
          max-width: 520px;
        }
        .settingsCardBtn {
          display: inline-block;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, border-color 0.2s;
        }
        .settingsCardBtn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .settingsCardBtn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .settingsCardBtnPrimary {
          border-color: #2F80ED;
          background: rgba(47, 128, 237, 0.25);
        }
        .settingsCardBtnPrimary:hover:not(:disabled) {
          background: rgba(47, 128, 237, 0.4);
        }
        .settingsCardBadge {
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 12px;
          font-weight: 500;
          opacity: 0.9;
        }
        .settingsCardBadge.muted {
          opacity: 0.5;
        }
        .settingsCardMeta {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .settingsCardMetaValue {
          font-weight: 600;
          color: #27E0A6;
        }
        .settingsPrefList {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .settingsPrefRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          font-size: 14px;
          cursor: pointer;
        }
        .settingsPrefRow span {
          opacity: 0.9;
        }
        .settingsSelect {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .settingsCheck {
          accent-color: #2F80ED;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .nav { flex-wrap: wrap; padding: 16px; gap: 12px; }
          .tabs { gap: 16px; flex-wrap: wrap; }
          .container { padding: 0 16px; margin: 24px auto; }
          .settingsPageTitle { font-size: 26px; }
          .settingsCardHead { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
