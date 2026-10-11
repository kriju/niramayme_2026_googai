import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./mailer.js";
import { HttpError, cleanText, clientKey, enforceRateLimit, requireJson } from "./engagement.js";
import { adminSubject, escapeHtml } from "./util.js";

// Withdrawal handling for consumer contracts (§§ 355, 356a BGB).
//
// 1. handleWithdrawal: the electronic "Vertrag widerrufen" function behind
//    the footer link (POST /api/withdraw, rewritten to notify-reiki-request.ts
//    via vercel.json because the Hobby plan caps a deployment at 12 functions).
//    It sends the sender an acknowledgement of receipt with the content and the
//    date/time of receipt on a durable medium (email), and notifies Richa.
//    Nothing is stored in Firestore; the two emails are the record.
// 2. withdrawalNoticeText: the information block appended to the booking
//    confirmation emails (§ 312f Abs. 2 BGB: confirmation of the contract on a
//    durable medium incl. the withdrawal information).
//
// LEGAL-REVIEW: the wording below mirrors src/legal/terms.ts (kept by hand, the
// api/ folder does not import from src/). If one is changed, change the other.
// LEGAL-REVIEW: § 356a Abs. 1 BGB wants the function labelled "Vertrag
// widerrufen" and a confirmation step labelled "Jetzt widerrufen" - both are
// used in the dialog (src/App.tsx WithdrawalModal). Have a lawyer check them.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_TO = process.env.REIKI_NOTIFY_EMAIL || "richa@niramay.me";

type Lang = "EN" | "DE";

export async function handleWithdrawal(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = requireJson(req);
    const name = cleanText(body.name, { multiline: false }).slice(0, 100);
    const email = cleanText(body.email, { multiline: false }).slice(0, 200);
    const contract = cleanText(body.contract, { multiline: true }).slice(0, 500);
    const address = cleanText(body.address, { multiline: true }).slice(0, 300);
    const lang: Lang = body.lang === "DE" ? "DE" : "EN";
    if (!name || !EMAIL_RE.test(email) || !contract) throw new HttpError(400, "invalid_request");

    const db = getAdminDb();
    // The acknowledgement goes to an address the visitor typed in, so cap how
    // often one client can trigger it.
    await enforceRateLimit(db, "withdraw", clientKey(req), 5, 3600);

    const receivedAt = new Intl.DateTimeFormat(lang === "DE" ? "de-DE" : "en-GB", {
      dateStyle: "long",
      timeStyle: "medium",
      timeZone: "Europe/Berlin",
    }).format(new Date());
    const de = lang === "DE";
    const lines = [
      `${de ? "Name" : "Name"}: ${name}`,
      `${de ? "E-Mail" : "Email"}: ${email}`,
      ...(address ? [`${de ? "Anschrift" : "Address"}: ${address}`] : []),
      `${de ? "Widerrufener Vertrag (Leistung, Buchungsdatum, Referenzcode)" : "Contract withdrawn from (service, booking date, reference code)"}: ${contract}`,
    ];
    const declaration = de
      ? "Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die oben genannte Dienstleistung."
      : "I hereby withdraw from the contract I concluded for the service named above.";

    // Acknowledgement of receipt to the consumer (§ 356a Abs. 2 BGB).
    const ackText = [
      de ? `Hallo ${name},` : `Hi ${name},`,
      de
        ? `wir bestätigen den Eingang Ihres Widerrufs am ${receivedAt} Uhr (deutsche Zeit). Dies ist die Bestätigung gemäß § 356a Abs. 2 BGB. Ihre Erklärung hatte folgenden Inhalt:`
        : `we confirm that we received your withdrawal on ${receivedAt} (German time). This is the acknowledgement of receipt pursuant to § 356a (2) BGB. Your declaration read:`,
      `${declaration}\n${lines.join("\n")}`,
      de
        ? "Wir melden uns zur Rückzahlung bereits geleisteter Zahlungen bei Ihnen. Bei Fragen antworten Sie einfach auf diese E-Mail."
        : "We will get back to you about refunding any payments already made. If you have questions, just reply to this email.",
      de ? "Herzliche Grüße,\nNiramay" : "Warmly,\nNiramay",
    ].join("\n\n");
    const ackHtml = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524">${ackText
      .split("\n\n")
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("")}</div>`;

    await sendEmail({
      to: ADMIN_TO,
      replyTo: email,
      subject: adminSubject(`WIDERRUF / withdrawal — ${name}`),
      text: `${declaration}\n\nReceived: ${receivedAt}\n${lines.join("\n")}`,
      html: `<div style="font-family:sans-serif"><p><b>Widerruf / withdrawal</b> (${escapeHtml(receivedAt)})</p><p>${escapeHtml(lines.join("\n")).replace(/\n/g, "<br/>")}</p></div>`,
      tag: "admin-withdrawal",
    });
    await sendEmail({
      to: email,
      replyTo: ADMIN_TO,
      subject: de ? "Eingangsbestätigung Ihres Widerrufs" : "Acknowledgement of your withdrawal",
      text: ackText,
      html: ackHtml,
      tag: "customer-withdrawal",
    });
    return res.status(200).json({ ok: true, receivedAt });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("withdrawal failed:", error);
    return res.status(500).json({ error: "Failed to send withdrawal" });
  }
}

/**
 * Withdrawal information + early-start confirmation for the booking
 * confirmation emails. `earlyStart` is the stored checkbox state.
 */
export function withdrawalNoticeText(lang: Lang, earlyStart: boolean): string {
  if (lang === "DE") {
    return [
      "Widerrufsbelehrung und Vertragsbedingungen",
      "Es gelten unsere AGB und die Widerrufsbelehrung, die Sie bei der Buchung bestätigt haben (beide jederzeit im Seitenfuß von www.niramay.me/de abrufbar). Zur Information fassen wir die Belehrung hier zusammen (Muster der Anlage 1 zu Art. 246a § 1 Abs. 2 S. 2 EGBGB):",
      "Widerrufsrecht: Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Niramay - Ganzheitliches Wohlbefinden, Ernst Kirchner Str 13/3, 73760 Ostfildern, richa@niramay.me, +49-15175315761) mittels einer eindeutigen Erklärung (z. B. Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren, oder die Funktion „Vertrag widerrufen“ im Seitenfuß unserer Website nutzen. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung vor Ablauf der Frist absenden.",
      "Folgen des Widerrufs: Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen. Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der vorgesehenen Dienstleistungen entspricht.",
      earlyStart
        ? "Ihr ausdrückliches Verlangen: Sie haben bei der Buchung verlangt, dass wir bereits vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und bestätigt, dass Sie bei vollständiger Vertragserfüllung durch uns Ihr Widerrufsrecht verlieren (§ 356 Abs. 4 BGB) und bei einem Widerruf nach Leistungsbeginn Wertersatz für die bis dahin erbrachten Leistungen schulden (§ 357a BGB)."
        : "Sie haben nicht verlangt, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen; wir beginnen daher erst nach Ablauf der Widerrufsfrist (14 Tage), sofern wir nichts anderes mit Ihnen vereinbaren.",
      "Muster-Widerrufsformular (zum Ausfüllen und Zurücksenden, wenn Sie widerrufen wollen):\n– An Niramay - Ganzheitliches Wohlbefinden, Ernst Kirchner Str 13/3, 73760 Ostfildern, richa@niramay.me:\n– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*):\n– Bestellt am (*) / erhalten am (*):\n– Name des/der Verbraucher(s):\n– Anschrift des/der Verbraucher(s):\n– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):\n– Datum:\n(*) Unzutreffendes streichen.",
    ].join("\n\n");
  }
  return [
    "Withdrawal information and terms",
    "Our terms and conditions (AGB) and the withdrawal information you confirmed when booking apply (both always available in the footer of www.niramay.me). For your information we summarise the withdrawal information here (model text of Annex 1 to Art. 246a § 1 (2) sentence 2 EGBGB, in translation; the German text prevails):",
    "Right of withdrawal: You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day of the conclusion of the contract. To exercise the right of withdrawal, you must inform us (Niramay - Holistic Wellbeing, Ernst Kirchner Str 13/3, 73760 Ostfildern, Germany, richa@niramay.me, +49-15175315761) of your decision to withdraw by means of a clear statement (e.g. a letter or email), or use the function “Withdraw from contract” in the footer of our website. To meet the deadline it is sufficient to send the notification before the period has expired.",
    "Effects of withdrawal: If you withdraw from this contract, we shall reimburse all payments received from you without undue delay and in any event within fourteen days. If you requested that the services begin during the withdrawal period, you shall pay us an amount proportionate to what has been provided until you informed us of the withdrawal, in comparison with the full coverage of the contract.",
    earlyStart
      ? "Your express request: when booking you requested that we begin the service before the withdrawal period expires and confirmed that you lose your right of withdrawal once we have fully performed the service (§ 356 (4) BGB) and owe compensation for services already provided if you withdraw after we began (§ 357a BGB)."
      : "You did not request that we begin the service before the withdrawal period expires; we will therefore begin only after the withdrawal period (14 days) has ended, unless we agree otherwise with you.",
    "Model withdrawal form (complete and return it only if you want to withdraw):\n– To Niramay - Holistic Wellbeing, Ernst Kirchner Str 13/3, 73760 Ostfildern, Germany, richa@niramay.me:\n– I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following service (*):\n– Ordered on (*) / received on (*):\n– Name of consumer(s):\n– Address of consumer(s):\n– Signature of consumer(s) (only if this form is notified on paper):\n– Date:\n(*) Delete as appropriate.",
  ].join("\n\n");
}

/** Appends the withdrawal information to an already rendered text + HTML email body. */
export function withNotice(body: { text: string; html: string }, lang: Lang, earlyStart: boolean): { text: string; html: string } {
  const notice = withdrawalNoticeText(lang, earlyStart);
  return {
    text: `${body.text}\n\n----\n\n${notice}`,
    html: body.html.replace(
      /\s*<\/div>\s*$/,
      `<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0"/><div style="white-space:pre-line;font-size:12px;color:#57534e">${escapeHtml(notice)}</div></div>`,
    ),
  };
}
