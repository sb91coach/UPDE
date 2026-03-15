"use client";

export type SessionHeaderProps = {
  title: string;
  duration?: string;
  focus?: string;
  onStartWorkout?: () => void;
  startWorkoutLabel?: string;
};

export default function SessionHeader({
  title,
  duration,
  focus,
  onStartWorkout,
  startWorkoutLabel = "Start Workout",
}: SessionHeaderProps) {
  return (
    <header className="polish-card space-y-3">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-1 text-sm text-gray-600">
        {duration != null && duration !== "" && (
          <p><span className="text-gray-500">Duration:</span> {duration}</p>
        )}
        {focus != null && focus !== "" && (
          <p><span className="text-gray-500">Focus:</span> {focus}</p>
        )}
      </div>
      {onStartWorkout && (
        <button
          type="button"
          onClick={onStartWorkout}
          className="h-12 w-full rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors active:scale-[0.98]"
        >
          {startWorkoutLabel}
        </button>
      )}
    </header>
  );
}
