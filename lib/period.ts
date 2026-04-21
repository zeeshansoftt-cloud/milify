export type Frequency = "daily" | "weekly" | "monthly" | "custom";

export function periodKey(freq: Frequency, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (freq === "monthly") return `${y}-${m}`;
  if (freq === "weekly") {
    const iso = isoWeek(date);
    return `${iso.year}-W${String(iso.week).padStart(2, "0")}`;
  }
  if (freq === "custom") return "once";
  return `${y}-${m}-${d}`;
}

export function periodLabel(freq: Frequency, date: Date = new Date(), locale = "sv-SE"): string {
  if (freq === "monthly") {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(date);
  }
  if (freq === "weekly") {
    const iso = isoWeek(date);
    return `V.${iso.week}, ${iso.year}`;
  }
  if (freq === "custom") return "Engång";
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
    date
  );
}

export function frequencyLabel(freq: Frequency): string {
  switch (freq) {
    case "daily":
      return "Dagligen";
    case "weekly":
      return "Veckovis";
    case "monthly":
      return "Månadsvis";
    case "custom":
      return "Engång";
  }
}

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}
