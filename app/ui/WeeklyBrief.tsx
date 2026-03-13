"use client";

/**
 * Weekly Strategic Brief — coach-voice summary before each training week.
 * Phase 2: pull from readiness trends, momentum, fatigue model.
 */

export type WeeklyBriefProps = {
  phaseIntent?: string;
  systemBias?: string;
  primaryLimiter?: string;
  recoveryBandwidth?: string;
  whyThisWeek?: string;
  weekNumber?: number;
  className?: string;
};

export default function WeeklyBrief({
  phaseIntent = "GPP — building aerobic floor and work capacity",
  systemBias = "Strength-dominant; aerobic floor building",
  primaryLimiter = "—",
  recoveryBandwidth = "Adequate",
  whyThisWeek = "This week maintains volume with moderate intensity to consolidate last block. Recovery bandwidth supports the planned load.",
  weekNumber,
  className = "",
}: WeeklyBriefProps) {
  return (
    <div className={`weeklyBrief ${className}`}>
      {weekNumber != null && (
        <div className="weeklyBriefWeek">Week {weekNumber}</div>
      )}
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Phase intent</span>
        <span className="weeklyBriefValue">{phaseIntent}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">System bias</span>
        <span className="weeklyBriefValue">{systemBias}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Primary limiter</span>
        <span className="weeklyBriefValue">{primaryLimiter}</span>
      </div>
      <div className="weeklyBriefSection">
        <span className="weeklyBriefLabel">Recovery bandwidth</span>
        <span className="weeklyBriefValue">{recoveryBandwidth}</span>
      </div>
      <p className="weeklyBriefWhy">{whyThisWeek}</p>
      <style jsx>{`
        .weeklyBrief {
          background: linear-gradient(135deg, rgba(17,24,39,0.95), rgba(30,41,59,0.9));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 24px 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 60px rgba(47,128,237,0.15);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .weeklyBrief:hover {
          box-shadow: 0 0 28px rgba(47,128,237,0.25), 0 0 56px rgba(39,224,166,0.12), 0 20px 60px rgba(0,0,0,0.6);
          border-color: rgba(47,128,237,0.2);
        }
        .weeklyBriefWeek {
          font-size: 11px;
          letter-spacing: 0.1em;
          opacity: 0.6;
          margin-bottom: 14px;
        }
        .weeklyBriefSection {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
        }
        .weeklyBriefSection:last-of-type { margin-bottom: 16px; }
        .weeklyBriefLabel {
          font-size: 11px;
          opacity: 0.65;
        }
        .weeklyBriefValue { font-size: 14px; opacity: 0.9; }
        .weeklyBriefWhy {
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.8;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
