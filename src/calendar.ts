export function localDateKey(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid session date.");
  // Convert an instant to the device's LOCAL calendar date, not its UTC date.
  return `${String(now.getFullYear()).padStart(4, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function civilDate(key: string): Date {
  if (!/^\d{8}$/.test(key) || Number(key.slice(0, 4)) < 1000) throw new Error("Use YYYYMMDD for the date.");
  // UTC is used ONLY for civil-date arithmetic, avoiding daylight-saving offsets.
  const date = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8))));
  if (date.toISOString().slice(0, 10).replace(/-/g, "") !== key) throw new Error("Invalid calendar date.");
  return date;
}

export function validateDate(key: string): string {
  civilDate(key);
  return key;
}

export function nextDate(key: string): string {
  const date = civilDate(key);
  date.setUTCDate(date.getUTCDate() + 1);
  return validateDate(date.toISOString().slice(0, 10).replace(/-/g, ""));
}

export function weekday(key: string): number {
  return civilDate(key).getUTCDay();
}

export function availableDates(start: string, weekdays: number[], count: number): string[] {
  validateDate(start);
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000 || !weekdays.length
    || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("Invalid lesson count or learning weekdays.");
  }
  const dates: string[] = [];
  let date = start;
  while (dates.length < count) {
    if (weekdays.includes(weekday(date))) dates.push(date);
    if (dates.length < count) date = nextDate(date);
  }
  return dates;
}
