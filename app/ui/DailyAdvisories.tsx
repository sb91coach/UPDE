"use client";

import type { Advisory } from "@/engine/advisoriesEngine";

export type DailyAdvisoriesProps = {
  advisories: Advisory[];
  /** When true, show a short line prompting check-in */
  showCheckinPrompt?: boolean;
  className?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  nutrition: "Nutrition",
  psych: "Psych",
  soft_tissue: "Soft tissue",
  recovery: "Recovery",
};

export default function DailyAdvisories({
  advisories,
  showCheckinPrompt = false,
  className = "",
}: DailyAdvisoriesProps) {
  return (
    <div className={`dailyAdvisories ${className}`}>
      <div className="dailyAdvisoriesTitle">Today&apos;s advisories</div>
      {showCheckinPrompt && (
        <p className="dailyAdvisoriesPrompt">Complete your daily check-in to get personalised advisories for training, nutrition and recovery.</p>
      )}
      {advisories.length === 0 && !showCheckinPrompt && (
        <p className="dailyAdvisoriesEmpty">No advisories right now. You&apos;re good to go.</p>
      )}
      <ul className="dailyAdvisoriesList">
        {advisories.map((a, i) => (
          <li key={i} className={`dailyAdvisoriesItem ${a.priority}`}>
            <span className="dailyAdvisoriesCategory">{a.label}</span>
            <p className="dailyAdvisoriesMessage">{a.message}</p>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .dailyAdvisories {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 20px 24px;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .dailyAdvisories:hover {
          box-shadow: 0 0 24px rgba(47,128,237,0.2), 0 0 48px rgba(39,224,166,0.1);
          border-color: rgba(47,128,237,0.2);
        }
        .dailyAdvisoriesTitle {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-bottom: 12px;
        }
        .dailyAdvisoriesPrompt, .dailyAdvisoriesEmpty {
          font-size: 13px;
          opacity: 0.75;
          margin: 0 0 12px;
        }
        .dailyAdvisoriesList {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .dailyAdvisoriesItem {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dailyAdvisoriesItem:last-child { border-bottom: none; }
        .dailyAdvisoriesCategory {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #14b8a6;
          margin-bottom: 4px;
        }
        .dailyAdvisoriesItem.high .dailyAdvisoriesCategory { color: #f59e0b; }
        .dailyAdvisoriesMessage {
          font-size: 13px;
          line-height: 1.45;
          opacity: 0.9;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
