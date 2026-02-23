export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem("pathfinder_session");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("pathfinder_session", sessionId);
  }

  return sessionId;
}