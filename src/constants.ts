import { Heart, Sparkles, Brain, Zap, ShieldCheck, Moon, Users, Star } from "lucide-react";

export const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0bFjK2E2xI3wiT55LqPigmiOHHDxGTghizdBbhy4MSdbw1p6CRUsxVk8gZYqJTnMgoKOAcJjZO?gv=true";
export const GOOGLE_REVIEW_URL = "https://www.google.com/search?q=Niramay+Ostfildern+reviews";

// Feature flags
// The Blog section is still under active development. It's hidden by default so the
// rest of the site can go live without it. To work on it, set
// VITE_FEATURE_BLOG_ENABLED=true in a .env.local file (or as a Vercel Preview env var)
// and it'll show up again in that environment only.
export const FEATURE_BLOG_ENABLED = import.meta.env.VITE_FEATURE_BLOG_ENABLED === "true";

export const TRANSLATIONS = {
  EN: {
    nav: {
      services: "Services",
      about: "About",
      events: "Events",
      reviews: "Reviews",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sessions",
      bookNow: "Book Now",
      book: "My Book",
      switchLang: "Switch to German",
    },
    hero: {
      badge: "Holistic Wellbeing in Ostfildern, Germany",
      title: "Start Your Healing Journey Today.",
      titleItalic: "Healing",
      description: "Bridging ancient wisdom and modern psychology to help you find balance, clarity, and lasting transformation.",
      ctaPrimary: "Book a Free 15-Min Call",
      ctaSecondary: "Explore Services",
      testimonial: "A truly transformative experience in the heart of Ostfildern.",
    },
    services: {
      title: "Outcome-Based Healing",
      description: "We don't just offer sessions; we offer solutions for your physical, mental, and spiritual well-being.",
      outcomeLabel: "The Outcome",
      learnMore: "Learn More",
    },
    about: {
      title: "Meet Your Healer",
      p1: "I am Richa, a certified therapist dedicated to helping individuals unlock their true potential. My approach combines the ancient practices of Yoga and Reiki with the modern psychological frameworks of NLP and Hypnotherapy.",
      p2: "Based in Ostfildern, I provide a safe, nurturing space for you to explore your inner world and emerge stronger, clearer, and more at peace.",
      cta: "Watch My Philosophy",
      videoPlaceholder: "[Video Bio Placeholder]",
    },
    events: {
      title: "Moments From Our Journey",
      description: "A look back at the workshops, community classes, and International Yoga Day celebrations Richa & Riju have led since 2018.",
      featured: "Featured",
    },
    testimonials: {
      title: "Real Stories of Transformation",
      description: "Hear from those who have walked the path of healing with us.",
      googleReview: "Review us on Google",
      leaveReview: "Leave a Review",
      modalTitle: "Share Your Experience",
      modalDesc: "Your feedback helps others on their healing journey.",
      form: {
        name: "Name",
        rating: "Rating",
        content: "Your Review",
        category: "Service Category",
        role: "Outcome/Benefit",
        submit: "Post Review",
        cancel: "Cancel",
      },
      filters: {
        all: "All Reviews",
        physical: "Physical",
        mental: "Mental",
        spiritual: "Spiritual",
        kids: "Kids Yoga",
        dance: "Dance Therapy",
        tarot: "Tarot Reading",
        chair: "Chair Yoga",
      }
    },
    faq: {
      title: "Common Questions",
      description: "Everything you need to know before your first session.",
    },
    sessions: {
      title: "Ongoing Sessions",
      description: "Join our community sessions and workshops designed for consistent growth and healing.",
      bookBtn: "Join via WhatsApp",
      contactNote: "Reserve your spot via WhatsApp or email us at richa@niramay.me",
      by: "by",
    },
    booking: {
      title: "Book Your Session",
      calendlyTitle: "Google Calendar Booking",
      calendlyDesc: "Select a time slot that works best for your healing journey.",
      calendlyBtn: "Open Booking Page",
      discoveryLabel: "Free Discovery",
      discoveryValue: "15-Min Call",
      availabilityLabel: "Availability",
      availabilityValue: "Mon - Fri, 9am - 6pm",
    },
    footer: {
      description: "Empowering your journey towards holistic wellness through a unique blend of ancient wisdom and modern therapy.",
      quickLinks: "Quick Links",
      contact: "Contact",
      whatsapp: "Chat with Richa",
      rights: "All rights reserved.",
      impressum: "Impressum",
      privacy: "Privacy Policy",
      legal: {
        impressum: {
          title: "Legal Notice (Impressum)",
          section1: {
            title: "Information according to § 5 TMG",
            content: "Niramay - Holistic Wellbeing\nRicha Kansal\nErnst Kirchner Str 13/3\n73760 Ostfildern\nGermany"
          },
          section2: {
            title: "Contact",
            content: "Phone: +49-15175315761\nEmail: richa@niramay.me"
          },
          section3: {
            title: "Professional Regulation",
            content: "Professional designation: Therapist/Coach\nState where the professional title was awarded: Germany"
          },
          section4: {
            title: "EU Dispute Resolution",
            content: "The European Commission provides a platform for online dispute resolution (OS): https://ec.europa.eu/consumers/odr. We are not obliged or willing to participate in dispute resolution proceedings before a consumer arbitration board."
          }
        },
        privacy: {
          title: "Privacy Policy",
          intro: "We take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.",
          sections: [
            {
              title: "1. Data Protection at a Glance",
              content: "The following information provides a simple overview of what happens to your personal data when you visit our website. Personal data is any data with which you can be personally identified."
            },
            {
              title: "2. Responsibility",
              content: "The controller for data processing on this website is:\nRicha Kansal\nErnst Kirchner Str 13/3\n73760 Ostfildern\nEmail: richa@niramay.me"
            },
            {
              title: "3. Data Collection on our Website",
              content: "Data is collected on the one hand by you communicating it to us. This can be, for example, data that you enter in a contact form or during appointment booking. Other data is collected automatically by our IT systems when you visit the website (e.g., browser, operating system, or time of page view)."
            },
            {
              title: "4. Third-Party Services (Google Calendar & Reviews)",
              content: "Our website uses services from Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland) for appointment booking and reviews. When you use these services, data may be transmitted to Google."
            },
            {
              title: "5. Your Rights",
              content: "You have the right to receive information about the origin, recipient, and purpose of your stored personal data at any time free of charge. You also have the right to request the correction, blocking, or deletion of this data."
            },
            {
              title: "6. Event & Workshop Photography",
              content: "We occasionally take photographs at our workshops, classes, and community events (e.g. International Yoga Day) to share on this website and our social media channels. We select images that favor group or candid shots over close-ups of individuals, and we obtain consent from clearly identifiable attendees where practicable. If you appear in a photo on this site and would like it removed, please contact us at richa@niramay.me and we will take it down promptly."
            }
          ]
        }
      }
    },
    blog: {
      title: "Insights & Wisdom",
      description: "Explore our collection of articles on holistic healing, yoga, and mindfulness.",
      readMore: "Read Full Article",
      loadMore: "Load More",
      showLess: "Show Less",
      backToList: "Back to Blog",
      addPost: "Add New Post",
      categories: {
        all: "All Insights",
        physical: "Physical Wellness",
        mental: "Mental Clarity",
        spiritual: "Spiritual Healing",
        kids: "Kids Yoga",
        dance: "Dance Therapy",
        tarot: "Tarot Reading",
        chair: "Chair Yoga"
      },      editor: {
        title: "Create Post",
        titleLabel: "Post Title",
        excerptLabel: "Short Summary",
        contentLabel: "Main Content",
        categoryLabel: "Category",
        imageLabel: "Image URL (Unsplash)",
        submit: "Publish Article",
        cancel: "Cancel",
        saving: "Publishing..."
      }
    },
    astrology: {
      badge: "1:1 Astrological Guidance & Kundali Analysis",
      title: "Decode Your Soul's Blueprint.",
      subtitle: "Navigate Life's Cycles with Clarity.",
      traditionNote: "Rooted in Vedic Astrology (Jyotish) — India's ancient science of birth-chart analysis.",
      intro1: "Most people view astrology as rigid fortune-telling or fear-driven predictions. Here, we approach your birth chart as your living energetic map—an empowering tool to understand who you are at a core level, why certain life situations keep repeating, and where your natural flow lies.",
      intro2: "Astrology doesn't freeze your destiny; it shows you the weather of your life so you can navigate the storms, seize the sunny seasons, and stop fighting against your own nature.",
      exploreTitle: "What We Explore Together",
      exploreItems: [
        {
          title: "Your Core Soul Energy & True Purpose (Dharma)",
          description: "Discover your innate nature (Swabhava), authentic strengths, and what genuine fulfillment looks like for you beyond society's definitions of \"success.\"",
        },
        {
          title: "Understanding Challenging Life Situations",
          description: "Decode repetitive life patterns, career blocks, or emotional burnout. Understand the lesson life is currently presenting so you can complete the cycle rather than relive it.",
        },
        {
          title: "Navigating Difficult Transitions",
          description: "Gain clarity during heavy or confusing phases (Mahadashas, Sade Sati, or major planetary transits) with practical guidance on whether to push forward, pivot, or pause.",
        },
        {
          title: "Relationships & Emotional Dynamics",
          description: "Understand how you relate to others, the karmic roots of your relationship friction, and how to build emotionally safe, conscious connections.",
        },
        {
          title: "Guidance on Children & Family",
          description: "Understand your child's unique nature, emotional tendencies, and learning styles through their energetic blueprint, helping you nurture them according to who they are rather than external pressures.",
        },
        {
          title: "Channeling Energy Productively",
          description: "Pinpoint exactly where your time, focus, and emotional reserves will yield real growth, and where pushing causes unnecessary friction.",
        },
      ],
      whoTitle: "Who This Guidance Is For",
      whoItems: [
        "Anyone feeling stuck in a repeating life pattern or emotional loop.",
        "Individuals standing at a career or personal crossroads seeking objective direction.",
        "Seekers asking: \"What am I truly meant to learn or create in this chapter?\"",
        "Parents wanting to understand their child's natural temperament and developmental rhythm.",
        "Anyone looking for grounded, conscious guidance free from fear, superstition, or fatalism.",
      ],
      howTitle: "How It Works",
      howSteps: [
        {
          title: "Submit Your Details",
          description: "Complete the booking form with your exact birth date, birth time, and birth city, along with the primary areas of life you want to focus on.",
        },
        {
          title: "Chart Preparation",
          description: "Your chart is thoroughly prepared and studied prior to the call.",
        },
        {
          title: "Connect Live",
          description: "We meet online via Google Meet/Zoom for an in-depth, eye-opening exploration of your cosmic blueprint.",
        },
        {
          title: "Session Write-Up",
          description: "Receive the write-up of your analysis so you can revisit the insights whenever you need a compass.",
        },
      ],
      cta: "Book Your Reading",
    },
    book: {
      title: "Journey from Body to Bliss",
      subtitle: "The Niramay Path to Pancha Koshas",
      description: "Explore the transformative path of holistic healing through the Five Sheaths (Pancha Koshas) of human existence. From physical vitality to spiritual ecstasy, this book provides a comprehensive roadmap for self-discovery and lasting transformation.",
      author: "Richa Jain Kansal",
      cta: "Order on Amazon",
      link: "https://a.co/d/05dRUInw",
      badges: ["Holistic Guide", "Ancient Wisdom"],
    }
  },
  DE: {
    nav: {
      services: "Dienstleistungen",
      about: "Über mich",
      events: "Veranstaltungen",
      reviews: "Bewertungen",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sitzungen",
      bookNow: "Jetzt buchen",
      book: "Mein Buch",
      switchLang: "Auf Englisch wechseln",
    },
    hero: {
      badge: "Ganzheitliches Wohlbefinden in Ostfildern, Deutschland",
      title: "Beginnen Sie heute Ihre Heilungsreise.",
      titleItalic: "Heilungs",
      description: "Die Verbindung von altem Wissen und moderner Psychologie, um Ihnen zu helfen, Balance, Klarheit und dauerhafte Transformation zu finden.",
      ctaPrimary: "Kostenloses 15-Min-Gespräch buchen",
      ctaSecondary: "Dienstleistungen erkunden",
      testimonial: "Eine wahrhaft transformative Erfahrung im Herzen von Ostfildern.",
    },
    services: {
      title: "Ergebnisorientierte Heilung",
      description: "Wir bieten nicht nur Sitzungen an; wir bieten Lösungen für Ihr körperliches, geistiges und spirituelles Wohlbefinden.",
      outcomeLabel: "Das Ergebnis",
      learnMore: "Mehr erfahren",
    },
    about: {
      title: "Lernen Sie Ihre Therapeutin kennen",
      p1: "Ich bin Richa, eine zertifizierte Therapeutin, die sich darauf spezialisiert hat, Menschen dabei zu helfen, ihr wahres Potenzial zu entfalten. Mein Ansatz kombiniert die alten Praktiken von Yoga und Reiki mit den modernen psychologischen Rahmenbedingungen von NLP und Hypnotherapie.",
      p2: "In Ostfildern ansässig, biete ich einen sicheren, nährenden Raum, in dem Sie Ihre innere Welt erkunden und stärker, klarer und friedvoller hervorgehen können.",
      cta: "Meine Philosophie ansehen",
      videoPlaceholder: "[Video Bio Platzhalter]",
    },
    events: {
      title: "Momente unserer Reise",
      description: "Ein Rückblick auf die Workshops, Gemeinschaftskurse und Internationalen Yoga-Tag-Feiern, die Richa & Riju seit 2018 geleitet haben.",
      featured: "Ausgewählt",
    },
    testimonials: {
      title: "Echte Geschichten der Transformation",
      description: "Hören Sie von denen, die den Weg der Heilung mit uns gegangen sind.",
      googleReview: "Bewerten Sie uns auf Google",
      leaveReview: "Bewertung abgeben",
      modalTitle: "Teilen Sie Ihre Erfahrung",
      modalDesc: "Ihr Feedback hilft anderen auf ihrer Heilungsreise.",
      form: {
        name: "Name",
        rating: "Bewertung",
        content: "Ihre Bewertung",
        category: "Dienstleistungskategorie",
        role: "Ergebnis/Nutzen",
        submit: "Bewertung senden",
        cancel: "Abbrechen",
      },
      filters: {
        all: "Alle Bewertungen",
        physical: "Körperlich",
        mental: "Geistig",
        spiritual: "Spirituell",
        kids: "Kinder Yoga",
        dance: "Tanztherapie",
        tarot: "Tarot-Lesung",
        chair: "Stuhl-Yoga",
        withImage: "Mit Bild",
      }
    },
    faq: {
      title: "Häufige Fragen",
      description: "Alles, was Sie vor Ihrer ersten Sitzung wissen müssen.",
    },
    sessions: {
      title: "Laufende Sitzungen",
      description: "Nehmen Sie an unseren Gemeinschaftssitzungen und Workshops teil, die auf stetiges Wachstum und Heilung ausgelegt sind.",
      bookBtn: "Über WhatsApp beitreten",
      contactNote: "Reservieren Sie Ihren Platz über WhatsApp oder schreiben Sie uns eine E-Mail an richa@niramay.me",
      by: "von",
    },
    booking: {
      title: "Ihre Sitzung buchen",
      calendlyTitle: "Google Kalender Buchung",
      calendlyDesc: "Wählen Sie ein Zeitfenster, das am besten zu Ihrer Heilungsreise passt.",
      calendlyBtn: "Buchungsseite öffnen",
      discoveryLabel: "Kostenlose Entdeckung",
      discoveryValue: "15-Min-Anruf",
      availabilityLabel: "Verfügbarkeit",
      availabilityValue: "Mo - Fr, 9:00 - 18:00 Uhr",
    },
    footer: {
      description: "Stärken Sie Ihre Reise zu ganzheitlichem Wohlbefinden durch eine einzigartige Mischung aus altem Wissen und moderner Therapie.",
      quickLinks: "Schnelllinks",
      contact: "Kontakt",
      whatsapp: "Chat mit Richa",
      rights: "Alle Rechte vorbehalten.",
      impressum: "Impressum",
      privacy: "Datenschutz",
      legal: {
        impressum: {
          title: "Impressum",
          section1: {
            title: "Angaben gemäß § 5 TMG",
            content: "Niramay - Ganzheitliches Wohlbefinden\nRicha Kansal\nErnst Kirchner Str 13/3\n73760 Ostfildern\nDeutschland"
          },
          section2: {
            title: "Kontakt",
            content: "Telefon: +49-15175315761\nE-Mail: richa@niramay.me"
          },
          section3: {
            title: "Berufsbezeichnung",
            content: "Berufsbezeichnung: Therapeutin/Coach\nStaat, in dem die Berufsbezeichnung verliehen wurde: Deutschland"
          },
          section4: {
            title: "EU-Streitschlichtung",
            content: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
          }
        },
        privacy: {
          title: "Datenschutzerklärung",
          intro: "Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.",
          sections: [
            {
              title: "1. Datenschutz auf einen Blick",
              content: "Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können."
            },
            {
              title: "2. Verantwortlicher",
              content: "Verantwortlicher für die Datenverarbeitung auf dieser Website ist:\nRicha Kansal\nErnst Kirchner Str 13/3\n73760 Ostfildern\nE-Mail: richa@niramay.me"
            },
            {
              title: "3. Datenerfassung auf unserer Website",
              content: "Die Datenerfassung erfolgt einerseits dadurch, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular oder bei der Terminbuchung eingeben. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst (z. B. Browser, Betriebssystem oder Uhrzeit des Seitenaufrufs)."
            },
            {
              title: "4. Drittanbieter (Google Calendar & Bewertungen)",
              content: "Unsere Website nutzt Dienste der Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland) für die Terminbuchung und Bewertungen. Bei der Nutzung dieser Dienste können Daten an Google übertragen werden."
            },
            {
              title: "5. Ihre Rechte",
              content: "Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu verlangen."
            },
            {
              title: "6. Foto- und Videoaufnahmen bei Veranstaltungen",
              content: "Wir fertigen gelegentlich Fotos bei unseren Workshops, Kursen und Gemeinschaftsveranstaltungen (z. B. Internationaler Tag des Yoga) an, um diese auf dieser Website und in unseren Social-Media-Kanälen zu teilen. Wir bevorzugen dabei Gruppen- und Spontanaufnahmen gegenüber Nahaufnahmen einzelner Personen und holen, soweit praktikabel, die Einwilligung deutlich erkennbarer Teilnehmer:innen ein. Falls Sie auf einem Foto dieser Website zu erkennen sind und dessen Entfernung wünschen, kontaktieren Sie uns bitte unter richa@niramay.me — wir nehmen es umgehend herunter."
            }
          ]
        }
      }
    },
    blog: {
      title: "Einblicke & Weisheit",
      description: "Entdecken Sie unsere Sammlung von Artikeln über ganzheitliche Heilung, Yoga und Achtsamkeit.",
      readMore: "Vollständigen Artikel lesen",
      loadMore: "Mehr laden",
      showLess: "Weniger anzeigen",
      backToList: "Zurück zum Blog",
      addPost: "Neuen Post erstellen",
      categories: {
        all: "Alle Einblicke",
        physical: "Körperlich",
        mental: "Geistig",
        spiritual: "Spirituell",
        kids: "Kinder Yoga",
        dance: "Tanztherapie",
        tarot: "Tarot-Lesung",
        chair: "Stuhl-Yoga"
      },
      editor: {
        title: "Post erstellen",
        titleLabel: "Titel des Posts",
        excerptLabel: "Kurze Zusammenfassung",
        contentLabel: "Hauptinhalt",
        categoryLabel: "Kategorie",
        imageLabel: "Bild-URL (Unsplash)",
        submit: "Artikel veröffentlichen",
        cancel: "Abbrechen",
        saving: "Wird veröffentlicht..."
      }
    },
    astrology: {
      badge: "1:1 Astrologische Beratung & Kundali-Analyse",
      title: "Entschlüsseln Sie den Bauplan Ihrer Seele.",
      subtitle: "Meistern Sie die Zyklen des Lebens mit Klarheit.",
      traditionNote: "Verwurzelt in der vedischen Astrologie (Jyotish) – Indiens jahrtausendealter Wissenschaft der Geburtshoroskop-Analyse.",
      intro1: "Die meisten Menschen betrachten Astrologie als starre Wahrsagerei oder angstgetriebene Vorhersagen. Hier betrachten wir Ihr Geburtshoroskop als Ihre lebendige energetische Landkarte – ein stärkendes Werkzeug, um zu verstehen, wer Sie im Kern sind, warum sich bestimmte Lebenssituationen wiederholen, und wo Ihr natürlicher Fluss liegt.",
      intro2: "Astrologie friert Ihr Schicksal nicht ein; sie zeigt Ihnen das Wetter Ihres Lebens, damit Sie die Stürme meistern, die sonnigen Phasen nutzen und aufhören können, gegen Ihre eigene Natur anzukämpfen.",
      exploreTitle: "Was wir gemeinsam erkunden",
      exploreItems: [
        {
          title: "Ihre Seelenenergie & wahre Bestimmung (Dharma)",
          description: "Entdecken Sie Ihre angeborene Natur (Swabhava), authentische Stärken und wie echte Erfüllung für Sie aussieht – jenseits gesellschaftlicher Definitionen von \"Erfolg\".",
        },
        {
          title: "Herausfordernde Lebenssituationen verstehen",
          description: "Entschlüsseln Sie wiederkehrende Lebensmuster, berufliche Blockaden oder emotionales Burnout. Verstehen Sie die Lektion, die das Leben Ihnen gerade zeigt, damit Sie den Kreislauf abschließen statt ihn erneut zu durchleben.",
        },
        {
          title: "Schwierige Übergangsphasen meistern",
          description: "Gewinnen Sie Klarheit in schweren oder verwirrenden Phasen (Mahadashas, Sade Sati oder große planetare Transite) mit praktischer Orientierung, ob Sie vorangehen, umlenken oder innehalten sollten.",
        },
        {
          title: "Beziehungen & emotionale Dynamiken",
          description: "Verstehen Sie, wie Sie sich zu anderen in Beziehung setzen, die karmischen Wurzeln von Beziehungsreibungen und wie Sie emotional sichere, bewusste Verbindungen aufbauen.",
        },
        {
          title: "Begleitung für Kinder & Familie",
          description: "Verstehen Sie die einzigartige Natur, emotionalen Tendenzen und Lernstile Ihres Kindes durch sein energetisches Profil und begleiten Sie es entsprechend seinem wahren Wesen statt äußerem Druck.",
        },
        {
          title: "Energie gezielt einsetzen",
          description: "Erkennen Sie genau, wo Ihre Zeit, Ihr Fokus und Ihre emotionalen Ressourcen echtes Wachstum bewirken – und wo Anstrengung unnötige Reibung erzeugt.",
        },
      ],
      whoTitle: "Für wen diese Beratung geeignet ist",
      whoItems: [
        "Für alle, die in einem wiederkehrenden Lebensmuster oder emotionalen Kreislauf feststecken.",
        "Für Menschen an einem beruflichen oder persönlichen Wendepunkt, die eine objektive Orientierung suchen.",
        "Für Suchende, die sich fragen: \"Was soll ich in diesem Lebensabschnitt wirklich lernen oder erschaffen?\"",
        "Für Eltern, die das natürliche Temperament und den Entwicklungsrhythmus ihres Kindes verstehen möchten.",
        "Für alle, die sich eine fundierte, bewusste Begleitung wünschen – frei von Angst, Aberglauben oder Fatalismus.",
      ],
      howTitle: "So funktioniert es",
      howSteps: [
        {
          title: "Angaben übermitteln",
          description: "Füllen Sie das Buchungsformular mit Ihrem genauen Geburtsdatum, Ihrer Geburtszeit und Ihrem Geburtsort aus, sowie den wichtigsten Lebensbereichen, auf die Sie sich konzentrieren möchten.",
        },
        {
          title: "Horoskop-Vorbereitung",
          description: "Ihr Horoskop wird vor dem Gespräch gründlich vorbereitet und analysiert.",
        },
        {
          title: "Live-Gespräch",
          description: "Wir treffen uns online per Google Meet/Zoom für eine tiefgehende, aufschlussreiche Erkundung Ihres kosmischen Bauplans.",
        },
        {
          title: "Zusammenfassung der Sitzung",
          description: "Sie erhalten eine schriftliche Zusammenfassung Ihrer Analyse, auf die Sie jederzeit als Kompass zurückgreifen können.",
        },
      ],
      cta: "Termin für Ihre Lesung buchen",
    },
    book: {
      title: "Reise vom Körper zur Glückseligkeit",
      subtitle: "Der Niramay-Pfad zu den Pancha Koshas",
      description: "Erkunden Sie den transformativen Pfad der ganzheitlichen Heilung durch die fünf Hüllen (Pancha Koshas) der menschlichen Existenz. Von körperlicher Vitalität bis hin zu spiritueller Ekstase bietet dieses Buch einen umfassenden Fahrplan für Selbsterkenntnis und dauerhafte Transformation.",
      author: "Richa Jain Kansal",
      cta: "Auf Amazon bestellen",
      link: "https://a.co/d/05dRUInw",
      badges: ["Ganzheitlicher Leitfaden", "Altes Wissen"],
    }
  }
};

export const SERVICES = [
  {
    id: "yoga",
    icon: Heart,
    color: "bg-stone-100",
    category: "Physical Wellness",
    EN: {
      title: "Holistic Yoga",
      description: "Align your body and mind through traditional asanas, breathwork, and meditation tailored to your unique needs.",
      outcome: "Improve flexibility, reduce chronic pain, and find inner stillness.",
    },
    DE: {
      title: "Ganzheitliches Yoga",
      description: "Bringen Sie Körper und Geist durch traditionelle Asanas, Atemarbeit und Meditation in Einklang, die auf Ihre individuellen Bedürfnisse zugeschnitten sind.",
      outcome: "Verbessern Sie Ihre Flexibilität, lindern Sie chronische Schmerzen und finden Sie innere Ruhe.",
    }
  },
  {
    id: "reiki",
    icon: Sparkles,
    color: "bg-stone-100",
    category: "Spiritual Healing",
    EN: {
      title: "Energy Healing (Reiki)",
      description: "Experience deep relaxation and emotional release through gentle touch or distant energy work.",
      outcome: "Balance your energy centers and accelerate your body's natural healing process.",
    },
    DE: {
      title: "Energieheilung (Reiki)",
      description: "Erleben Sie tiefe Entspannung und emotionale Befreiung durch sanfte Berührung oder Fernenergiearbeit.",
      outcome: "Bringen Sie Ihre Energiezentren ins Gleichgewicht und beschleunigen Sie den natürlichen Heilungsprozess Ihres Körpers.",
    }
  },
  {
    id: "nlp",
    icon: Brain,
    color: "bg-stone-100",
    category: "Mental Clarity",
    EN: {
      title: "NLP Coaching",
      description: "Reprogram limiting beliefs and behavioral patterns using Neuro-Linguistic Programming techniques.",
      outcome: "Gain mental resilience, clarity of purpose, and break through personal barriers.",
    },
    DE: {
      title: "NLP Coaching",
      description: "Programmieren Sie einschränkende Überzeugungen und Verhaltensmuster mit Techniken des Neuro-Linguistischen Programmierens um.",
      outcome: "Gewinnen Sie mentale Widerstandsfähigkeit, Klarheit über Ihre Ziele und durchbrechen Sie persönliche Barrieren.",
    }
  },
  {
    id: "hypnotherapy",
    icon: Zap,
    color: "bg-stone-100",
    category: "Mental Clarity",
    EN: {
      title: "Hypnotherapy",
      description: "Access the power of your subconscious mind to address anxiety, phobias, and deep-seated habits.",
      outcome: "Overcome anxiety and achieve lasting behavioral transformation.",
    },
    DE: {
      title: "Hypnotherapie",
      description: "Nutzen Sie die Kraft Ihres Unterbewusstseins, um Ängste, Phobien und tief verwurzelte Gewohnheiten anzugehen.",
      outcome: "Überwinden Sie Ängste und erreichen Sie eine dauerhafte Verhaltensänderung.",
    }
  },
  {
    id: "past-life",
    icon: Sparkles,
    color: "bg-stone-100",
    category: "Spiritual Healing",
    EN: {
      title: "Past Life Regression",
      description: "Explore your subconscious memories to understand current life patterns and find spiritual healing.",
      outcome: "Gain deep insights into your soul's journey and release karmic blocks.",
    },
    DE: {
      title: "Rückführung in vergangene Leben",
      description: "Erforschen Sie Ihre unterbewussten Erinnerungen, um aktuelle Lebensmuster zu verstehen und spirituelle Heilung zu finden.",
      outcome: "Gewinnen Sie tiefe Einblicke in die Reise Ihrer Seele und lösen Sie karmische Blockaden.",
    }
  },
  {
    id: "astrology",
    icon: Star,
    color: "bg-stone-100",
    category: "Vedic Astrology",
    EN: {
      title: "Vedic Astrology & Kundali Reading",
      description: "1:1 birth-chart guidance rooted in Vedic Astrology (Jyotish) to help you understand your core nature, decode repeating life patterns, and navigate major transitions with clarity.",
      outcome: "Gain a personalized roadmap for your career, relationships, and next chapter, grounded in your unique birth chart.",
    },
    DE: {
      title: "Vedische Astrologie & Kundali-Lesung",
      description: "1:1 Beratung auf Basis Ihres Geburtshoroskops, verwurzelt in der vedischen Astrologie (Jyotish), für ein tieferes Verständnis Ihrer Natur, wiederkehrender Lebensmuster und wichtiger Übergangsphasen.",
      outcome: "Erhalten Sie einen persönlichen Fahrplan für Karriere, Beziehungen und Ihr nächstes Lebenskapitel, basierend auf Ihrem individuellen Geburtshoroskop.",
    }
  },
  {
    id: "sleep-restoration",
    icon: Moon,
    color: "bg-stone-100",
    category: "Physical Wellness",
    link: "https://sleep-foundation.lovable.app/",
    openInModal: true,
    EN: {
      title: "Recharge Through Rest",
      description: "Experience deep wellness through sleep restoration techniques designed to optimize your natural circadian rhythm.",
      outcome: "Achieve restorative sleep, improved energy levels, and enhanced cognitive function.",
      linkLabel: "Try this interactive tool to learn more",
    },
    DE: {
      title: "Auftanken durch Ruhe",
      description: "Erleben Sie tiefes Wohlbefinden durch Techniken zur Schlafwiederherstellung, die darauf ausgelegt sind, Ihren natürlichen zirkadianen Rhythmus zu optimieren.",
      outcome: "Ereichen Sie erholsamen Schlaf, ein verbessertes Energieniveau und eine gesteigerte kognitive Funktion.",
      linkLabel: "Probieren Sie dieses interaktive Tool aus, um mehr zu erfahren",
    }
  },
  {
    id: "relationship-counselling",
    icon: Users,
    color: "bg-stone-100",
    category: "Mental Clarity",
    link: "https://better-relationships.lovable.app/",
    openInModal: true,
    EN: {
      title: "Relationship Counselling",
      description: "Navigate relationship challenges and strengthen your emotional bonds through specialized counselling and coaching techniques.",
      outcome: "Improved communication, deeper intimacy, and healthier relationship patterns.",
      linkLabel: "Try this interactive tool to learn more",
    },
    DE: {
      title: "Beziehungsberatung",
      description: "Bewältigen Sie Beziehungsherausforderungen und stärken Sie Ihre emotionalen Bindungen durch spezialisierte Beratungs- und Coaching-Techniken.",
      outcome: "Verbesserte Kommunikation, tiefere Intimität und gesündere Beziehungsmuster.",
      linkLabel: "Probieren Sie dieses interaktive Tool aus, um mehr zu erfahren",
    }
  },
];

export const TESTIMONIALS = [
  {
    id: 1,
    name: "Sarah M.",
    category: "Mental Clarity",
    EN: {
      role: "Burnout Recovery",
      content: "Richa's blend of NLP and Yoga helped me navigate the most stressful period of my career. I feel more grounded than ever.",
    },
    DE: {
      role: "Burnout-Erholung",
      content: "Richas Mischung aus NLP und Yoga hat mir geholfen, die stressigste Zeit meiner Karriere zu meistern. Ich fühle mich geerdeter als je zuvor.",
    }
  },
  {
    id: 2,
    name: "Thomas K.",
    category: "Physical Wellness",
    EN: {
      role: "Chronic Pain Management",
      content: "The personalized yoga sessions in Ostfildern have been a game-changer for my back pain. Highly professional and caring.",
    },
    DE: {
      role: "Chronisches Schmerzmanagement",
      content: "Die personalisierten Yoga-Sitzungen in Ostfildern waren ein Wendepunkt für meine Rückenschmerzen. Hochprofessionell und fürsorglich.",
    }
  },
  {
    id: 3,
    name: "Elena R.",
    category: "Spiritual Healing",
    EN: {
      role: "Spiritual Growth",
      content: "My Reiki sessions with Richa are the highlight of my week. It's a space of pure peace and rejuvenation.",
    },
    DE: {
      role: "Spirituelles Wachstum",
      content: "Meine Reiki-Sitzungen bei Richa sind der Höhepunkt meiner Woche. Es ist ein Raum des puren Friedens und der Verjüngung.",
    }
  },
];

export const FAQS = [
  {
    EN: {
      question: "What should I expect in my first session?",
      answer: "Your first session begins with a 15-minute discovery talk where we discuss your goals and any health concerns. We then proceed with a gentle introduction to the chosen modality.",
    },
    DE: {
      question: "Was erwartet mich in meiner ersten Sitzung?",
      answer: "Ihre erste Sitzung beginnt mit einem 15-minütigen Kennenlerngespräch, in dem wir Ihre Ziele und gesundheitlichen Bedenken besprechen. Danach fahren wir mit einer sanften Einführung in die gewählte Methode fort.",
    }
  },
  {
    EN: {
      question: "Do you offer sessions in German?",
      answer: "Yes, all sessions are available in both English and German to ensure you feel comfortable and understood.",
    },
    DE: {
      question: "Bieten Sie Sitzungen auf Deutsch an?",
      answer: "Ja, alle Sitzungen sind sowohl auf Englisch als auch auf Deutsch verfügbar, um sicherzustellen, dass Sie sich wohl und verstanden fühlen.",
    }
  },
  {
    EN: {
      question: "Is there a free consultation?",
      answer: "Absolutely. I offer a free 15-minute discovery call to see if we are a good fit for your healing journey.",
    },
    DE: {
      question: "Gibt es eine kostenlose Beratung?",
      answer: "Absolut. Ich biete ein kostenloses 15-minütiges Kennenlerngespräch an, um zu sehen, ob wir für Ihre Heilungsreise gut zusammenpassen.",
    }
  },
];

export const CERTIFICATIONS = [
  { 
    icon: ShieldCheck,
    EN: { name: "Yoga Alliance Certified" },
    DE: { name: "Yoga Alliance Zertifiziert" }
  },
  { 
    icon: ShieldCheck,
    EN: { name: "Certified NLP Practitioner" },
    DE: { name: "Zertifizierter NLP-Praktiker" }
  },
  { 
    icon: ShieldCheck,
    EN: { name: "Master Reiki Healer" },
    DE: { name: "Reiki-Meister-Heiler" }
  },
  { 
    icon: ShieldCheck,
    EN: { name: "Hypnotherapist" },
    DE: { name: "Hypnotherapeut" }
  },
];

export const ONGOING_SESSIONS = [
  {
    id: "active-yoga",
    EN: {
      title: "Active Yoga",
      time: "Sundays, 08:30",
      location: "Bürgertreff Scharnhauserpark, Ostfildern",
      instructor: "Riju",
      description: "Yoga session for strength and an immunity boost, for everyone.",
    },
    DE: {
      title: "Active Yoga",
      time: "Sonntags, 08:30 Uhr",
      location: "Bürgertreff Scharnhauserpark, Ostfildern",
      instructor: "Riju",
      description: "Yoga-Sitzung zur Stärkung und Steigerung der Immunität, für alle.",
    }
  },
  {
    id: "sonntag-yoga",
    EN: {
      title: "Sonntag Yoga",
      time: "Sundays, 19:00",
      location: "Treffpunkt Ruit, Ostfildern",
      instructor: "Riju",
      description: "Yoga session for everyone to build immunity and relax body and mind in the evening.",
    },
    DE: {
      title: "Sonntag Yoga",
      time: "Sonntags, 19:00 Uhr",
      location: "Treffpunkt Ruit, Ostfildern",
      instructor: "Riju",
      description: "Yoga-Sitzung für alle, um am Abend die Immunität zu stärken und Körper und Geist zu entspannen.",
    }
  },
  {
    id: "chair-yoga",
    EN: {
      title: "Chair Yoga",
      time: "Wednesdays, 10:00",
      location: "Bürgertreff Scharnhauserpark, Ostfildern",
      instructor: "Richa",
      description: "Yoga session for everyone who wants to skip the yoga mat — build immunity and relax body and mind.",
    },
    DE: {
      title: "Stuhl-Yoga",
      time: "Mittwochs, 10:00 Uhr",
      location: "Bürgertreff Scharnhauserpark, Ostfildern",
      instructor: "Richa",
      description: "Yoga-Sitzung für alle, die auf die Yogamatte verzichten möchten — zur Stärkung der Immunität und Entspannung von Körper und Geist.",
    }
  },
  {
    id: "bollywood-dance",
    EN: {
      title: "Bollywood Dance Therapy",
      time: "Sundays, 18:00",
      location: "Treffpunkt Ruit, Ostfildern",
      instructor: "Richa",
      description: "Learn dance moves every Sunday and recharge your mood and body.",
    },
    DE: {
      title: "Bollywood-Tanztherapie",
      time: "Sonntags, 18:00 Uhr",
      location: "Treffpunkt Ruit, Ostfildern",
      instructor: "Richa",
      description: "Lernen Sie jeden Sonntag Tanzbewegungen und tanken Sie neue Energie für Körper und Stimmung.",
    }
  }
];

// Curated set of past-event photos, shown in the "Moments From Our Journey" section
// to build trust by showing Richa & Riju actually teaching. Kept as a small, hand-picked
// list (not user/admin uploaded) — see EventsSection in App.tsx.
export const EVENTS = [
  {
    id: "singapore-kids-2018",
    image: "/events/08-kids-seaside-workshop-singapore-2018.webp",
    year: "2018",
    EN: {
      title: "Kids Yoga Seaside Workshop",
      location: "Singapore",
      description: "Richa led a playful outdoor yoga workshop for children along the waterfront.",
    },
    DE: {
      title: "Kinder-Yoga-Workshop am Meer",
      location: "Singapur",
      description: "Richa leitete einen spielerischen Yoga-Workshop für Kinder direkt am Wasser.",
    }
  },
  {
    id: "singapore-iyd-2019",
    image: "/events/09-iyd-2019-singapore.webp",
    year: "2019",
    EN: {
      title: "International Day of Yoga",
      location: "Chong Pang, Singapore",
      description: "A community yoga session for people of all ages, held in celebration of International Yoga Day.",
    },
    DE: {
      title: "Internationaler Tag des Yoga",
      location: "Chong Pang, Singapur",
      description: "Eine Gemeinschafts-Yoga-Sitzung für Menschen jeden Alters anlässlich des Internationalen Yoga-Tages.",
    }
  },
  {
    id: "certification-2020",
    image: "/events/10-rijus-certification-course-2020.webp",
    year: "2020",
    EN: {
      title: "Yoga Teacher Certification Course",
      location: "Riju leading a practice demo",
      description: "Riju guiding fellow trainees through an asana demonstration during his yoga certification training.",
    },
    DE: {
      title: "Yogalehrer-Zertifizierungskurs",
      location: "Riju bei einer Übungsdemonstration",
      description: "Riju führt Mitauszubildende während seiner Yoga-Ausbildung durch eine Asana-Demonstration.",
    }
  },
  {
    id: "todtnau-2022",
    image: "/events/03-iyd-2022-todtnau.webp",
    year: "2022",
    EN: {
      title: "International Day of Yoga",
      location: "Todtnau, Germany",
      description: "An outdoor group session set against the Black Forest hills.",
    },
    DE: {
      title: "Internationaler Tag des Yoga",
      location: "Todtnau, Deutschland",
      description: "Eine Gruppensitzung im Freien vor der Kulisse des Schwarzwalds.",
    }
  },
  {
    id: "stuttgart-vaihingen-2023",
    image: "/events/04-iyd-2023-vaihingen-park-stuttgart.webp",
    year: "2023",
    EN: {
      title: "International Day of Yoga",
      location: "Stadtpark Vaihingen, Stuttgart",
      description: "A public park gathering with 50 rounds of Sun Salutation, open to the whole community.",
    },
    DE: {
      title: "Internationaler Tag des Yoga",
      location: "Stadtpark Vaihingen, Stuttgart",
      description: "Ein öffentliches Treffen im Park mit 50 Runden Sonnengruß, offen für die gesamte Gemeinschaft.",
    }
  },
  {
    id: "stuttgart-berliner-platz-2024",
    image: "/events/05-iyd-2024-berliner-platz-stuttgart.webp",
    year: "2024",
    EN: {
      title: "10th International Day of Yoga",
      location: "Berliner Platz, Stuttgart",
      description: "Hosted with the Consulate General of India, Munich, and several Indian community associations in Stuttgart.",
    },
    DE: {
      title: "10. Internationaler Tag des Yoga",
      location: "Berliner Platz, Stuttgart",
      description: "Ausgerichtet mit dem Generalkonsulat von Indien, München, und mehreren indischen Gemeinschaftsvereinen in Stuttgart.",
    }
  },
  {
    id: "ruit-yoga-concept-2025",
    image: "/events/01-ruit-presentation-the-yoga-concept.webp",
    year: "2025",
    EN: {
      title: "\"The Yoga Concept\" Talk",
      location: "Ruit, Ostfildern",
      description: "A talk on holistic well-being, held as part of the International Weeks Against Racism.",
    },
    DE: {
      title: "Vortrag „The Yoga Concept\"",
      location: "Ruit, Ostfildern",
      description: "Ein Vortrag über ganzheitliches Wohlbefinden im Rahmen der Internationalen Wochen gegen Rassismus.",
    }
  },
  {
    id: "scharnhausenpark-2025",
    image: "/events/07-iyd-2025-scharnhausenpark-ostfildern.webp",
    year: "2025",
    featured: true,
    EN: {
      title: "International Day of Yoga — Chair Yoga",
      location: "Bürgertreff Scharnhausenpark, Ostfildern",
      description: "Richa presenting a Chair Yoga session, drawing on her certifications in holistic wellbeing coaching and healing.",
    },
    DE: {
      title: "Internationaler Tag des Yoga — Stuhl-Yoga",
      location: "Bürgertreff Scharnhausenpark, Ostfildern",
      description: "Richa stellt eine Stuhl-Yoga-Sitzung vor, gestützt auf ihre Zertifizierungen im ganzheitlichen Wellbeing-Coaching und in der Heilarbeit.",
    }
  },
  {
    id: "kemnat-2026",
    image: "/events/06-iyd-2026-kemnat-festhalle-ostfildern.webp",
    year: "2026",
    EN: {
      title: "International Yoga Day 2026",
      location: "Kemnat Festhalle, Ostfildern",
      description: "Hosted by Niramay Wohlbefinden Verein, with the full team leading poses, talks, and a closing ceremony.",
    },
    DE: {
      title: "Internationaler Yoga-Tag 2026",
      location: "Kemnat Festhalle, Ostfildern",
      description: "Ausgerichtet vom Niramay Wohlbefinden Verein, mit dem gesamten Team bei Übungen, Vorträgen und einer Abschlusszeremonie.",
    }
  },
  {
    id: "ruit-weekly",
    image: "/events/02-ruit-weekly-sunday-session.webp",
    year: "Ongoing",
    EN: {
      title: "Weekly Sunday Session",
      location: "Ruit Treffpunkt, Ostfildern",
      description: "Our regular Sunday evening class — join us for a consistent weekly practice.",
    },
    DE: {
      title: "Wöchentliche Sonntagssitzung",
      location: "Ruit Treffpunkt, Ostfildern",
      description: "Unser regelmäßiger Sonntagabend-Kurs — machen Sie mit bei einer festen wöchentlichen Praxis.",
    }
  },
];
