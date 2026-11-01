// German local time (Europe/Berlin) helpers that get summer/winter time
// right: the UTC offset is +01:00 in winter and +02:00 in summer, so it must
// be looked up for the date in question, never hard-coded.

/** UTC offset of Europe/Berlin at `date`, in minutes (60 or 120). */
export function berlinOffsetMinutes(date: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT+01:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 60;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

/** "+01:00" or "+02:00" for that moment. */
export function berlinOffsetString(date: Date): string {
  const minutes = berlinOffsetMinutes(date);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * The instant at which a German wall-clock time occurs, e.g.
 * berlinWallTime("2026-11-03", "20:00") -> 2026-11-03T19:00:00Z.
 */
export function berlinWallTime(date: string, time = "00:00"): Date {
  const naive = new Date(`${date}T${time}:00Z`);
  // Look the offset up near the target time; correct once in case the guess
  // straddled a summer/winter switch.
  let result = new Date(naive.getTime() - berlinOffsetMinutes(naive) * 60_000);
  result = new Date(naive.getTime() - berlinOffsetMinutes(result) * 60_000);
  return result;
}
