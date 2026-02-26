"use client";

/**
 * Clean, premium session card for coaching OS.
 * Layout: header (session type · bias | duration | intensity | focus), then A/B/C/D exercises.
 * No clutter; percentage prescriptions show weight when 1RM available, else RPE.
 */

export type ProgrammeCardExercise = {
  letter: string;
  title: string;
  prescription: string;
  rest?: string;
};

export type ProgrammeCardProps = {
  sessionTitle: string;
  sessionSubtitle?: string;
  duration: string;
  intensity: string;
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
  return (
    <div className={`programmeCard ${className}`}>
      <div className="programmeCardHeader">
        <div className="programmeCardTitleRow">
          <span className="programmeCardTitle">{sessionTitle}</span>
          {sessionSubtitle && (
            <span className="programmeCardSubtitle">{sessionSubtitle}</span>
          )}
        </div>
        <div className="programmeCardMeta">
          {duration} · Intensity: {intensity}
        </div>
        <div className="programmeCardFocus">
          Primary focus: {primaryFocus}
        </div>
      </div>

      <div className="programmeCardBody">
        {exercises.map((ex, i) => (
          <div key={i} className="programmeCardExercise">
            <span className="programmeCardLetter">{ex.letter}.</span>
            <div className="programmeCardExerciseContent">
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
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          overflow: hidden;
        }

        .programmeCardHeader {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .programmeCardTitleRow {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 8px;
        }

        .programmeCardTitle {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.05em;
          opacity: 0.95;
        }

        .programmeCardSubtitle {
          font-size: 12px;
          opacity: 0.6;
        }

        .programmeCardMeta {
          font-size: 13px;
          opacity: 0.75;
          margin-bottom: 4px;
        }

        .programmeCardFocus {
          font-size: 12px;
          opacity: 0.65;
        }

        .programmeCardBody {
          padding: 20px 24px;
        }

        .programmeCardExercise {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .programmeCardExercise:last-child {
          margin-bottom: 0;
        }

        .programmeCardLetter {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.7;
          flex-shrink: 0;
        }

        .programmeCardExerciseContent {
          flex: 1;
        }

        .programmeCardExerciseTitle {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .programmeCardPrescription {
          font-size: 14px;
          opacity: 0.9;
        }

        .programmeCardRest {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
