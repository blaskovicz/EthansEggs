// Mirrors server/src/lib/balance.ts's todayLocalDate() so date pickers default to
// (and cap at) the same local calendar day the server uses for "today".
export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
