/**
 * Lightweight event bus for performance intelligence layer.
 * Modules subscribe to relevant events; engine emits on state changes.
 */

export type PerformanceEvent =
  | "goalUpdated"
  | "goalsReplaced"
  | "milestoneUpdated"
  | "programmeUpdated"
  | "nutritionUpdated"
  | "injuryUpdated"
  | "stateRecalculated"
  | "strategicInsightsUpdated";

type Listener = (data: unknown) => void;

const listeners = new Map<PerformanceEvent, Set<Listener>>();

function getListeners(event: PerformanceEvent): Set<Listener> {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  return set;
}

export function subscribe(event: PerformanceEvent, callback: Listener): () => void {
  const set = getListeners(event);
  set.add(callback);
  return () => set.delete(callback);
}

export function emit(event: PerformanceEvent, data?: unknown): void {
  getListeners(event).forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.warn("[performanceEvents]", event, e);
    }
  });
}
