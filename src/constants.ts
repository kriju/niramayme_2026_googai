import { Heart, Sparkles, Brain, Zap, ShieldCheck, Moon, Users } from "lucide-react";

export const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0bFjK2E2xI3wiT55LqPigmiOHHDxGTghizdBbhy4MSdbw1p6CRUsxVk8gZYqJTnMgoKOAcJjZO?gv=true";
export const GOOGLE_REVIEW_URL = "https://www.google.com/search?q=Niramay+Ostfildern+reviews";

export const TRANSLATIONS = {
  EN: {
    nav: {
      services: "Services",
      about: "About",
      reviews: "Reviews",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sessions",
      bookNow: "Book Now",
      book: "Book",
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
      tabs: {
        all: "All Services",
        physical: "Physical",
        mental: "Mental",
        spiritual: "Spiritual",
      },
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
      bookBtn: "Reserve Spot",
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
            content: "Niramay - Holistic Wellbeing\nRicha [Your Last Name]\n[Your Street & House Number]\n73760 Ostfildern\nGermany"
          },
          section2: {
            title: "Contact",
            content: "Phone: [Your Phone Number]\nEmail: richa@niramay.me"
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
              content: "The controller for data processing on this website is:\nRicha [Your Last Name]\n[Your Street]\n73760 Ostfildern\nEmail: richa@niramay.me"
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
      reviews: "Bewertungen",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sitzungen",
      bookNow: "Jetzt buchen",
      book: "Buch",
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
      tabs: {
        all: "Alle Dienste",
        physical: "Körperlich",
        mental: "Geistig",
        spiritual: "Spirituell",
      },
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
      bookBtn: "Platz reservieren",
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
            content: "Niramay - Ganzheitliches Wohlbefinden\nRicha [Ihr Nachname]\n[Ihre Straße & Hausnummer]\n73760 Ostfildern\nDeutschland"
          },
          section2: {
            title: "Kontakt",
            content: "Telefon: [Ihre Telefonnummer]\nE-Mail: richa@niramay.me"
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
              content: "Verantwortlicher für die Datenverarbeitung auf dieser Website ist:\nRicha [Ihr Nachname]\n[Ihre Straße]\n73760 Ostfildern\nE-Mail: richa@niramay.me"
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
    id: "back-yoga",
    EN: {
      title: "Strengthen Your Back",
      time: "Mondays, 18:00 - 19:00",
      description: "Yoga specifically designed to improve spinal health and core stability.",
      price: "€15 / session"
    },
    DE: {
      title: "Rücken stärken",
      time: "Montags, 18:00 - 19:00",
      description: "Yoga, das speziell zur Verbesserung der Wirbelsäulengesundheit und Rumpfstabilität entwickelt wurde.",
      price: "15 € / Sitzung"
    }
  },
  {
    id: "group-yoga",
    EN: {
      title: "Group Yoga Session",
      time: "Wednesdays, 09:00 - 10:30",
      description: "A balanced flow for all levels focusing on breath and alignment.",
      price: "€12 / session"
    },
    DE: {
      title: "Gruppen-Yoga-Sitzung",
      time: "Mittwochs, 09:00 - 10:30",
      description: "Ein ausgewogener Flow für alle Niveaus, der sich auf Atem und Ausrichtung konzentriert.",
      price: "12 € / Sitzung"
    }
  },
  {
    id: "dance-therapy",
    EN: {
      title: "Dance Therapy Session",
      time: "Fridays, 17:30 - 19:00",
      description: "Expressive movement to release emotional tension and find joy.",
      price: "€20 / session"
    },
    DE: {
      title: "Tanztherapie-Sitzung",
      time: "Freitags, 17:30 - 19:00",
      description: "Expressive Bewegung, um emotionale Spannungen zu lösen und Freude zu finden.",
      price: "20 € / Sitzung"
    }
  },
  {
    id: "mindfulness",
    EN: {
      title: "Stress Reduction Workshop",
      time: "Monthly (Check for dates)",
      description: "Intensive workshop on mindfulness and stress management techniques.",
      price: "€45 / workshop"
    },
    DE: {
      title: "Stressabbau-Workshop",
      time: "Monatlich (Termine prüfen)",
      description: "Intensiv-Workshop zu Achtsamkeit und Stressmanagement-Techniken.",
      price: "45 € / Workshop"
    }
  }
];
