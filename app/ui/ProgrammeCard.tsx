"use client";

/**
 * Premium programme card — coaching-grade session layout.
 * Clear hierarchy, clean spacing, minimal borders, subtle glow. No clutter.
 * Format: Block · Bias | Duration · Intensity | Primary Focus | A. B. C. D. (with rest / aerobic flush).
 */

export type ProgrammeCardExercise = {
  letter: string;
  title: string;
  prescription: string;
  rest?: string;
};

export type ProgrammeCardProps = {
  /** e.g. "LOWER BODY · NEURAL BIAS" */
  sessionTitle: string;
  sessionSubtitle?: string;
  /** e.g. "60–75 min" */
  duration: string;
  /** e.g. "Moderate–High" */
  intensity: string;
  /** e.g. "Primary Focus: Max Force Output" or "Max Force Output" */
  primaryFocus: string;
  exercises: ProgrammeCardExercise[];
  className?: string;
};

export default function ProgrammeCard({
  sessionTitle,
  sessionSubtitle,
  duration,
  intensity,
  primaryFocus,
  exercises,
  className = "",
}: ProgrammeCardProps) {
  const focusLabel = primaryFocus.startsWith("Primary Focus") ? primaryFocus : `Primary Focus: ${primaryFocus}`;

  return (
    <div className={`programmeCard ${className}`}>
      <div className="programmeCardSummary">
        <h2 className="programmeCardSessionTitle">{sessionTitle}</h2>
        {sessionSubtitle && (
          <p className="programmeCardSessionSubtitle">{sessionSubtitle}</p>
        )}
        <div className="programmeCardMeta">
          <span>{duration}</span>
          <span className="programmeCardMetaDot" aria-hidden>·</span>
          <span>{intensity}</span>
        </div>
        <div className="programmeCardFocus">{focusLabel}</div>
      </div>

      <div className="programmeCardExercises">
        {exercises.map((ex, i) => (
          <div key={i} className="programmeCardExerciseRow">
            <span className="programmeCardExerciseLetter">{ex.letter}.</span>
            <div className="programmeCardExerciseMain">
              <div className="programmeCardExerciseTitle">{ex.title}</div>
              <div className="programmeCardPrescription">{ex.prescription}</div>
              {ex.rest && (
                <div className="programmeCardRest">Rest: {ex.rest}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .programmeCard {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.6), rgba(30, 41, 59, 0.5));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .programmeCardSummary {
          padding: 28px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .programmeCardSessionTitle {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.12em;
          margin: 0 0 8px;
          color: rgba(255, 255, 255, 0.95);
        }

        .programmeCardSessionSubtitle {
          font-size: 13px;
          opacity: 0.7;
          margin: 0 0 12px;
        }

        .programmeCardMeta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.88;
          margin-bottom: 10px;
        }

        .programmeCardMetaDot {
          opacity: 0.5;
          font-size: 10px;
        }

        .programmeCardFocus {
          font-size: 13px;
          opacity: 0.82;
          letter-spacing: 0.02em;
        }

        .programmeCardExercises {
          padding: 20px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .programmeCardExerciseRow {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .programmeCardExerciseLetter {
          flex-shrink: 0;
          width: 28px;
          font-size: 15px;
          font-weight: 700;
          color: rgba(47, 128, 237, 0.95);
        }

        .programmeCardExerciseMain {
          flex: 1;
          min-width: 0;
        }

        .programmeCardExerciseTitle {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          color: #fff;
        }

        .programmeCardPrescription {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.45;
        }

        .programmeCardRest {
          font-size: 12px;
          opacity: 0.65;
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
