/**
 * Parse "HH:MM:SS" or "MM:SS" or plain seconds string to seconds.
 * Returns 0 for invalid input.
 */
export function parseHHMMSS(input: string): number {
  const s = String(input).trim();
  if (!s) return 0;
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 3) {
    const [h, m, sec] = parts;
    return h * 3600 + m * 60 + sec;
  }
  if (parts.length === 2) {
    const [m, sec] = parts;
    return m * 60 + sec;
  }
  if (parts.length === 1) return Math.floor(parts[0]);
  return 0;
}

/**
 * Format seconds as HH:MM:SS with leading zeros.
 */
export function formatHHMMSS(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
