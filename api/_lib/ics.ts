import type { CourseInfo, CourseSession, Lang } from "./courses.js";
import { meetUrlFor } from "./courses.js";

// Calendar file (.ics, RFC 5545) attached to the course confirmation: one
// event per booked session, each with a reminder 24 hours before. Times are
// written in UTC, so no VTIMEZONE block is needed and every calendar app
// shows them in the reader's own time zone.
//
// METHOD:PUBLISH (not REQUEST): it's a calendar entry to add, not a meeting
// invitation that expects a reply.

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Escaping for TEXT values (RFC 5545 §3.3.11).
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets are folded with CRLF + space (§3.1).
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = chunks.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, "utf8") > limit) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

export function buildCourseIcs(params: {
  bookingId: string;
  course: CourseInfo;
  sessions: CourseSession[];
  lang: Lang;
  contactEmail: string;
}): string {
  const { bookingId, course, sessions, lang, contactEmail } = params;
  const de = lang === "DE";
  const stamp = icsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Niramay//Courses//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const session of sessions) {
    const meetUrl = meetUrlFor(course, session);
    const title = course.sessions.length > 1 && !course.pickOne
      ? `${course[lang].title} (${session.label[lang]})`
      : course[lang].title;
    const description = [
      meetUrl
        ? `${de ? "Google-Meet-Link" : "Google Meet link"}: ${meetUrl}`
        : de ? "Den Google-Meet-Link senden wir Ihnen vor der Einheit per E-Mail." : "We'll email you the Google Meet link before the session.",
      de ? `Fragen: ${contactEmail}` : `Questions: ${contactEmail}`,
    ].join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${bookingId}-${session.id}@niramay.me`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(session.start)}`,
      `DTEND:${icsDate(session.end)}`,
      `SUMMARY:${icsText(title)}`,
      `DESCRIPTION:${icsText(description)}`,
      `LOCATION:${icsText(meetUrl || "Online")}`,
      ...(meetUrl ? [`URL:${meetUrl}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(title)}`,
      "TRIGGER:-PT24H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
