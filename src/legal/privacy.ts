import { ADDRESS, LEGAL_CONFIG, LEGAL_UPDATED, ownersLine, todo } from "./config";
import type { LegalDoc, LegalSection } from "./types";

// Privacy policy (Art. 13/14 GDPR). German = authoritative text, English =
// translation. Every statement below was checked against the code in this
// repository (api/, src/, firestore.rules, vercel.json) or against the
// provider's own documentation; where a fact could not be verified a
// "[TODO: ...]" marker or a LEGAL-REVIEW comment says so.
//
// Findings from the code review that shaped this text (see PR description):
//  - Hosting: Vercel (vercel.json, @vercel/* packages, api/ serverless
//    functions, Vercel Blob for media: api/blog-upload.ts). Database and
//    accounts: Google Firebase (Cloud Firestore + Firebase Authentication,
//    src/lib/firebase.ts, api/_lib/firebaseAdmin.ts). Email: Brevo with a
//    Gmail/Google Workspace fallback (api/_lib/mailer.ts).
//  - Google Analytics 4 is only loaded after consent (src/lib/analytics.ts).
//  - Vercel Web Analytics and Speed Insights load without consent
//    (src/main.tsx, src/App.tsx). Vercel documents Web Analytics as
//    cookieless. LEGAL-REVIEW: § 25 TDDDG / Art. 6(1)(f) - decide whether
//    these should also sit behind the cookie banner.
//  - Google Fonts (index.html) and the Google Maps iframe (footer) load on
//    every page view without consent. LEGAL-REVIEW: LG Muenchen I, judgment
//    of 20.01.2022 (3 O 17493/20), held that loading Google Fonts from
//    Google's servers without consent violates the GDPR. Recommended
//    follow-up: self-host the fonts (@fontsource) and load the map only after
//    a click. The text below describes the CURRENT behaviour accurately; adjust
//    section "Externe Inhalte" after the fix.
//  - Booking data is stored without automatic deletion (firestore.rules
//    denies client deletes; no TTL). The retention periods in config.ts are
//    therefore promises that need a manual (or automated) deletion routine.

// LEGAL-REVIEW: points a lawyer (or the owners) must confirm; none of them is
// shown to visitors, the corresponding statements in the text are written so
// they stay true either way:
//  1. GA4 event-data retention actually configured in the property (text says "at most 14 months").
//  2. Whether WhatsApp Business or the private WhatsApp app is used (section 8).
//  3. Whether session notes are kept, and where (section 10) - retention then applies.
//  4. That sessions are only recorded after express consent (section 13) - a
//     commitment, not something the code can verify.
//  5. The review form has no consent checkbox and a free "role/concern" field
//     that is shown publicly (section 14) - consider adding a checkbox.
//  6. Likes use a random id in localStorage (section 16): treated as "strictly
//     necessary" for a function the user requests; a lawyer should confirm.
//  7. Tracking pixels in transactional emails (section 18): Brevo offers an
//     account-level "anonymous tracking" option that was not changed here.
//  8. Photos (section 19): § 22/23 KUG exceptions and social-media publication.
//  9. DPF certifications of Google LLC, Zoom and Meta (section 22): check
//     dataprivacyframework.gov before publishing; Vercel's was verified on
//     vercel.com/legal/privacy-policy.
// 10. Retention periods (section 23): see LEGAL_CONFIG.retention; 8 years for
//     accounting vouchers applies from 1 Jan 2025 (§ 147 Abs. 3 AO, § 257 HGB).
// 11. Data processing agreements: Vercel's DPA is incorporated automatically;
//     confirm that the Google Workspace / Cloud data processing terms and the
//     Brevo DPA have been accepted in the respective admin consoles.
// 12. No data protection officer is named: confirm none is required
//     (Art. 37 GDPR / § 38 BDSG).

const R = LEGAL_CONFIG.retention;

const controllerDE = [ownersLine("DE"), ADDRESS.street, `${ADDRESS.postalCode} ${ADDRESS.city}`, ADDRESS.country.DE].join("\n");
const controllerEN = [ownersLine("EN"), ADDRESS.street, `${ADDRESS.postalCode} ${ADDRESS.city}`, ADDRESS.country.EN].join("\n");

// LEGAL-REVIEW: the Firestore database location is not stated anywhere in the
// repository. Fill in the region (ideally an EU region) once confirmed in the
// Firebase console; keep the TODO visible until then.
const firestoreRegionDE = todo("DE", "Standort/Region der Firestore-Datenbank in der Firebase-Konsole prüfen und hier eintragen", "");
const firestoreRegionEN = todo("EN", "", "check the Firestore database location/region in the Firebase console and enter it here");

// ---------------------------------------------------------------------------
// German (authoritative)
// ---------------------------------------------------------------------------
const sectionsDE: LegalSection[] = [
  {
    title: "1. Verantwortlicher",
    content: `Verantwortlich für die Datenverarbeitung auf dieser Website und für unsere Angebote ist:\n${controllerDE}\nE-Mail: ${LEGAL_CONFIG.email}\nTelefon: ${LEGAL_CONFIG.phone}\n\nBei Fragen zu Online-Kursen erreichen Sie uns auch unter ${LEGAL_CONFIG.courseEmail}.`,
    links: ["impressum"],
  },
  {
    title: "2. Überblick und Rechtsgrundlagen",
    content:
      "Wir verarbeiten personenbezogene Daten nur, soweit dies für den Betrieb dieser Website, zur Erbringung unserer Leistungen oder aufgrund Ihrer Einwilligung erforderlich ist. Die Rechtsgrundlagen sind:\n" +
      "• Art. 6 Abs. 1 lit. a DSGVO – Einwilligung (z. B. Google Analytics, Newsletter-Öffnungsmessung, Veröffentlichung von Fotos oder Bewertungen);\n" +
      "• Art. 9 Abs. 2 lit. a DSGVO – ausdrückliche Einwilligung in die Verarbeitung von Gesundheitsdaten (siehe Abschnitt 11);\n" +
      "• Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung und vorvertragliche Maßnahmen (Anfragen, Buchungen, Kurse, Sitzungen, Zahlungen);\n" +
      "• Art. 6 Abs. 1 lit. c DSGVO – rechtliche Verpflichtung (z. B. steuer- und handelsrechtliche Aufbewahrung nach § 147 AO und § 257 HGB);\n" +
      "• Art. 6 Abs. 1 lit. f DSGVO – berechtigte Interessen (z. B. sicherer und stabiler Betrieb der Website, Schutz vor Missbrauch und Spam, Rechtsverteidigung);\n" +
      "• § 25 TDDDG – Speichern von und Zugriff auf Informationen in Ihrem Endgerät (z. B. Cookies): nur mit Ihrer Einwilligung, es sei denn, der Zugriff ist unbedingt erforderlich, damit wir einen von Ihnen ausdrücklich gewünschten Dienst zur Verfügung stellen können (§ 25 Abs. 2 Nr. 2 TDDDG).\n\n" +
      "Wo Sie uns Daten nicht bereitstellen, können wir die jeweilige Leistung (z. B. eine Buchung) in der Regel nicht erbringen; die entsprechenden Pflichtfelder sind in den Formularen gekennzeichnet. Eine automatisierte Entscheidungsfindung einschließlich Profiling (Art. 22 DSGVO) findet nicht statt.",
  },
  {
    title: "3. Hosting, Server-Logfiles und Datenbank",
    content:
      "Hosting: Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA („Vercel“) betrieben. Vercel liefert die Website aus, führt unsere serverseitigen Funktionen aus (z. B. Versand von Bestätigungs-E-Mails, Newsletter-Anmeldung, Blog-Kommentare) und speichert die von uns hochgeladenen Bilder und Audiodateien (Vercel Blob).\n\n" +
      "Server-Logfiles: Bei jedem Aufruf der Website verarbeitet Vercel technisch notwendige Verbindungsdaten, insbesondere Ihre IP-Adresse, Datum und Uhrzeit, die aufgerufene URL, den Referrer sowie Browser- und Betriebssysteminformationen. Zweck: Auslieferung der Website, Gewährleistung von Sicherheit und Stabilität, Abwehr von Missbrauch. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren und effizienten Betrieb). Vercel speichert diese Daten nach eigenen Angaben nur so lange, wie es für seine Zwecke erforderlich ist; eine feste Frist nennt Vercel nicht.\n\n" +
      "Datenbank und Konten: Buchungs- und Anfragedaten, Bewertungen, Blog-Inhalte, Nachweise zu Newsletter-Einwilligungen und – falls Sie ein Konto anlegen – Ihre Kontodaten speichern wir in Google Firebase (Cloud Firestore und Firebase Authentication) der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (bzw. Google LLC, USA). Standort der Datenbank: " + firestoreRegionDE + ".\n\n" +
      "E-Mail-Postfächer: Eingehende Buchungs- und Anfrage-Benachrichtigungen sowie Ihre E-Mails an uns gehen in unsere Postfächer, die über Google Workspace (Google Ireland Limited) betrieben werden.\n\n" +
      "Mit Vercel und Google bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO. Zu Übermittlungen in die USA siehe Abschnitt 22.",
  },
  {
    title: "4. Cookies, lokaler Speicher und Cookie-Einstellungen",
    content:
      "Beim Besuch dieser Website speichern wir ohne Ihre Einwilligung nur Informationen, die für einen von Ihnen gewünschten Dienst unbedingt erforderlich sind (§ 25 Abs. 2 Nr. 2 TDDDG). Das sind im lokalen Speicher Ihres Browsers:\n" +
      "• niramay-cookie-consent: Ihre Cookie-Entscheidung (damit wir Sie nicht bei jedem Besuch erneut fragen);\n" +
      "• niramay-lang-choice: Ihre gewählte Sprache;\n" +
      "• niramay-announcement-dismissed: ob Sie den Hinweisbalken oben auf der Seite geschlossen haben;\n" +
      "• niramay:newsletter-signed-up: ob Sie sich auf diesem Gerät für den Newsletter angemeldet haben;\n" +
      "• eine zufällige Kennung für „Gefällt mir“-Bewertungen im Blog (siehe Abschnitt 16);\n" +
      "• wenn Sie sich in ein Konto einloggen: der Anmeldestatus von Firebase Authentication.\n" +
      "Diese Einträge bleiben, bis Sie sie in Ihrem Browser löschen oder (bei der Cookie-Entscheidung) hier ändern.\n\n" +
      "Google Analytics setzt nur nach Ihrer Einwilligung Cookies (siehe Abschnitt 5).\n\n" +
      "Cookie-Einstellungen: Ihre Entscheidung können Sie jederzeit so einfach ändern oder widerrufen, wie Sie sie erteilt haben: über den Link „Cookie-Einstellungen“ im Seitenfuß jeder Seite oder über die folgende Schaltfläche.",
    links: ["cookieSettings"],
  },
  {
    title: "5. Webanalyse mit Google Analytics 4 (nur mit Einwilligung)",
    content:
      "Mit Ihrer Einwilligung nutzen wir Google Analytics 4, einen Webanalysedienst der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland (in den USA: Google LLC). Google Analytics verwendet Cookies (z. B. „_ga“ und „_ga_<Kennung>“), um zu erfassen, welche Seiten aufgerufen werden und wie Besucher die Website nutzen. Wir verwenden Google Analytics nicht für Werbezwecke; Werbe-Funktionen und Personalisierung sind deaktiviert.\n\n" +
      "Google Analytics wird erst geladen, nachdem Sie im Cookie-Banner „Akzeptieren“ gewählt haben. Vorher werden weder das Analyse-Skript geladen noch Analyse-Cookies gesetzt. Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Empfänger: Google; Übermittlung in die USA auf Grundlage des EU-US Data Privacy Framework und von Standardvertragsklauseln (Abschnitt 22). Speicherdauer: Die Cookies bleiben bis zu zwei Jahre gespeichert; die Ereignisdaten werden in Google Analytics höchstens 14 Monate aufbewahrt.\n\n" +
      "Widerruf: Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie über „Cookie-Einstellungen“ (Seitenfuß oder Schaltfläche unten) „Ablehnen“ wählen. Dann wird die Messung sofort beendet und wir löschen die Google-Analytics-Cookies dieser Website in Ihrem Browser. Die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt.",
    links: ["cookieSettings"],
  },
  {
    title: "6. Reichweiten- und Leistungsmessung durch Vercel",
    content:
      "Wir setzen Vercel Web Analytics und Vercel Speed Insights der Vercel Inc. (Anschrift siehe Abschnitt 3) ein. Nach Angaben von Vercel arbeitet Web Analytics ohne Cookies: Besucher werden anonym über einen aus der Anfrage erzeugten Hash erkannt, der nach 24 Stunden verworfen wird. Erfasst werden u. a. Zeitpunkt, aufgerufene URL, Referrer, grobe Geolokalisierung (Land/Region/Stadt), Gerätetyp, Betriebssystem und Browser. Speed Insights erfasst technische Leistungskennzahlen (z. B. Ladezeiten) der Seitenaufrufe. Zweck: Reichweitenmessung in aggregierter Form und Verbesserung der Ladegeschwindigkeit. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Diese Dienste werden unabhängig von Ihrer Cookie-Auswahl geladen. Sie können dem widersprechen (Abschnitt 24).",
  },
  {
    title: "7. Externe Inhalte beim Seitenaufruf (Google Fonts, Google Maps)",
    content:
      "Schriftarten: Beim Aufruf der Website lädt Ihr Browser Schriftarten von Servern der Google Ireland Limited (fonts.googleapis.com, fonts.gstatic.com). Dabei erhält Google Ihre IP-Adresse und die Information, dass Sie diese Website besuchen.\n\n" +
      "Karte: Im Seitenfuß ist eine Google-Maps-Karte (maps.google.com) eingebettet, die Ihren Standort nicht abfragt. Beim Aufruf einer Seite überträgt Ihr Browser dafür Daten (insbesondere IP-Adresse) an Google; Google kann dabei eigene Cookies setzen oder auslesen.\n\n" +
      "Zweck: einheitliche Darstellung der Website und Anzeige unseres Standorts. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Übermittlung in die USA: siehe Abschnitt 22. Sie können dem widersprechen (Abschnitt 24).",
  },
  {
    title: "8. Kontaktaufnahme per E-Mail, Telefon und WhatsApp",
    content:
      "Wenn Sie uns per E-Mail, Telefon oder WhatsApp kontaktieren, verarbeiten wir Ihre Angaben (z. B. Name, E-Mail-Adresse bzw. Telefonnummer, Inhalt Ihrer Nachricht), um Ihre Anfrage zu beantworten und Termine abzustimmen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Anfrage zu einem Vertrag), im Übrigen Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: siehe Abschnitt 23.\n\n" +
      "WhatsApp: Auf der Website finden Sie Links (wa.me), die WhatsApp auf Ihrem Gerät öffnen, um uns eine Nachricht zu schreiben. Erst wenn Sie einen solchen Link anklicken, wird Ihr Browser mit WhatsApp verbunden und WhatsApp erhält z. B. Ihre IP-Adresse; beim bloßen Besuch der Website werden keine Daten an WhatsApp übertragen. Wenn Sie uns über WhatsApp schreiben, erhalten wir Ihre Telefonnummer, Ihren Profilnamen und Ihre Nachrichten. Die Nachrichteninhalte sind Ende-zu-Ende-verschlüsselt; WhatsApp (WhatsApp Ireland Limited, Merrion Road, Dublin 4, Irland, bzw. Meta Platforms, Inc., USA) verarbeitet Metadaten (z. B. wer wann mit wem kommuniziert) in eigener Verantwortung nach seinen Datenschutzbestimmungen. Bitte teilen Sie uns über WhatsApp nur so viele Gesundheitsinformationen mit, wie für Ihr Anliegen erforderlich sind; sicherer ist E-Mail.",
  },
  {
    title: "9. Terminbuchung über Google Kalender",
    content:
      "Wenn Sie über „Jetzt buchen“ oder im Rahmen einer Buchung einen Termin wählen, öffnet sich in einem Fenster die Terminbuchungsseite von Google Kalender (calendar.google.com). Sie wird erst geladen, wenn Sie dieses Fenster öffnen. Die Daten, die Sie dort eingeben (z. B. Name, E-Mail-Adresse, gewählter Termin, Anmerkungen), verarbeitet Google; wir erhalten sie in unserem Google-Konto. Zweck: Terminvereinbarung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Dabei kann Google Cookies setzen oder auslesen. Übermittlung in die USA: siehe Abschnitt 22. Alternativ können Sie Termine per E-Mail oder WhatsApp vereinbaren.\n" +
      "Hinweis: Auch die 15-minütige Kennenlern-Beratung sowie Einzelsitzungen (Yoga, Hypnotherapie, NLP, Heilung des Unterbewusstseins) werden auf diesem Weg oder per E-Mail/WhatsApp vereinbart.",
  },
  {
    title: "10. Anfragen und Buchungen über unsere Formulare",
    content:
      "Für jede Buchung bzw. Anfrage speichern wir die von Ihnen eingegebenen Daten sowie Sprache, Zeitpunkt, den Status Ihrer Zahlungsmeldung und Ihre Einwilligungen in unserer Datenbank (Google Firebase) und erhalten eine Benachrichtigung per E-Mail. Sie erhalten eine Bestätigungs-E-Mail mit einem Referenzcode. Den E-Mail-Versand übernimmt Brevo (Abschnitt 18). Zweck: Annahme und Durchführung Ihrer Buchung, Zuordnung Ihrer Zahlung, Kommunikation mit Ihnen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO; für Freitext mit Gesundheitsbezug Art. 9 Abs. 2 lit. a DSGVO (Abschnitt 11).\n\n" +
      "Im Einzelnen erheben wir:\n" +
      "• Reiki-Sitzungen (vor Ort und Fern-Reiki): gewähltes Paket, Name, E-Mail-Adresse, WhatsApp-Nummer und Ihre Angaben zu „Wofür benötigen Sie Reiki?“. Empfängerin der Benachrichtigung: Richa Kansal.\n" +
      "• Online-Kurse und Workshops (z. B. Yoga für Stress, Immunität & Schlaf; Yoga-Abenteuer für Kinder): Kurs, ggf. gewählter Termin, Name, E-Mail-Adresse, WhatsApp-Nummer und optionale Anmerkungen (z. B. Verletzungen, Gesundheitshinweise, bei Kinder-Workshops Name und Alter des Kindes). Empfänger der Benachrichtigung: Riju Kansal und Richa Kansal. Wir senden Ihnen den Meeting-Link per E-Mail.\n" +
      "• Vedische Astrologie, Tarot sowie Intuitive Begleitung & Seelenberatung: Name, Kontakt (E-Mail oder WhatsApp), bei Astrologie und Begleitung Geburtsort, Geburtsdatum und Geburtszeit, bei der Paarbegleitung zusätzlich Name und Geburtsdaten Ihres Partners bzw. Ihrer Partnerin, bei Tarot Ihre Frage. Empfänger der Benachrichtigung: Riju Kansal (und Richa Kansal). Bitte geben Sie Daten Ihres Partners bzw. Ihrer Partnerin nur an, wenn diese/r damit einverstanden ist.\n" +
      "• Hypnotherapie, NLP, Heilung des Unterbewusstseins und Einzelsitzungen in Yoga: Diese Termine vereinbaren Sie über Google Kalender (Abschnitt 9), E-Mail oder WhatsApp; wir verarbeiten Name, Kontaktdaten, Termin und die Angaben, die Sie uns zu Ihrem Anliegen machen. Soweit wir uns zu einer Sitzung Notizen machen, speichern wir diese nur im für die Sitzung erforderlichen Umfang und löschen sie nach Abschnitt 23.\n\n" +
      "Vertragsnachweise: Zusammen mit jeder Buchung speichern wir, dass Sie die AGB akzeptiert und die Widerrufsbelehrung zur Kenntnis genommen haben, ob Sie den vorzeitigen Leistungsbeginn verlangt haben, und die Version der damals gültigen Texte. Zweck: Nachweis des Vertragsschlusses und Ihrer Erklärungen (§§ 312j, 356 BGB). Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO; Speicherdauer wie Vertragsdaten (Abschnitt 23).\n\n" +
      "Widerruf über „Vertrag widerrufen“: Wenn Sie die Widerrufsfunktion im Seitenfuß nutzen, verarbeiten wir Ihren Namen, Ihre E-Mail-Adresse, Ihre Angaben zum Vertrag, ggf. Ihre Anschrift sowie Datum und Uhrzeit des Eingangs und senden Ihnen per E-Mail eine Eingangsbestätigung (Brevo, Abschnitt 18). Es erfolgt keine Speicherung in der Datenbank; die E-Mails dienen als Nachweis. Zur Missbrauchsabwehr wird ein nicht umkehrbarer Hash Ihrer IP-Adresse kurzzeitig zur Begrenzung der Anfragen gespeichert (wie in Abschnitt 16). Rechtsgrundlage: Art. 6 Abs. 1 lit. b und c DSGVO (§ 356a BGB).\n\n" +
      "Verwendete Dienstleister: Vercel (Abschnitt 3), Google Firebase (Abschnitt 3), Brevo (Abschnitt 18), unser E-Mail-Postfach über Google Workspace.",
  },
  {
    title: "11. Gesundheitsdaten – ausdrückliche Einwilligung (Art. 9 DSGVO)",
    content:
      "In die Freitextfelder unserer Formulare (z. B. „Wofür benötigen Sie Reiki?“, „Anmerkungen“, „Ihre Frage“) sowie in Gesprächen mit uns teilen Sie möglicherweise Informationen zu Ihrer Gesundheit mit (z. B. Beschwerden, Verletzungen, Erkrankungen, seelische Belastungen). Das sind „besondere Kategorien personenbezogener Daten“ nach Art. 9 DSGVO.\n\n" +
      "Solche Angaben verarbeiten wir ausschließlich auf Grundlage Ihrer ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), die Sie vor dem Absenden des Formulars durch Ankreuzen des Kästchens erteilen. Die Einwilligung ist freiwillig. Sie entscheiden selbst, wie konkret Sie Ihr Anliegen beschreiben; ohne konkrete Gesundheitsangaben können wir Ihre Buchung in der Regel trotzdem annehmen. Sie können die Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie uns eine E-Mail an " + LEGAL_CONFIG.email + " schreiben; die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt. Im Fall des Widerrufs löschen wir die betreffenden Angaben, soweit keine gesetzliche Pflicht entgegensteht.\n\n" +
      "Unsere Angebote ersetzen keine ärztliche oder psychotherapeutische Behandlung.",
  },
  {
    title: "12. Zahlungen (PayPal, SEPA-Überweisung, UPI)",
    content:
      "Zahlungen erfolgen per PayPal, SEPA-Überweisung oder – für Beträge in indischen Rupien – per UPI. Auf unserer Website wird keine Zahlung abgewickelt und es werden keine Skripte von Zahlungsdienstleistern geladen; wir zeigen Ihnen lediglich unsere Zahlungsdaten (PayPal-Adresse, IBAN/BIC, UPI-ID) und Ihren Referenzcode an. Mit „Ich habe bezahlt“ speichern wir nur die Angabe, dass Sie gezahlt haben.\n\n" +
      "Bei der Zahlung erhalten wir über Ihren Zahlungsdienstleister bzw. Ihre Bank die Zahlungsdaten (z. B. Name, Betrag, Verwendungszweck/Referenzcode, bei Überweisung Ihre IBAN, bei PayPal Ihre PayPal-E-Mail-Adresse). Zahlungsdienstleister sind PayPal (Europe) S.à r.l. et Cie, S.C.A., 22–24 Boulevard Royal, L-2449 Luxemburg, Ihre und unsere Bank sowie bei UPI die beteiligten indischen Zahlungsdienstleister; sie verarbeiten Ihre Daten in eigener Verantwortung nach ihren Datenschutzbestimmungen. Bei UPI-Zahlungen werden Daten im indischen Zahlungssystem verarbeitet; diese Übermittlung erfolgt auf Ihre Veranlassung zur Vertragserfüllung (Art. 49 Abs. 1 lit. b DSGVO).\n\n" +
      "Zweck: Abwicklung und Zuordnung der Zahlung, Buchführung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO; für die Buchführung Art. 6 Abs. 1 lit. c DSGVO i. V. m. § 147 AO, § 257 HGB. Aufbewahrung: siehe Abschnitt 23.",
  },
  {
    title: "13. Online-Sitzungen (Google Meet, Zoom)",
    content:
      "Online-Sitzungen, Kurse und Lesungen führen wir über Google Meet (Google Ireland Limited / Google LLC) oder Zoom (Zoom Video Communications, Inc., 55 Almaden Boulevard, San Jose, CA 95113, USA) durch. Den Meeting-Link senden wir Ihnen per E-Mail, in der Regel einen Tag vor dem Termin. Der jeweilige Anbieter verarbeitet dabei Verbindungsdaten (z. B. IP-Adresse, Geräteinformationen), die Angaben, die Sie zur Teilnahme machen (z. B. Name), sowie Bild und Ton während der Sitzung. Wir zeichnen Sitzungen nur auf, wenn Sie vorher ausdrücklich eingewilligt haben.\n\n" +
      "Zweck: Durchführung der vereinbarten Leistung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Übermittlung in die USA: siehe Abschnitt 22. Die Anbieter verarbeiten Daten teils in eigener Verantwortung; es gelten deren Datenschutzbestimmungen.",
  },
  {
    title: "14. Bewertungen",
    content:
      "Wenn Sie eine Bewertung abgeben, speichern wir Ihren Namen, Ihre Sternebewertung, die Kategorie, Ihre optionale Angabe zum Anliegen, Ihren Text, die Sprache und den Zeitpunkt. Eine Bewertung wird erst nach unserer Freigabe öffentlich angezeigt, mit dem von Ihnen angegebenen Namen. Bewertungen, die uns Kundinnen und Kunden zur Veröffentlichung überlassen haben (z. B. über Google oder Facebook), zeigen wir nur mit deren Einverständnis. Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie durch das freiwillige Absenden erteilen. Bitte nennen Sie in Bewertungen keine Gesundheitsangaben. Sie können die Entfernung Ihrer Bewertung jederzeit verlangen.",
  },
  {
    title: "15. Benutzerkonto",
    content:
      "Wenn Sie ein Benutzerkonto anlegen, speichern wir Ihren Namen, Ihre E-Mail-Adresse und Ihr Passwort (als Hashwert) bei Google Firebase Authentication sowie Ihr Profil (Name, E-Mail-Adresse, Anlagezeitpunkt) in unserer Datenbank. Das Konto dient dazu, Formulare mit Ihren Angaben vorauszufüllen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Sie können Ihr Konto jederzeit löschen lassen (E-Mail an " + LEGAL_CONFIG.email + ").",
  },
  {
    title: "16. Blog: Kommentare, Bewertungen und Teilen",
    content:
      "Wenn Sie einen Blogbeitrag kommentieren, speichern wir Ihren Kommentar, den Zeitpunkt und – sofern Sie nicht anonym kommentieren – den eingegebenen Namen. Kommentare werden auf dieser Website veröffentlicht; Kommentare mit Links halten wir zur Prüfung zurück. Eine E-Mail-Adresse ist nicht erforderlich. Wir erhalten zu jedem Kommentar eine Benachrichtigung per E-Mail. Zum Schutz vor Spam und Missbrauch wird ein nicht umkehrbarer, mit einem geheimen Schlüssel erzeugter Hash Ihrer IP-Adresse kurzzeitig zur Begrenzung der Anfragen gespeichert und nach Ablauf des Zeitfensters automatisch gelöscht; er wird nie mit Ihrem Kommentar gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Betrieb der Kommentarfunktion, Missbrauchsschutz).\n\n" +
      "„Gefällt mir“/„Gefällt mir nicht“-Bewertungen werden über eine zufällige Kennung im lokalen Speicher Ihres Browsers gezählt, die nicht mit Ihrer Person verknüpft ist (Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO, § 25 Abs. 2 Nr. 2 TDDDG).\n\n" +
      "Die Teilen-Schaltflächen sind einfache Links: Es werden keine Skripte sozialer Netzwerke geladen, und es werden keine Daten an ein soziales Netzwerk übermittelt, solange Sie keine davon anklicken. Dasselbe gilt für die Links zu unseren Profilen bei Instagram, Facebook und YouTube im Seitenfuß.\n\n" +
      "Zur Entfernung eines Kommentars schreiben Sie an " + LEGAL_CONFIG.email + ".",
  },
  {
    title: "17. Blog-Newsletter",
    content:
      "Wenn Sie neue Blogartikel abonnieren, erfassen wir Ihre E-Mail-Adresse, Ihre bevorzugte Sprache und die Seite, auf der Sie sich angemeldet haben. Sie werden erst in den Verteiler aufgenommen, nachdem Sie auf den Link in der Bestätigungs-E-Mail geklickt haben (Double-Opt-in). Um Ihre Einwilligung nachweisen zu können, speichern wir den Zeitpunkt Ihrer Anmeldung und Ihrer Bestätigung sowie den Wortlaut der Einwilligung. Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO); die Nachweisspeicherung beruht auf Art. 6 Abs. 1 lit. c und f DSGVO (Art. 7 Abs. 1 DSGVO).\n\n" +
      "Wir nutzen Ihre Adresse ausschließlich, um Sie über neue Blogartikel zu informieren. Öffnungs- und Klickmessung: Unser Versanddienstleister Brevo erfasst, ob und wann Sie eine Newsletter-E-Mail öffnen und welche Links Sie anklicken. Das lässt sich in unserem Brevo-Konto nicht für einzelne Sendungen abschalten. Mit Ihrer Anmeldung willigen Sie daher ausdrücklich auch in diese Messung ein (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG); die Auswertung dient dazu, die E-Mails zu verbessern. Wenn Sie das nicht möchten, melden Sie sich bitte nicht an bzw. widerrufen Sie Ihre Einwilligung.\n\n" +
      "Widerruf: Sie können sich jederzeit über den Link in jeder E-Mail oder per Nachricht an " + LEGAL_CONFIG.email + " abmelden; Ihre Adresse wird dann nicht mehr für den Newsletter verwendet. Nie bestätigte Anmeldungen werden nach 30 Tagen automatisch gelöscht. Den Nachweis Ihrer Einwilligung bewahren wir auch nach der Abmeldung bis zum Ablauf der Verjährungsfrist auf (Abschnitt 23).",
  },
  {
    title: "18. E-Mail-Versand (Brevo)",
    content:
      "Der Newsletter und die automatischen E-Mails dieser Website (z. B. Buchungs- und Anfragebestätigungen, Bestätigung der Newsletter-Anmeldung) werden über Brevo versendet, einen Dienst der Sendinblue SAS (Paris, Frankreich). Brevo verarbeitet E-Mail-Adressen und E-Mail-Inhalte in unserem Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags nach Art. 28 DSGVO auf Servern in der EU. Brevo erfasst, ob eine E-Mail zugestellt, geöffnet oder abgewiesen wurde und welche Links angeklickt wurden; das lässt sich für Bestätigungs-E-Mails nicht abschalten und dient dem zuverlässigen Versand (Art. 6 Abs. 1 lit. f DSGVO). Fällt Brevo aus, versenden wir die E-Mail ersatzweise über unser Google-Workspace-Postfach. Einzelheiten: https://www.brevo.com/legal/privacypolicy/.",
  },
  {
    title: "19. Foto- und Videoaufnahmen bei Veranstaltungen",
    content:
      "Bei unseren Workshops, Kursen und Gemeinschaftsveranstaltungen (z. B. Internationaler Tag des Yoga) machen wir gelegentlich Fotos, die wir auf dieser Website und in unseren Social-Media-Kanälen zeigen. Erkennbare Personen veröffentlichen wir nur mit ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 22 KUG, soweit anwendbar). Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden (E-Mail an " + LEGAL_CONFIG.email + "); wir entfernen das Foto dann zeitnah von unseren Kanälen. Bei Minderjährigen ist die Einwilligung der Erziehungsberechtigten erforderlich.",
  },
  {
    title: "20. Kinder und Jugendliche",
    content:
      "Unsere Angebote für Kinder (z. B. der Online-Workshop „Yoga-Abenteuer“ für 9- bis 14-Jährige) werden von einem Elternteil bzw. Erziehungsberechtigten gebucht. Daten Ihres Kindes (z. B. Name, Alter, Gesundheitshinweise) geben Sie als Erziehungsberechtigte/r an; Einwilligungen – auch nach Art. 9 DSGVO – erteilen Sie für Ihr Kind als gesetzliche/r Vertreter/in. Diese Website richtet sich nicht an Kinder; bitte lassen Sie Kinder keine Formulare selbst ausfüllen.",
  },
  {
    title: "21. Empfänger und Auftragsverarbeiter",
    content:
      "Empfänger Ihrer Daten sind, je nach Nutzung: wir selbst (Richa Kansal, bei Kursen auch Riju Kansal); unsere Dienstleister als Auftragsverarbeiter – Vercel Inc. (Hosting), Google Ireland Limited/Google LLC (Firebase, Google Workspace, Google Kalender, Google Meet, ggf. Google Analytics), Brevo/Sendinblue SAS (E-Mail-Versand); Zoom Video Communications, Inc. (Online-Sitzungen); die genannten Zahlungsdienstleister und Banken; WhatsApp (als eigener Verantwortlicher); Behörden, Steuerberater oder Gerichte, soweit wir gesetzlich dazu verpflichtet sind oder dies zur Rechtsverfolgung erforderlich ist. Darüber hinaus geben wir Ihre Daten nicht an Dritte weiter.",
  },
  {
    title: "22. Übermittlung in Drittländer",
    content:
      "Einige der genannten Dienstleister haben ihren Sitz in den USA oder verarbeiten Daten dort (Vercel, Google LLC, Zoom, Meta/WhatsApp). Die Übermittlung stützen wir auf den Angemessenheitsbeschluss der EU-Kommission zum EU-US Data Privacy Framework (Durchführungsbeschluss (EU) 2023/1795), soweit der Empfänger danach zertifiziert ist (nach eigener Angabe u. a. Vercel), sowie ergänzend auf Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c DSGVO), die Bestandteil der Auftragsverarbeitungsverträge sind (z. B. Vercel). Zahlungen per UPI: Art. 49 Abs. 1 lit. b DSGVO (siehe Abschnitt 12). Eine Kopie der Garantien erhalten Sie auf Anfrage unter " + LEGAL_CONFIG.email + ".",
  },
  {
    title: "23. Speicherdauer",
    content:
      "Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder eine gesetzliche Pflicht besteht. Konkret:\n" +
      `• Server-Logfiles, Reichweitenmessung: nach den Vorgaben von Vercel (Abschnitt 3 und 6); Google Analytics: höchstens 14 Monate (Abschnitt 5).\n` +
      `• Anfragen und Buchungen, die nicht zu einem Vertrag führen: Löschung spätestens ${R.unansweredInquiryMonths} Monate nach Abschluss der Anfrage.\n` +
      `• Vertragsdaten (Buchung, Kontaktdaten, Korrespondenz): bis zum Ablauf der gesetzlichen Verjährungsfrist von ${R.limitationYears} Jahren (§§ 195, 199 BGB), gerechnet ab dem Ende des Jahres, in dem die Leistung erbracht wurde, soweit nicht längere gesetzliche Aufbewahrungsfristen gelten (Art. 6 Abs. 1 lit. f DSGVO: Abwehr von Ansprüchen).\n` +
      `• Gesundheitsbezogene Freitextangaben: Wir löschen sie, sobald sie für die Durchführung der Leistung nicht mehr erforderlich sind, spätestens ${R.healthFreeTextMonths} Monate nach Abschluss der Leistung.\n` +
      `• Rechnungen, Zahlungs- und Buchungsbelege: ${R.accountingVoucherYears} Jahre; Handels- und Geschäftsbriefe: ${R.businessLetterYears} Jahre (§ 147 AO, § 257 HGB); die Frist beginnt mit dem Ende des Kalenderjahres, in dem der Beleg entstanden ist.\n` +
      "• Newsletter: bis zu Ihrer Abmeldung; nicht bestätigte Anmeldungen 30 Tage; Einwilligungsnachweis bis zum Ablauf der Verjährungsfrist.\n" +
      "• Blog-Kommentare und Bewertungen: bis Sie die Entfernung verlangen oder der Beitrag entfernt wird; Hash-Werte zur Anfragenbegrenzung: nur für kurze Zeit (wenige Tage).\n" +
      "• Benutzerkonto: bis Sie die Löschung verlangen.\n" +
      "• Fotos: bis zum Widerruf Ihrer Einwilligung bzw. solange sie für den Zweck der Veröffentlichung erforderlich sind.\n" +
      "Nach Ablauf der Fristen löschen wir die Daten oder schränken ihre Verarbeitung ein, wenn Aufbewahrungspflichten entgegenstehen.",
  },
  {
    title: "24. Ihre Rechte",
    content:
      "Sie haben gegenüber uns folgende Rechte hinsichtlich Ihrer personenbezogenen Daten:\n" +
      "• Auskunft (Art. 15 DSGVO),\n• Berichtigung (Art. 16 DSGVO),\n• Löschung (Art. 17 DSGVO),\n• Einschränkung der Verarbeitung (Art. 18 DSGVO),\n• Datenübertragbarkeit (Art. 20 DSGVO),\n• Widerspruch (Art. 21 DSGVO),\n• Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).\n\n" +
      "Widerspruchsrecht (Art. 21 DSGVO): Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 Abs. 1 lit. f DSGVO erfolgt, Widerspruch einzulegen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die Ihre Interessen überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.\n\n" +
      "Zur Ausübung Ihrer Rechte genügt eine E-Mail an " + LEGAL_CONFIG.email + ". Einwilligungen in Google Analytics können Sie jederzeit über die „Cookie-Einstellungen“ widerrufen.\n\n" +
      "Beschwerderecht (Art. 77 DSGVO): Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Für uns zuständig ist:\nDer Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nHeilbronner Straße 35, 70191 Stuttgart\nPostfach 10 29 32, 70025 Stuttgart\nTelefon: 0711 / 61 55 41-0\nE-Mail: poststelle@lfdi.bwl.de\nInternet: https://www.baden-wuerttemberg.datenschutz.de\nSie können sich auch an die Aufsichtsbehörde an Ihrem Wohnort oder am Ort des mutmaßlichen Verstoßes wenden.",
  },
  {
    title: "25. Änderungen dieser Erklärung",
    content: `Wir passen diese Datenschutzerklärung an, wenn sich unsere Angebote oder die Rechtslage ändern. Stand: ${LEGAL_UPDATED.DE}.`,
  },
];

// ---------------------------------------------------------------------------
// English (translation of the German text)
// ---------------------------------------------------------------------------
const sectionsEN: LegalSection[] = [
  {
    title: "1. Controller",
    content: `The controller for data processing on this website and for our services is:\n${controllerEN}\nEmail: ${LEGAL_CONFIG.email}\nPhone: ${LEGAL_CONFIG.phone}\n\nFor questions about online courses you can also reach us at ${LEGAL_CONFIG.courseEmail}.`,
    links: ["impressum"],
  },
  {
    title: "2. Overview and legal bases",
    content:
      "We process personal data only to the extent necessary to operate this website, to provide our services, or on the basis of your consent. The legal bases are:\n" +
      "• Art. 6(1)(a) GDPR – consent (e.g. Google Analytics, newsletter open tracking, publication of photos or reviews);\n" +
      "• Art. 9(2)(a) GDPR – explicit consent to the processing of health data (see section 11);\n" +
      "• Art. 6(1)(b) GDPR – performance of a contract and pre-contractual steps (enquiries, bookings, courses, sessions, payments);\n" +
      "• Art. 6(1)(c) GDPR – legal obligation (e.g. retention under tax and commercial law, § 147 AO and § 257 HGB);\n" +
      "• Art. 6(1)(f) GDPR – legitimate interests (e.g. secure and stable operation of the website, protection against abuse and spam, defence of legal claims);\n" +
      "• § 25 TDDDG – storing information on, or accessing information from, your device (e.g. cookies): only with your consent, unless the access is strictly necessary for us to provide a service you expressly requested (§ 25(2) no. 2 TDDDG).\n\n" +
      "If you do not provide data, we are usually unable to provide the respective service (e.g. a booking); required fields are marked in the forms. There is no automated decision-making, including profiling (Art. 22 GDPR).",
  },
  {
    title: "3. Hosting, server log files and database",
    content:
      "Hosting: This website is operated by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA (“Vercel”). Vercel delivers the website, runs our server-side functions (e.g. sending confirmation emails, newsletter sign-up, blog comments) and stores the images and audio files we upload (Vercel Blob).\n\n" +
      "Server log files: Each time the website is accessed, Vercel processes technically necessary connection data, in particular your IP address, date and time, the requested URL, the referrer and browser and operating-system information. Purpose: delivering the website, ensuring security and stability, preventing abuse. Legal basis: Art. 6(1)(f) GDPR (legitimate interest in secure and efficient operation). According to Vercel, it keeps this data only as long as necessary for its purposes; Vercel does not state a fixed period.\n\n" +
      "Database and accounts: We store booking and enquiry data, reviews, blog content, proof of newsletter consent and – if you create an account – your account data in Google Firebase (Cloud Firestore and Firebase Authentication) provided by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (or Google LLC, USA). Database location: " + firestoreRegionEN + ".\n\n" +
      "Email mailboxes: Booking and enquiry notifications and your emails to us arrive in our mailboxes, which are operated through Google Workspace (Google Ireland Limited).\n\n" +
      "Data processing agreements under Art. 28 GDPR are in place with Vercel and Google. For transfers to the USA see section 22.",
  },
  {
    title: "4. Cookies, local storage and cookie settings",
    content:
      "When you visit this website, we store without your consent only information that is strictly necessary for a service you requested (§ 25(2) no. 2 TDDDG). In your browser's local storage these are:\n" +
      "• niramay-cookie-consent: your cookie choice (so we do not ask you on every visit);\n" +
      "• niramay-lang-choice: your chosen language;\n" +
      "• niramay-announcement-dismissed: whether you closed the notice bar at the top of the page;\n" +
      "• niramay:newsletter-signed-up: whether you signed up for the newsletter on this device;\n" +
      "• a random identifier for blog likes (see section 16);\n" +
      "• if you log in to an account: the sign-in state of Firebase Authentication.\n" +
      "These entries stay until you delete them in your browser or (for the cookie choice) change it here.\n\n" +
      "Google Analytics sets cookies only after your consent (see section 5).\n\n" +
      "Cookie settings: You can change or withdraw your choice at any time as easily as you gave it: via the “Cookie settings” link in the footer of every page or via the button below.",
    links: ["cookieSettings"],
  },
  {
    title: "5. Web analytics with Google Analytics 4 (only with consent)",
    content:
      "With your consent we use Google Analytics 4, a web analytics service provided by Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (in the USA: Google LLC). Google Analytics uses cookies (e.g. “_ga” and “_ga_<ID>”) to record which pages are viewed and how visitors use the website. We do not use Google Analytics for advertising; advertising features and personalisation are disabled.\n\n" +
      "Google Analytics is loaded only after you choose “Accept” in the cookie banner. Before that, neither the analytics script is loaded nor are analytics cookies set. Legal basis: your consent (Art. 6(1)(a) GDPR, § 25(1) TDDDG). Recipient: Google; transfer to the USA based on the EU-US Data Privacy Framework and standard contractual clauses (section 22). Storage period: the cookies remain for up to two years; event data is kept in Google Analytics for at most 14 months.\n\n" +
      "Withdrawal: You can withdraw your consent at any time with effect for the future by choosing “Decline” under “Cookie settings” (footer or button below). Measurement then stops immediately and we delete this website's Google Analytics cookies in your browser. The lawfulness of the processing carried out until then is not affected.",
    links: ["cookieSettings"],
  },
  {
    title: "6. Reach and performance measurement by Vercel",
    content:
      "We use Vercel Web Analytics and Vercel Speed Insights provided by Vercel Inc. (address: see section 3). According to Vercel, Web Analytics works without cookies: visitors are recognised anonymously by a hash generated from the request, which is discarded after 24 hours. Recorded data include, among others, time, requested URL, referrer, approximate geolocation (country/region/city), device type, operating system and browser. Speed Insights records technical performance metrics (e.g. load times) of page views. Purpose: aggregated reach measurement and improving loading speed. Legal basis: Art. 6(1)(f) GDPR. These services are loaded regardless of your cookie choice. You can object (section 24).",
  },
  {
    title: "7. External content when a page is loaded (Google Fonts, Google Maps)",
    content:
      "Fonts: When the website is accessed, your browser loads fonts from servers of Google Ireland Limited (fonts.googleapis.com, fonts.gstatic.com). Google thereby receives your IP address and the information that you are visiting this website.\n\n" +
      "Map: A Google Maps map (maps.google.com) is embedded in the footer; it does not ask for your location. When a page is loaded, your browser transmits data (in particular your IP address) to Google for this purpose; Google may set or read its own cookies.\n\n" +
      "Purpose: consistent presentation of the website and showing our location. Legal basis: Art. 6(1)(f) GDPR. Transfer to the USA: see section 22. You can object (section 24).",
  },
  {
    title: "8. Contact by email, phone and WhatsApp",
    content:
      "If you contact us by email, phone or WhatsApp, we process your details (e.g. name, email address or phone number, content of your message) to answer your enquiry and arrange appointments. Legal basis: Art. 6(1)(b) GDPR (enquiry about a contract), otherwise Art. 6(1)(f) GDPR. Storage period: see section 23.\n\n" +
      "WhatsApp: The website contains links (wa.me) that open WhatsApp on your device so you can message us. Only when you click such a link is your browser connected to WhatsApp, and WhatsApp receives e.g. your IP address; merely visiting the website does not transmit any data to WhatsApp. If you write to us via WhatsApp, we receive your phone number, your profile name and your messages. Message content is end-to-end encrypted; WhatsApp (WhatsApp Ireland Limited, Merrion Road, Dublin 4, Ireland, or Meta Platforms, Inc., USA) processes metadata (e.g. who communicates with whom and when) as an independent controller under its own privacy terms. Please share only as much health information via WhatsApp as is necessary for your request; email is more secure.",
  },
  {
    title: "9. Appointment booking via Google Calendar",
    content:
      "If you choose an appointment via “Book now” or as part of a booking, the Google Calendar appointment-scheduling page (calendar.google.com) opens in a window. It is loaded only when you open this window. Google processes the data you enter there (e.g. name, email address, chosen appointment, notes); we receive it in our Google account. Purpose: scheduling appointments. Legal basis: Art. 6(1)(b) GDPR. Google may set or read cookies. Transfer to the USA: see section 22. Alternatively you can arrange appointments by email or WhatsApp.\n" +
      "Note: the 15-minute introductory call and one-to-one sessions (yoga, hypnotherapy, NLP, subconscious healing) are also arranged this way or by email/WhatsApp.",
  },
  {
    title: "10. Enquiries and bookings through our forms",
    content:
      "For every booking or enquiry we store the data you enter, plus language, time, the status of your payment notice and your consents in our database (Google Firebase) and receive an email notification. You receive a confirmation email with a reference code. Brevo sends the emails (section 18). Purpose: accepting and fulfilling your booking, matching your payment, communicating with you. Legal basis: Art. 6(1)(b) GDPR; for free text relating to health Art. 9(2)(a) GDPR (section 11).\n\n" +
      "In detail we collect:\n" +
      "• Reiki sessions (in person and distance Reiki): chosen package, name, email address, WhatsApp number and your answer to “What do you need Reiki for?”. Recipient of the notification: Richa Kansal.\n" +
      "• Online courses and workshops (e.g. Yoga for Stress, Immunity & Sleep; Yoga Adventure for kids): course, chosen date if applicable, name, email address, WhatsApp number and optional notes (e.g. injuries, health conditions, for children's workshops your child's name and age). Recipients of the notification: Riju Kansal and Richa Kansal. We email you the meeting link.\n" +
      "• Vedic astrology, tarot and Intuitive Guidance & Soul Counseling: name, contact (email or WhatsApp), for astrology and guidance place, date and time of birth, for couple guidance also your partner's name and birth details, for tarot your question. Recipient of the notification: Riju Kansal (and Richa Kansal). Please provide your partner's details only if they agree.\n" +
      "• Hypnotherapy, NLP, subconscious healing and one-to-one yoga sessions: you arrange these via Google Calendar (section 9), email or WhatsApp; we process name, contact details, appointment and what you tell us about your concern. If we take notes of a session, we keep them only to the extent needed for the session and delete them according to section 23.\n\n" +
      "Contract records: with every booking we store that you accepted the terms (AGB) and took note of the withdrawal information, whether you requested the service to begin early, and the version of the texts in force at the time. Purpose: proof of the conclusion of the contract and of your declarations (§§ 312j, 356 BGB). Legal basis: Art. 6(1)(b) and (c) GDPR; storage period as for contract data (section 23).\n\n" +
      "Withdrawal via “Withdraw from contract”: if you use the withdrawal function in the footer we process your name, email address, your details of the contract, your address if given, and the date and time of receipt, and email you an acknowledgement of receipt (Brevo, section 18). Nothing is stored in the database; the emails serve as proof. To prevent abuse, a non-reversible hash of your IP address is briefly stored to limit requests (as in section 16). Legal basis: Art. 6(1)(b) and (c) GDPR (§ 356a BGB).\n\n" +
      "Service providers used: Vercel (section 3), Google Firebase (section 3), Brevo (section 18), our mailbox via Google Workspace.",
  },
  {
    title: "11. Health data – explicit consent (Art. 9 GDPR)",
    content:
      "In the free-text fields of our forms (e.g. “What do you need Reiki for?”, “Notes”, “Your question”) and in conversations with us, you may share information about your health (e.g. complaints, injuries, illnesses, emotional distress). This is a “special category of personal data” under Art. 9 GDPR.\n\n" +
      "We process such information exclusively on the basis of your explicit consent (Art. 9(2)(a) GDPR), which you give before submitting the form by ticking the checkbox. Consent is voluntary. You decide how specifically you describe your concern; even without specific health details we can usually still accept your booking. You can withdraw your consent at any time with effect for the future by emailing " + LEGAL_CONFIG.email + "; the lawfulness of the processing carried out until then is not affected. If you withdraw, we delete the information concerned unless a legal obligation prevents this.\n\n" +
      "Our services do not replace medical or psychotherapeutic treatment.",
  },
  {
    title: "12. Payments (PayPal, SEPA bank transfer, UPI)",
    content:
      "Payments are made by PayPal, SEPA bank transfer or – for amounts in Indian rupees – UPI. No payment is processed on our website and no scripts of payment providers are loaded; we only show our payment details (PayPal address, IBAN/BIC, UPI ID) and your reference code. With “I've paid” we only store the statement that you have paid.\n\n" +
      "When you pay, we receive the payment data through your payment provider or bank (e.g. name, amount, payment reference/reference code, for bank transfers your IBAN, for PayPal your PayPal email address). Payment providers are PayPal (Europe) S.à r.l. et Cie, S.C.A., 22–24 Boulevard Royal, L-2449 Luxembourg, your and our bank and, for UPI, the Indian payment providers involved; they process your data as independent controllers under their own privacy terms. For UPI payments, data is processed in the Indian payment system; this transfer takes place at your request for the performance of the contract (Art. 49(1)(b) GDPR).\n\n" +
      "Purpose: processing and matching the payment, bookkeeping. Legal basis: Art. 6(1)(b) GDPR; for bookkeeping Art. 6(1)(c) GDPR in conjunction with § 147 AO, § 257 HGB. Retention: see section 23.",
  },
  {
    title: "13. Online sessions (Google Meet, Zoom)",
    content:
      "We hold online sessions, courses and readings via Google Meet (Google Ireland Limited / Google LLC) or Zoom (Zoom Video Communications, Inc., 55 Almaden Boulevard, San Jose, CA 95113, USA). We email you the meeting link, usually one day before the appointment. The provider processes connection data (e.g. IP address, device information), the details you give to join (e.g. name) and picture and sound during the session. We record sessions only if you have expressly consented beforehand.\n\n" +
      "Purpose: carrying out the agreed service. Legal basis: Art. 6(1)(b) GDPR. Transfer to the USA: see section 22. The providers partly process data as independent controllers; their privacy terms apply.",
  },
  {
    title: "14. Reviews",
    content:
      "If you submit a review, we store your name, star rating, category, your optional note on your concern, your text, language and time. A review is shown publicly only after we approve it, under the name you entered. We show reviews that clients gave us for publication (e.g. via Google or Facebook) only with their agreement. Legal basis: your consent (Art. 6(1)(a) GDPR), which you give by voluntarily submitting the review. Please do not include health information in reviews. You can ask for your review to be removed at any time.",
  },
  {
    title: "15. User account",
    content:
      "If you create a user account, we store your name, email address and password (as a hash) with Google Firebase Authentication, and your profile (name, email address, time of creation) in our database. The account is used to pre-fill forms with your details. Legal basis: Art. 6(1)(b) GDPR. You can have your account deleted at any time (email to " + LEGAL_CONFIG.email + ").",
  },
  {
    title: "16. Blog: comments, likes and sharing",
    content:
      "When you comment on a blog post, we store your comment, the time and – unless you comment anonymously – the name you enter. Comments are published on this website; comments containing links are held for review. No email address is required. We receive an email notification for every comment. To prevent spam and abuse, a one-way hash of your IP address, generated with a secret key, is stored briefly for rate limiting and then deleted automatically after the time window; it is never stored with your comment. Legal basis: Art. 6(1)(f) GDPR (operating the comment function, protection against abuse).\n\n" +
      "Likes and dislikes are counted using a random identifier in your browser's local storage which is not linked to you personally (legal basis: Art. 6(1)(f) GDPR, § 25(2) no. 2 TDDDG).\n\n" +
      "The share buttons are plain links: no third-party social media scripts are loaded, and no data is sent to a social network unless you click one. The same applies to the links to our Instagram, Facebook and YouTube profiles in the footer.\n\n" +
      "To have a comment removed, write to " + LEGAL_CONFIG.email + ".",
  },
  {
    title: "17. Blog newsletter",
    content:
      "If you subscribe to new blog posts, we collect your email address, your preferred language and the page you signed up from. You are only added to the mailing list after you click the link in the confirmation email (double opt-in). To be able to prove your consent, we store the time of your sign-up and confirmation and the wording of the consent. Legal basis: your consent (Art. 6(1)(a) GDPR); storing the proof is based on Art. 6(1)(c) and (f) GDPR (Art. 7(1) GDPR).\n\n" +
      "We use your address only to inform you about new blog posts. Open and click measurement: our email provider Brevo records whether and when you open a newsletter email and which links you click. This cannot be switched off for individual mailings in our Brevo account. By subscribing you therefore also expressly consent to this measurement (Art. 6(1)(a) GDPR, § 25(1) TDDDG); the evaluation serves to improve the emails. If you do not want this, please do not subscribe or withdraw your consent.\n\n" +
      "Withdrawal: You can unsubscribe at any time using the link in every email or by writing to " + LEGAL_CONFIG.email + "; your address is then no longer used for the newsletter. Sign-ups that are never confirmed are deleted automatically after 30 days. We keep the proof of your consent after unsubscribing until the limitation period has expired (section 23).",
  },
  {
    title: "18. Email delivery (Brevo)",
    content:
      "The newsletter and the website's automated emails (e.g. booking and enquiry confirmations, confirmation of newsletter sign-up) are sent via Brevo, a service of Sendinblue SAS (Paris, France). Brevo processes email addresses and email contents on our behalf under a data processing agreement pursuant to Art. 28 GDPR, on servers in the EU. Brevo records whether an email was delivered, opened or bounced and which links were clicked; for confirmation emails this cannot be switched off and serves reliable delivery (Art. 6(1)(f) GDPR). If Brevo is unavailable, we send the email instead through our Google Workspace mailbox. Details: https://www.brevo.com/legal/privacypolicy/.",
  },
  {
    title: "19. Photos and videos at events",
    content:
      "At our workshops, classes and community events (e.g. International Yoga Day) we occasionally take photos, which we show on this website and our social media channels. We publish identifiable people only with their consent (Art. 6(1)(a) GDPR, § 22 KUG where applicable). Consent is voluntary and can be withdrawn at any time with effect for the future (email to " + LEGAL_CONFIG.email + "); we then remove the photo from our channels promptly. For minors, the consent of their legal guardians is required.",
  },
  {
    title: "20. Children and young people",
    content:
      "Our offers for children (e.g. the online workshop “Yoga Adventure” for ages 9–14) are booked by a parent or legal guardian. You provide your child's data (e.g. name, age, health notes) as parent or guardian; you give consents – including under Art. 9 GDPR – for your child as legal representative. This website is not aimed at children; please do not let children fill in forms themselves.",
  },
  {
    title: "21. Recipients and processors",
    content:
      "Depending on your use, recipients of your data are: ourselves (Richa Kansal, for courses also Riju Kansal); our service providers as processors – Vercel Inc. (hosting), Google Ireland Limited/Google LLC (Firebase, Google Workspace, Google Calendar, Google Meet, if applicable Google Analytics), Brevo/Sendinblue SAS (email delivery); Zoom Video Communications, Inc. (online sessions); the payment providers and banks mentioned; WhatsApp (as independent controller); authorities, tax advisers or courts where we are legally obliged or this is necessary to pursue legal claims. We do not otherwise pass your data on to third parties.",
  },
  {
    title: "22. Transfers to third countries",
    content:
      "Some of the providers mentioned are based in the USA or process data there (Vercel, Google LLC, Zoom, Meta/WhatsApp). We base the transfer on the European Commission's adequacy decision on the EU-US Data Privacy Framework (Implementing Decision (EU) 2023/1795) where the recipient is certified under it (according to its own statement, Vercel among others), and additionally on the European Commission's standard contractual clauses (Art. 46(2)(c) GDPR), which are part of the data processing agreements (e.g. Vercel). Payments via UPI: Art. 49(1)(b) GDPR (see section 12). You can obtain a copy of the safeguards on request at " + LEGAL_CONFIG.email + ".",
  },
  {
    title: "23. Storage periods",
    content:
      "We store personal data only as long as necessary for the respective purpose or required by law. Specifically:\n" +
      `• Server log files, reach measurement: according to Vercel's rules (sections 3 and 6); Google Analytics: at most 14 months (section 5).\n` +
      `• Enquiries and bookings that do not lead to a contract: deleted no later than ${R.unansweredInquiryMonths} months after the enquiry is closed.\n` +
      `• Contract data (booking, contact details, correspondence): until the statutory limitation period of ${R.limitationYears} years has expired (§§ 195, 199 BGB), counted from the end of the year in which the service was provided, unless longer statutory retention periods apply (Art. 6(1)(f) GDPR: defence of claims).\n` +
      `• Free-text information relating to health: we delete it as soon as it is no longer needed to provide the service, at the latest ${R.healthFreeTextMonths} months after the service has been completed.\n` +
      `• Invoices, payment and accounting vouchers: ${R.accountingVoucherYears} years; commercial and business letters: ${R.businessLetterYears} years (§ 147 AO, § 257 HGB); the period starts at the end of the calendar year in which the document was created.\n` +
      "• Newsletter: until you unsubscribe; unconfirmed sign-ups 30 days; proof of consent until the limitation period has expired.\n" +
      "• Blog comments and reviews: until you ask for removal or the post is removed; hashes for rate limiting: only briefly (a few days).\n" +
      "• User account: until you ask for deletion.\n" +
      "• Photos: until you withdraw your consent or as long as needed for the purpose of publication.\n" +
      "After the periods have expired, we delete the data or restrict its processing if retention obligations prevent deletion.",
  },
  {
    title: "24. Your rights",
    content:
      "You have the following rights against us regarding your personal data:\n" +
      "• access (Art. 15 GDPR),\n• rectification (Art. 16 GDPR),\n• erasure (Art. 17 GDPR),\n• restriction of processing (Art. 18 GDPR),\n• data portability (Art. 20 GDPR),\n• objection (Art. 21 GDPR),\n• withdrawal of consent given, with effect for the future (Art. 7(3) GDPR).\n\n" +
      "Right to object (Art. 21 GDPR): You have the right, on grounds relating to your particular situation, to object at any time to the processing of personal data concerning you that is based on Art. 6(1)(f) GDPR. We will then no longer process the data unless we can demonstrate compelling legitimate grounds that override your interests, or the processing serves the establishment, exercise or defence of legal claims.\n\n" +
      "To exercise your rights, an email to " + LEGAL_CONFIG.email + " is sufficient. You can withdraw your consent to Google Analytics at any time via “Cookie settings”.\n\n" +
      "Right to lodge a complaint (Art. 77 GDPR): You have the right to complain to a data protection supervisory authority. The authority responsible for us is:\nDer Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg\nHeilbronner Straße 35, 70191 Stuttgart, Germany\nPostfach 10 29 32, 70025 Stuttgart, Germany\nPhone: +49 711 / 61 55 41-0\nEmail: poststelle@lfdi.bwl.de\nWebsite: https://www.baden-wuerttemberg.datenschutz.de\nYou may also contact the supervisory authority at your place of residence or at the place of the alleged infringement.",
  },
  {
    title: "25. Changes to this policy",
    content: `We update this privacy policy when our services or the legal situation change. Last updated: ${LEGAL_UPDATED.EN}.`,
  },
];

export const privacy: { DE: LegalDoc; EN: LegalDoc } = {
  DE: {
    title: "Datenschutzerklärung",
    intro:
      "Diese Datenschutzerklärung informiert Sie nach Art. 13 und 14 DSGVO darüber, welche personenbezogenen Daten wir verarbeiten, wenn Sie diese Website besuchen oder unsere Angebote nutzen, zu welchen Zwecken und auf welcher Rechtsgrundlage, wer die Daten erhält, wie lange wir sie speichern und welche Rechte Sie haben.",
    sections: sectionsDE,
  },
  EN: {
    title: "Privacy Policy",
    intro:
      "This English text is a translation for convenience. In case of doubt, the German version applies.\n\nThis privacy policy informs you under Art. 13 and 14 GDPR about which personal data we process when you visit this website or use our services, for which purposes and on which legal basis, who receives the data, how long we store it and which rights you have.",
    sections: sectionsEN,
  },
};
