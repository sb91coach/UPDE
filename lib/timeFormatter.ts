/**
 * Format seconds as HH:MM:SS with leading zeros.
 * 9000 → "02:30:00"
 * 5421 → "01:30:21"
 */
export function formatToHHMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
