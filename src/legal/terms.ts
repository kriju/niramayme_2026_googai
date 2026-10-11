import { ADDRESS, LEGAL_CONFIG, LEGAL_UPDATED, ownersLine, vatPriceNote } from "./config";
import type { LegalDoc } from "./types";

// AGB (general terms) and Widerrufsbelehrung. German = authoritative text,
// English = translation. DRAFTS: must be reviewed by a German lawyer.
//
// LEGAL-REVIEW (AGB):
//  - Contract formation mirrors the actual flow in src/App.tsx: the booking
//    form is the customer's binding offer ("zahlungspflichtig buchen"), the
//    automatic email is only an acknowledgement of receipt (§ 312i Abs. 1
//    Nr. 3 BGB), the contract is concluded by our confirmation (the
//    "Anmeldung bestätigt"/"Zahlung erhalten" emails) or by performance.
//  - Cancellation: the only existing rule is the FAQ sentence "Please give at
//    least 24 hours' notice to reschedule or cancel". No fee or forfeiture is
//    invented. TODO(owner): if a no-show / late-cancellation fee is wanted it
//    must be stated here and be reasonable (§ 309 Nr. 5 BGB), and the consumer
//    must be allowed to prove a lower damage.
//  - Liability: the standard split (unlimited for intent/gross negligence/life,
//    body, health/ProdHaftG/guarantee; limited to typical foreseeable damage
//    for slightly negligent breach of cardinal duties) is the common form that
//    is valid under § 309 Nr. 7 BGB. No other exclusions are drafted.
//  - Art. 246c EGBGB information duties for contracts via electronic means
//    (technical steps, storage of the contract text, correcting input errors,
//    languages) are covered in section 3; lawyer to confirm completeness.
//  - "No medical advice / no healing promise" mirrors the FAQ sentence "Our
//    sessions complement, but don't replace, medical or psychotherapeutic
//    care. If you have a diagnosed condition, please continue working with
//    your doctor." Heilpraktikergesetz / HWG (Heilmittelwerbegesetz) aspects of
//    the marketing copy are a separate task and not touched here.
//
// LEGAL-REVIEW (Widerrufsbelehrung):
//  - Sections tagged "[Gesetzlicher Mustertext]" follow Anlage 1 (Muster-
//    Widerrufsbelehrung) and Anlage 2 (Muster-Widerrufsformular) zu Art. 246a
//    § 1 Abs. 2 S. 2 EGBGB for service contracts. The wording was written from
//    the official model; the official text on gesetze-im-internet.de could not
//    be retrieved verbatim in this environment. COMPARE IT WORD FOR WORD with
//    the current official version, in force with the changes of 19 June 2026
//    (electronic withdrawal function, § 356a BGB), before publishing: errors
//    in the Belehrung can extend the withdrawal period to 12 months + 14 days.
//  - § 356 Abs. 4 BGB (loss of the right on full performance after express
//    request and acknowledgement) and § 357a BGB (pro-rata payment) are stated
//    in section 4; check the paragraph references.
//  - Online withdrawal ("Vertrag widerrufen" in the footer) is the § 356a BGB
//    function; see src/App.tsx (WithdrawalDialog) and api/_lib/withdrawal.ts.

const H = LEGAL_CONFIG.cancellationNoticeHours;
const D = LEGAL_CONFIG.withdrawalDays;

const addressLineDE = `${ADDRESS.street}, ${ADDRESS.postalCode} ${ADDRESS.city}, ${ADDRESS.country.DE}`;
const addressLineEN = `${ADDRESS.street}, ${ADDRESS.postalCode} ${ADDRESS.city}, ${ADDRESS.country.EN}`;
const traderDE = `${LEGAL_CONFIG.businessName.DE}, ${ownersLine("DE")}, ${addressLineDE}, Telefon: ${LEGAL_CONFIG.phone}, E-Mail: ${LEGAL_CONFIG.email}`;
const traderEN = `${LEGAL_CONFIG.businessName.EN}, ${ownersLine("EN")}, ${addressLineEN}, Phone: ${LEGAL_CONFIG.phone}, Email: ${LEGAL_CONFIG.email}`;

export const agb: { DE: LegalDoc; EN: LegalDoc } = {
  DE: {
    title: "Allgemeine Geschäftsbedingungen (AGB)",
    intro: `Stand: ${LEGAL_UPDATED.DE}`,
    sections: [
      {
        title: "1. Anbieter und Geltungsbereich",
        content:
          `Anbieter ist ${LEGAL_CONFIG.businessName.DE}, ${ownersLine("DE")}, ${addressLineDE} („wir“). Kontakt: ${LEGAL_CONFIG.email}, ${LEGAL_CONFIG.phone}. Weitere Angaben finden Sie im Impressum.\n\n` +
          "Diese AGB gelten für alle Verträge über Leistungen, die Verbraucher (§ 13 BGB) und Unternehmer (§ 14 BGB) über diese Website oder auf anderem Weg mit uns abschließen: Reiki-Sitzungen (vor Ort und als Fern-Reiki), Online-Kurse und Workshops (auch für Kinder, gebucht durch die Erziehungsberechtigten), Lesungen und Beratungen (z. B. vedische Astrologie, Tarot, intuitive Begleitung und Seelenberatung) sowie weitere Einzelsitzungen und Coachings, die wir auf der Website anbieten.\n\n" +
          "Kurse, die über die VHS Ostfildern gebucht werden, buchen Sie direkt bei der VHS Ostfildern. Für diese Verträge gelten ausschließlich die Bedingungen der VHS, nicht diese AGB.\n\n" +
          "Abweichende Bedingungen des Kunden gelten nur, wenn wir ihnen ausdrücklich in Textform zugestimmt haben.",
        links: ["impressum"],
      },
      {
        title: "2. Art der Leistungen – keine medizinische Beratung, kein Heilversprechen",
        content:
          "Unsere Angebote (Yoga, Reiki, Coaching, Lesungen, Beratung) dienen der Entspannung, Achtsamkeit, Selbstreflexion und persönlichen Entwicklung. Sie sind keine Heilbehandlung, Diagnose oder Therapie im Sinne des Heilkundegesetzes und ersetzen keine ärztliche, psychotherapeutische oder sonstige medizinische Behandlung. Wir geben keine Heilversprechen und garantieren keinen bestimmten Erfolg. Unsere Sitzungen ergänzen eine medizinische oder psychotherapeutische Versorgung, ersetzen sie aber nicht. Wenn Sie eine diagnostizierte Erkrankung haben, arbeiten Sie bitte weiterhin mit Ihrer Ärztin bzw. Ihrem Arzt zusammen und setzen Sie verordnete Behandlungen nicht auf unseren Rat hin ab.\n\n" +
          "Lesungen (z. B. vedische Astrologie, Tarot) und intuitive Begleitung beruhen auf symbolischen und spirituellen Deutungen. Sie sind Angebote zur persönlichen Orientierung und ersetzen keine medizinische, psychologische, rechtliche oder finanzielle Beratung.\n\n" +
          "Bei akuten gesundheitlichen Beschwerden oder seelischen Krisen wenden Sie sich bitte an Ihre Ärztin bzw. Ihren Arzt oder den Notruf 112. Die Telefonseelsorge ist in Deutschland kostenfrei erreichbar unter 0800 111 0 111 und 0800 111 0 222.\n\n" +
          "Sie entscheiden eigenverantwortlich über Ihre Teilnahme und passen Übungen Ihren Möglichkeiten an. Bitte informieren Sie uns vor der Sitzung über gesundheitliche Einschränkungen oder Verletzungen, soweit diese für die Durchführung relevant sind.",
      },
      {
        title: "3. Vertragsschluss und Buchung",
        content:
          "Die Darstellung unserer Leistungen auf der Website ist kein verbindliches Angebot, sondern eine Aufforderung an Sie, ein Angebot abzugeben.\n\n" +
          "So buchen Sie: Sie wählen die Leistung, füllen das Buchungsformular aus (Eingabefehler können Sie vor dem Absenden jederzeit korrigieren, indem Sie die Felder ändern) und klicken auf die Schaltfläche „Zahlungspflichtig buchen“. Damit geben Sie ein verbindliches Angebot zum Abschluss des Vertrags ab. Den Eingang Ihrer Buchung bestätigen wir automatisch per E-Mail (Eingangsbestätigung); diese ist noch keine Annahme. Der Vertrag kommt zustande, wenn wir Ihre Buchung ausdrücklich bestätigen (z. B. durch Bestätigungs-E-Mail oder Terminbestätigung) oder die Leistung erbringen. Bei Leistungen mit begrenzter Teilnehmerzahl können wir eine Buchung ablehnen, wenn keine Plätze mehr frei sind.\n\n" +
          "Bei Fern-Reiki und anderen Anfragen, die im Formular als „unverbindliche Anfrage“ gekennzeichnet sind, ist Ihre Anfrage noch kein verbindliches Angebot; der Vertrag kommt erst zustande, wenn wir Ihre Buchung bestätigen.\n\n" +
          "Vertragssprachen sind Deutsch und Englisch. Wir speichern die Buchungsdaten; die Buchungsbestätigung und diese AGB erhalten Sie per E-Mail bzw. können Sie jederzeit hier in der Website abrufen und speichern. Auf Wunsch senden wir Ihnen den Vertragstext erneut zu.",
        links: ["widerruf"],
      },
      {
        title: "4. Preise und Zahlung",
        content:
          "Es gelten die Preise, die zum Zeitpunkt Ihrer Buchung auf der Website angezeigt werden. Preise werden in Euro und für Zahlungen aus Indien zusätzlich in indischen Rupien (INR) angegeben; bei Zahlung per UPI gilt der INR-Preis. " + vatPriceNote("DE") + "\n\n" +
          "Zahlungsarten: PayPal, SEPA-Überweisung (EUR) und – für Zahlungen in INR – UPI. Die Zahlung erfolgt im Voraus unter Angabe des Referenzcodes, den Sie bei der Buchung erhalten, sofern wir im Einzelfall nichts anderes bestätigen. Die Meldung „Ich habe bezahlt“ in der Buchung ersetzt die Zahlung nicht. Wir bestätigen Ihren Termin bzw. Platz nach Eingang der Zahlung.",
      },
      {
        title: "5. Durchführung, Termine und Online-Sitzungen",
        content:
          "Termine und Kurszeiten ergeben sich aus der Buchung bzw. der Terminbestätigung. Online-Sitzungen finden über Google Meet oder Zoom statt; den Link senden wir Ihnen in der Regel einen Tag vorher per E-Mail. Sie sorgen für ein geeignetes Gerät, eine ausreichende Internetverbindung und einen ungestörten Ort. Aufzeichnungen und die Weitergabe von Kursinhalten oder Zugangslinks an Dritte sind ohne unsere vorherige Zustimmung nicht gestattet.\n\n" +
          "Müssen wir einen Termin aus wichtigem Grund (z. B. Krankheit) absagen oder verschieben, informieren wir Sie unverzüglich und bieten einen Ersatztermin an. Ist Ihnen der Ersatztermin nicht zumutbar, erstatten wir bereits gezahlte Beträge für die ausgefallene Leistung unverzüglich.",
      },
      {
        title: "6. Terminänderung und Absage durch Sie",
        content:
          `Bitte sagen Sie mindestens ${H} Stunden vorher Bescheid, wenn Sie einen Termin verschieben oder absagen möchten (E-Mail an ${LEGAL_CONFIG.email} oder WhatsApp). Wir bemühen uns, Ihnen einen Ersatztermin anzubieten. Bei Nichterscheinen ohne rechtzeitige Absage gelten die gesetzlichen Vorschriften.\n\n` +
          "Ihr gesetzliches Widerrufsrecht als Verbraucher (siehe Widerrufsbelehrung) bleibt unberührt.",
        links: ["widerruf"],
      },
      {
        title: "7. Widerrufsrecht für Verbraucher",
        content:
          `Verbrauchern steht bei Verträgen, die über unsere Website oder per E-Mail/WhatsApp (Fernabsatz) geschlossen werden, ein gesetzliches Widerrufsrecht von ${D} Tagen zu. Einzelheiten, das Muster-Widerrufsformular und die Hinweise zum vorzeitigen Beginn der Leistung finden Sie in der Widerrufsbelehrung.`,
        links: ["widerruf", "withdraw"],
      },
      {
        title: "8. Haftung",
        content:
          "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz sowie soweit wir eine Garantie übernommen haben.\n\n" +
          "Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen) ist unsere Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung für leicht fahrlässige Pflichtverletzungen ausgeschlossen.\n\n" +
          "Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten unserer gesetzlichen Vertreter und Erfüllungsgehilfen.",
      },
      {
        title: "9. Datenschutz",
        content: "Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer Datenschutzerklärung.",
        links: ["privacy"],
      },
      {
        title: "10. Verbraucherstreitbeilegung",
        content:
          "Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).",
      },
      {
        title: "11. Anwendbares Recht, Gerichtsstand und Schlussbestimmungen",
        content:
          "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz entzogen wird, der durch zwingende Bestimmungen des Rechts des Staates gewährt wird, in dem Sie Ihren gewöhnlichen Aufenthalt haben.\n\n" +
          "Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand der Sitz des Anbieters. Für Verbraucher gelten die gesetzlichen Gerichtsstände.\n\n" +
          "Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt; es gelten insoweit die gesetzlichen Vorschriften (§ 306 BGB).",
      },
    ],
  },
  EN: {
    title: "Terms & Conditions (AGB)",
    intro: `This English text is a translation for convenience. In case of doubt, the German version applies.\n\nLast updated: ${LEGAL_UPDATED.EN}`,
    sections: [
      {
        title: "1. Provider and scope",
        content:
          `The provider is ${LEGAL_CONFIG.businessName.EN}, ${ownersLine("EN")}, ${addressLineEN} (“we”). Contact: ${LEGAL_CONFIG.email}, ${LEGAL_CONFIG.phone}. Further details are in the Legal Notice (Impressum).\n\n` +
          "These terms apply to all contracts for services that consumers (§ 13 BGB) and businesses (§ 14 BGB) conclude with us via this website or otherwise: Reiki sessions (in person and distance Reiki), online courses and workshops (including for children, booked by their legal guardians), readings and consultations (e.g. Vedic astrology, tarot, intuitive guidance and soul counseling) and other one-to-one sessions and coaching offered on the website.\n\n" +
          "Courses booked through VHS Ostfildern are booked directly with VHS Ostfildern. Only the VHS's terms apply to those contracts, not these terms.\n\n" +
          "Deviating terms of the customer apply only if we have expressly agreed to them in text form.",
        links: ["impressum"],
      },
      {
        title: "2. Nature of the services – no medical advice, no promise of healing",
        content:
          "Our offers (yoga, Reiki, coaching, readings, consultations) serve relaxation, mindfulness, self-reflection and personal development. They are not medical treatment, diagnosis or therapy within the meaning of the German Healing Practitioners Act (Heilkundegesetz) and do not replace medical, psychotherapeutic or other healthcare treatment. We make no promises of healing and do not guarantee any particular result. Our sessions complement, but do not replace, medical or psychotherapeutic care. If you have a diagnosed condition, please continue working with your doctor and do not stop prescribed treatment on our advice.\n\n" +
          "Readings (e.g. Vedic astrology, tarot) and intuitive guidance are based on symbolic and spiritual interpretation. They are offers for personal orientation and do not replace medical, psychological, legal or financial advice.\n\n" +
          "In case of acute health problems or emotional crises, please contact your doctor or the emergency number 112. In Germany, the Telefonseelsorge can be reached free of charge at 0800 111 0 111 and 0800 111 0 222.\n\n" +
          "You decide on your participation at your own responsibility and adapt exercises to your abilities. Please tell us before the session about health restrictions or injuries if they are relevant to the session.",
      },
      {
        title: "3. Contract formation and booking",
        content:
          "The presentation of our services on the website is not a binding offer but an invitation to you to submit an offer.\n\n" +
          "How to book: you choose the service, fill in the booking form (you can correct input errors at any time before submitting by changing the fields) and click the button “Book with obligation to pay”. With this you submit a binding offer to conclude the contract. We confirm receipt of your booking automatically by email (acknowledgement of receipt); this is not yet an acceptance. The contract is concluded when we expressly confirm your booking (e.g. by confirmation email or appointment confirmation) or provide the service. For services with a limited number of participants, we may decline a booking if no places are left.\n\n" +
          "For distance Reiki and other enquiries marked in the form as a “non-binding request”, your enquiry is not yet a binding offer; the contract is concluded only when we confirm your booking.\n\n" +
          "Contract languages are German and English. We store the booking data; you receive the booking confirmation and these terms by email and can retrieve and save them on the website at any time. On request we will send you the contract text again.",
        links: ["widerruf"],
      },
      {
        title: "4. Prices and payment",
        content:
          "The prices shown on the website at the time of your booking apply. Prices are stated in euros and, for payments from India, also in Indian rupees (INR); for payments via UPI the INR price applies. " + vatPriceNote("EN") + "\n\n" +
          "Payment methods: PayPal, SEPA bank transfer (EUR) and – for payments in INR – UPI. Payment is made in advance, quoting the reference code you receive when booking, unless we confirm otherwise in an individual case. The notice “I've paid” in the booking does not replace payment. We confirm your appointment or place after receipt of payment.",
      },
      {
        title: "5. Delivery, appointments and online sessions",
        content:
          "Appointments and course times are set out in the booking or the appointment confirmation. Online sessions take place via Google Meet or Zoom; we usually email you the link one day before. You provide a suitable device, a sufficient internet connection and an undisturbed place. Recordings and passing on course content or access links to third parties are not permitted without our prior consent.\n\n" +
          "If we have to cancel or postpone an appointment for good cause (e.g. illness), we will inform you without delay and offer a replacement appointment. If the replacement appointment is not reasonable for you, we will refund amounts already paid for the cancelled service without delay.",
      },
      {
        title: "6. Rescheduling and cancellation by you",
        content:
          `Please give at least ${H} hours' notice if you wish to reschedule or cancel an appointment (email to ${LEGAL_CONFIG.email} or WhatsApp). We will try to offer you a replacement appointment. If you do not attend without timely cancellation, the statutory provisions apply.\n\n` +
          "Your statutory right of withdrawal as a consumer (see Right of Withdrawal) remains unaffected.",
        links: ["widerruf"],
      },
      {
        title: "7. Right of withdrawal for consumers",
        content:
          `Consumers have a statutory right of withdrawal of ${D} days for contracts concluded via our website or by email/WhatsApp (distance contracts). Details, the model withdrawal form and the information on early start of the service are in the Right of Withdrawal information.`,
        links: ["widerruf", "withdraw"],
      },
      {
        title: "8. Liability",
        content:
          "We are liable without limitation for intent and gross negligence, for injury to life, body or health, under the Product Liability Act and where we have given a guarantee.\n\n" +
          "In case of slightly negligent breach of an essential contractual obligation (an obligation whose fulfilment is necessary for the proper performance of the contract and on which you may regularly rely), our liability is limited to the foreseeable damage typical for this type of contract. Otherwise, liability for slightly negligent breaches of duty is excluded.\n\n" +
          "The above limitations of liability also apply in favour of our legal representatives and vicarious agents.",
      },
      {
        title: "9. Data protection",
        content: "Information on how we process your personal data can be found in our Privacy Policy.",
        links: ["privacy"],
      },
      {
        title: "10. Consumer dispute resolution",
        content:
          "We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board (§ 36 VSBG).",
      },
      {
        title: "11. Governing law, jurisdiction and final provisions",
        content:
          "The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods. For consumers, this choice of law applies only to the extent that it does not deprive you of the protection granted by mandatory provisions of the law of the state in which you have your habitual residence.\n\n" +
          "If the customer is a merchant, a legal entity under public law or a special fund under public law, the exclusive place of jurisdiction is the provider's registered seat. For consumers, the statutory places of jurisdiction apply.\n\n" +
          "If individual provisions of these terms are invalid, the validity of the remaining provisions is unaffected; the statutory provisions apply instead (§ 306 BGB).",
      },
    ],
  },
};

export const widerruf: { DE: LegalDoc; EN: LegalDoc } = {
  DE: {
    title: "Widerrufsbelehrung",
    intro: `Stand: ${LEGAL_UPDATED.DE}`,
    sections: [
      {
        title: "Hinweis zu diesem Text",
        content:
          "Diese Belehrung gilt für Verbraucher (§ 13 BGB), die bei uns Leistungen buchen (Reiki, Online-Kurse und Workshops, Lesungen und Beratungen, Einzelsitzungen). Die mit „[Gesetzlicher Mustertext]“ gekennzeichneten Abschnitte folgen dem gesetzlichen Muster der Anlage 1 zu Artikel 246a § 1 Absatz 2 Satz 2 EGBGB (Muster-Widerrufsbelehrung für Dienstleistungsverträge) und der Anlage 2 (Muster-Widerrufsformular). Alle anderen Abschnitte sind Ergänzungen von uns.\n\n" +
          "Kurse der VHS Ostfildern buchen Sie direkt bei der VHS; für diese Verträge gilt diese Belehrung nicht.",
      },
      {
        title: "Widerrufsrecht [Gesetzlicher Mustertext]",
        content:
          `Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.\n\n` +
          `Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.\n\n` +
          `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${traderDE}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.\n\n` +
          `Sie können Ihr Widerrufsrecht auch online ausüben: über die Funktion „Vertrag widerrufen“ im Seitenfuß unserer Website. Machen Sie von dieser Möglichkeit Gebrauch, so werden wir Ihnen unverzüglich auf einem dauerhaften Datenträger (z. B. per E-Mail) eine Bestätigung über den Eingang des Widerrufs übermitteln; sie enthält den Inhalt Ihrer Erklärung sowie Datum und Uhrzeit des Eingangs.\n\n` +
          `Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.`,
        links: ["withdraw"],
      },
      {
        title: "Folgen des Widerrufs [Gesetzlicher Mustertext]",
        content:
          "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.\n\n" +
          "Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.",
      },
      {
        title: "Vorzeitiger Beginn der Leistung; Erlöschen des Widerrufsrechts (§ 356 Abs. 4 BGB, § 357a BGB)",
        content:
          "Wenn Sie in der Buchung ausdrücklich verlangen, dass wir bereits vor Ablauf der Widerrufsfrist mit der Leistung beginnen (Kästchen „Ich verlange ausdrücklich …“), gilt:\n" +
          "• Widerrufen Sie den Vertrag, nachdem wir mit der Leistung begonnen haben, zahlen Sie uns den anteiligen Wertersatz für die bis dahin erbrachten Leistungen (siehe „Folgen des Widerrufs“, § 357a BGB).\n" +
          "• Ihr Widerrufsrecht erlischt vorzeitig, wenn wir die Dienstleistung vollständig erbracht haben und mit der Ausführung erst begonnen haben, nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben haben und gleichzeitig Ihre Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei vollständiger Vertragserfüllung durch uns verlieren (§ 356 Abs. 4 BGB).\n\n" +
          "Ohne ein solches ausdrückliches Verlangen beginnen wir mit der Leistung erst nach Ablauf der Widerrufsfrist. Eine Bestätigung Ihres Verlangens und Ihrer Kenntnis erhalten Sie zusammen mit der Vertragsbestätigung per E-Mail.",
      },
      {
        title: "Muster-Widerrufsformular [Gesetzlicher Mustertext]",
        content:
          "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)\n\n" +
          `– An ${traderDE}:\n` +
          "– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*):\n" +
          "– Bestellt am (*) / erhalten am (*):\n" +
          "– Name des/der Verbraucher(s):\n" +
          "– Anschrift des/der Verbraucher(s):\n" +
          "– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):\n" +
          "– Datum:\n" +
          "(*) Unzutreffendes streichen.",
        links: ["withdraw"],
      },
    ],
  },
  EN: {
    title: "Right of Withdrawal",
    intro: `This English text is a translation for convenience. In case of doubt, the German version applies.\n\nLast updated: ${LEGAL_UPDATED.EN}`,
    sections: [
      {
        title: "Note on this text",
        content:
          "This information applies to consumers (§ 13 BGB) who book services with us (Reiki, online courses and workshops, readings and consultations, one-to-one sessions). The sections marked “[statutory model text]” follow the statutory model of Annex 1 to Article 246a § 1 (2) sentence 2 EGBGB (model withdrawal instructions for service contracts) and of Annex 2 (model withdrawal form). All other sections are additions by us.\n\n" +
          "Courses of VHS Ostfildern are booked directly with the VHS; this information does not apply to those contracts.",
      },
      {
        title: "Right of withdrawal [statutory model text]",
        content:
          "You have the right to withdraw from this contract within 14 days without giving any reason.\n\n" +
          "The withdrawal period will expire after 14 days from the day of the conclusion of the contract.\n\n" +
          `To exercise the right of withdrawal, you must inform us (${traderEN}) of your decision to withdraw from this contract by an unequivocal statement (e.g. a letter sent by post or an email). You may use the attached model withdrawal form, but it is not obligatory.\n\n` +
          "You can also exercise your right of withdrawal online: using the function “Withdraw from contract” (German: “Vertrag widerrufen”) in the footer of our website. If you use this option, we will send you without delay an acknowledgement of receipt of the withdrawal on a durable medium (e.g. by email); it contains the content of your declaration and the date and time of receipt.\n\n" +
          "To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.",
        links: ["withdraw"],
      },
      {
        title: "Effects of withdrawal [statutory model text]",
        content:
          "If you withdraw from this contract, we shall reimburse to you all payments received from you without undue delay and in any event not later than 14 days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement.\n\n" +
          "If you requested to begin the performance of services during the withdrawal period, you shall pay us an amount which is in proportion to what has been provided until you have communicated to us your withdrawal from this contract, in comparison with the full coverage of the contract.",
      },
      {
        title: "Early start of the service; loss of the right of withdrawal (§ 356(4) BGB, § 357a BGB)",
        content:
          "If you expressly request in the booking that we begin the service before the withdrawal period has ended (box “I expressly request …”), the following applies:\n" +
          "• If you withdraw from the contract after we have begun the service, you pay us a proportionate amount for the services provided up to then (see “Effects of withdrawal”, § 357a BGB).\n" +
          "• Your right of withdrawal expires early if we have fully provided the service and began the performance only after you gave your express consent and at the same time confirmed your knowledge that you lose your right of withdrawal once the contract has been fully performed by us (§ 356(4) BGB).\n\n" +
          "Without such an express request, we begin the service only after the withdrawal period has ended. You will receive a confirmation of your request and your acknowledgement with the contract confirmation by email.",
      },
      {
        title: "Model withdrawal form [statutory model text]",
        content:
          "(Complete and return this form only if you wish to withdraw from the contract.)\n\n" +
          `– To ${traderEN}:\n` +
          "– I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for the provision of the following service (*):\n" +
          "– Ordered on (*) / received on (*):\n" +
          "– Name of consumer(s):\n" +
          "– Address of consumer(s):\n" +
          "– Signature of consumer(s) (only if this form is notified on paper):\n" +
          "– Date:\n" +
          "(*) Delete as appropriate.",
        links: ["withdraw"],
      },
    ],
  },
};
