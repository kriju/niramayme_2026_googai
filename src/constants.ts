import { Heart, Sparkles, Brain, ShieldCheck, Moon, Star, GraduationCap, Award, History, WandSparkles } from "lucide-react";

export const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0bFjK2E2xI3wiT55LqPigmiOHHDxGTghizdBbhy4MSdbw1p6CRUsxVk8gZYqJTnMgoKOAcJjZO?gv=true";
export const GOOGLE_REVIEW_URL = "https://www.google.com/search?q=Niramay+Ostfildern+reviews";

// The registered business address (same one disclosed in the Impressum,
// § 5 TMG requires it there anyway) — reused for the LocalBusiness JSON-LD,
// the visible footer NAP, and the Google Maps link/embed so all three stay
// in sync instead of drifting the way the old city-only footer text did.
export const BUSINESS_STREET_ADDRESS = "Ernst Kirchner Str 13/3";
export const BUSINESS_POSTAL_CODE = "73760";
export const BUSINESS_CITY = "Ostfildern";
export const GOOGLE_MAPS_QUERY = `Niramay Wellbeing, ${BUSINESS_STREET_ADDRESS}, ${BUSINESS_POSTAL_CODE} ${BUSINESS_CITY}, Germany`;
// The claimed Google Business Profile listing itself — used for the footer's
// address link and for LocalBusiness JSON-LD's sameAs/hasMap, since those
// need to resolve to the one stable, verified listing Google already
// associates with this business, not a re-derived text search that could
// (in principle) surface a different result.
export const GOOGLE_MAPS_URL = "https://share.google/Uz5At5p2SAwgCjhtb";
// Only the embedded map iframe still uses a plain text-query URL — Google's
// embed endpoint doesn't accept a share link, and a query-based embed is
// visually identical for that purpose.
export const GOOGLE_MAPS_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(GOOGLE_MAPS_QUERY)}&z=15&output=embed`;

// The only two people who can sign in to write/edit blog posts. Firebase
// Auth's email/password provider needs an email-shaped identifier, so a
// plain username like "rijuk" is mapped to `rijuk@niramay.me` under the
// hood — it's never a real inbox, just an internal login identifier. The
// matching allowlist lives in firestore.rules and api/_lib/blogAuth.ts.
export const BLOG_ADMIN_USERNAMES = ["rijuk", "richak"] as const;
export const BLOG_ADMIN_EMAIL_DOMAIN = "niramay.me";
export const usernameToLoginEmail = (username: string) => `${username.trim().toLowerCase()}@${BLOG_ADMIN_EMAIL_DOMAIN}`;

export const TRANSLATIONS = {
  EN: {
    nav: {
      services: "Services",
      about: "About Us",
      events: "Events",
      reviews: "Reviews",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sessions",
      courses: "Courses",
      bookNow: "Book Now",
      book: "My Book",
      switchLang: "Switch to German",
      // Navbar group labels: the desktop/mobile nav collapses the flat
      // list of links above into three dropdowns (About, Offerings, Read)
      // plus the standalone Reviews/FAQ links — see Navbar in App.tsx.
      aboutGroup: "About",
      trainers: "Trainers",
      offerings: "Offerings",
      read: "Read",
    },
    hero: {
      badge: "Holistic Wellbeing in Ostfildern, Germany",
      title: "Start Your Healing Journey Today.",
      titleItalic: "Healing",
      description: "Bridging ancient wisdom and modern psychology to help you find balance, clarity, and lasting transformation.",
      ctaPrimary: "Book a Free 15-Min Call",
      ctaSecondary: "Explore Services",
      latestReads: "Latest reads",
      seeAll: "All articles",
      reviewsLabel: "Client stories",
      bookLabel: "The book",
      bookCta: "Discover the book",
    },
    services: {
      title: "Outcome-Based Healing",
      description: "We don't just offer sessions; we offer solutions for your physical, mental, and spiritual well-being.",
      outcomeLabel: "The Outcome",
      learnMore: "Learn more & Book",
      priceLabel: "Investment",
    },
    servicePage: {
      home: "Home",
      breadcrumbServices: "Services",
      otherServicesTitle: "Explore Other Services",
      whatsappCta: "Or message us on WhatsApp",
      clientsSayTitle: "What clients say",
      formatLabel: "Format",
      priceLabel: "Investment",
      inclusionsLabel: "Inclusions",
    },
    about: {
      title: "Meet Your Healers",
      description: "Two teachers, one path — the husband-and-wife team behind every session, workshop, and Yoga Day celebration at Niramay.",
      richa: {
        name: "Richa Kansal",
        title: "Co-Founder & Certified Therapist",
        p1: "I am Richa, a certified therapist dedicated to helping individuals unlock their true potential. My approach combines the ancient practices of Yoga and Reiki with the modern psychological frameworks of NLP and Hypnotherapy.",
        p2: "Based in Ostfildern, I provide a safe, nurturing space for you to explore your inner world and emerge stronger, clearer, and more at peace.",
      },
      riju: {
        name: "Riju Kansal",
        title: "Co-Founder, Yoga Trainer & Yoga Therapist",
        p1: "I am Riju, Niramay's co-founder and a certified yoga trainer and yoga therapist, trained through S-VYASA and Vyasa Yoga Singapore. I work alongside my wife, Richa, bringing a steady, disciplined presence to our teacher trainings and ongoing group sessions.",
        p2: "My approach centers on consistency over intensity — helping students build practices that hold up in daily life, not just on the mat. Based in Ostfildern, I'm committed to making authentic, therapeutic yoga accessible to everyone who walks through Niramay's door.",
      },
      together: "Teaching side by side since 2018 — pictured at International Day of Yoga, hosted with the Consulate General of India, Munich.",
    },
    events: {
      title: "Moments From Our Journey",
      description: "A look back at the workshops, community classes, and International Yoga Day celebrations Richa & Riju have led since 2018.",
      featured: "Featured",
    },
    testimonials: {
      title: "Real Stories of Transformation",
      description: "In their own words: messages clients sent Richa after their sessions, shared here with their permission.",
      via: "via",
      client: "Client",
      originalIn: { EN: "Original in English", HI: "Original in Hindi" },
      translationLabel: "Translation",
      seeOriginal: "See original message",
      originalAlt: "Screenshot of the original message, cropped and with personal details removed",
      readMore: "Read more",
      showLess: "Show less",
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
      seeAll: "See all questions",
      pageTitle: "Frequently Asked Questions",
      pageDescription: "Answers about booking, sessions, our services and the Niramay team in Ostfildern — from your free discovery call to what to bring.",
      seoTitle: "FAQ — Yoga, Reiki & Holistic Therapy in Ostfildern | Niramay Wellbeing",
      seoDescription: "Answers to common questions about Niramay Wellbeing in Ostfildern: booking, session length, online sessions, language, cancellation, Reiki, hypnotherapy, Vedic astrology and more.",
      breadcrumb: "FAQ",
      categories: {
        start: "Getting Started",
        sessions: "Sessions & Logistics",
        services: "About Our Services",
        about: "About Niramay",
      },
      ctaTitle: "Still have a question?",
      ctaBody: "Book a free 15-minute call or message us on WhatsApp — we're happy to help.",
      ctaBook: "Book a Free 15-Min Call",
      ctaWhatsapp: "Message us on WhatsApp",
    },
    sessions: {
      title: "Ongoing Sessions",
      description: "Join our community sessions and workshops designed for consistent growth and healing.",
      bookBtn: "Join via WhatsApp",
      contactNote: "Reserve your spot via WhatsApp or email us at richa@niramay.me",
      by: "by",
    },
    courses: {
      title: "Courses",
      description: "Structured, multi-week courses and workshops taught by Richa & Riju — online series you can book right here, plus courses offered through VHS Ostfildern.",
      by: "by",
      registerVia: "Register via",
      courseNo: "Course No.",
      contactNote: "Questions about a course? Reach out via WhatsApp or email us at richa@niramay.me",
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
      viewOnGoogleMaps: "View on Google Maps",
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
            },
            {
              title: "7. Vedic Astrology & Tarot Requests",
              content: "If you request a Vedic Astrology reading, we collect your name, place of birth, date of birth, time of birth, and an email address or WhatsApp number through our booking form (or, if you contact us directly, via email or WhatsApp) solely to prepare your birth chart and coordinate your session. This data is stored only for as long as needed to prepare your chart and deliver your session, and is not shared with third parties. Likewise, if you book a Tarot Guidance & Clarity Session, we collect your name, the question you would like guidance on, and an email address or WhatsApp number solely to prepare your reading and coordinate your session, under the same terms. You must actively confirm your consent before this data is submitted, and you may withdraw consent and request deletion of this data at any time by contacting richa@niramay.me."
            },
            {
              title: "8. Analytics (Google Analytics)",
              content: "With your consent, given via the cookie banner shown on your first visit, this website uses Google Analytics 4, a web analytics service provided by Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland). Google Analytics uses cookies to help us understand how visitors use the site (e.g. which pages are viewed and for how long). Google may transfer this data to servers in the United States. We use Google Analytics only after you accept via the banner; you may decline or withdraw consent at any time, in which case no Google Analytics cookies are set or, if already set, are no longer used for tracking. Withdraw your consent by clearing your browser's cookies for this site and choosing \"Decline\" on the banner shown afterward."
            },
            {
              title: "9. Blog Comments, Likes & Sharing",
              content: "When you comment on a blog post, we store your comment, the time it was posted and — unless you choose to post anonymously — the name you enter. Comments are published on this website. No email address is required. To prevent spam and abuse, a one-way keyed hash of your IP address is kept briefly for rate limiting and then deleted automatically; it is never stored with your comment. Likes and dislikes are counted using a random identifier stored in your browser's local storage, which is not linked to you personally. Share buttons are plain links: no third-party social media scripts are loaded, and no data is sent to a social network unless you click one. To have a comment removed, contact richa@niramay.me."
            },
            {
              title: "10. Reiki Session Requests",
              content: "If you book or request a Reiki session, we collect your name, email address, WhatsApp number and what you would like Reiki support with through our booking form, solely to arrange and deliver your session and to send you a confirmation email. This data is shared with Richa (richa@niramay.me) to contact you about next steps, is stored only for as long as needed to arrange and deliver your session, and is not shared with third parties. In-person sessions are scheduled via Google Calendar (see section 4). You must actively confirm your consent before this data is submitted, and you may withdraw consent and request deletion of this data at any time by contacting richa@niramay.me."
            },
            {
              title: "11. Online Course Bookings",
              content: "If you book an online course (such as the Yoga for Stress, Immunity & Sleep series or the Yoga Adventure kids workshop), we collect your name, email address, WhatsApp number, the session date you choose and any optional notes you give us (for a children's workshop, e.g. your child's name and age) through our booking form, solely to organise the course, match your payment, send you a confirmation email and email you the online meeting link before the session. This data is shared with Riju (riju.kansal@niramay.me) and Richa (richa@niramay.me), is stored only for as long as needed to run the course and handle payment, and is not shared with third parties. You must actively confirm your consent before this data is submitted, and you may withdraw consent and request deletion of this data at any time by contacting riju.kansal@niramay.me."
            }
          ]
        }
      }
    },
    cookieConsent: {
      message: "We use cookies to understand how visitors use this site via Google Analytics. We only set them with your consent.",
      privacyLink: "Privacy Policy",
      accept: "Accept",
      reject: "Decline",
    },
    blog: {
      title: "Insights & Wisdom",
      description: "Explore our collection of articles on holistic healing, yoga, and mindfulness.",
      readMore: "Read Full Article",
      loadMore: "Load More",
      showLess: "Show Less",
      backToList: "Back to Blog",
      addPost: "Add New Post",
      emptyState: "New articles are on the way — check back soon.",
      emptyStateFiltered: "No posts in this category yet.",
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
        newTitle: "New Post",
        editTitle: "Edit Post",
        titleLabel: "Post Title",
        excerptLabel: "Short Summary",
        contentLabel: "Main Content",
        contentHint: "Press Enter to start a new paragraph. See the formatting guide below for headings, bold, italic and bullet points.",
        formattingGuideTitle: "Formatting guide",
        categoryLabel: "Category",
        imageLabel: "Image (optional)",
        audioLabel: "Audio (optional)",
        uploadImage: "Upload Image",
        uploadAudio: "Upload Audio",
        uploading: "Uploading...",
        remove: "Remove",
        saveDraft: "Save Draft",
        publish: "Publish",
        saving: "Saving...",
        cancel: "Cancel",
        delete: "Delete",
        deleteConfirm: "Delete this post? This can't be undone.",
        yourPosts: "Your Posts",
        noPosts: "No posts yet — write your first one above.",
        statusPublished: "Published",
        statusDraft: "Draft",
        edit: "Edit",
        translateToGerman: "Translate to German",
        translating: "Translating...",
        translateError: "Translation failed. Please try again.",
        translateHint: "Creates a new German draft from this post — review it before publishing.",
      }
    },
    write: {
      pageTitle: "Niramay Blog",
      usernameLabel: "Username",
      passwordLabel: "Password",
      signIn: "Sign In",
      signingIn: "Signing in...",
      signOut: "Sign Out",
      invalidCredentials: "Invalid username or password.",
    },
    blogPost: {
      home: "Home",
      breadcrumbBlog: "Blog",
      listenLabel: "Listen to this article",
      otherPostsTitle: "More Posts",
      byline: "Written by",
      authoredBy: "Article authored by",
    },
    engagement: {
      like: "Like",
      dislike: "Dislike",
      likedAria: "You liked this post",
      dislikedAria: "You disliked this post",
      voteError: "Couldn't save your vote. Please try again.",
      share: "Share",
      shareTitle: "Share this post",
      copyLink: "Copy link",
      linkCopied: "Link copied!",
      copyFailed: "Couldn't copy — select the link above and copy it manually.",
      email: "Email",
      commentsTitle: "Comments",
      commentsLoading: "Loading comments…",
      commentsLoadError: "Couldn't load comments.",
      retry: "Try again",
      noComments: "No comments yet — be the first to share your thoughts.",
      showMore: "Show more comments",
      formTitle: "Leave a comment",
      nameLabel: "Your name",
      namePlaceholder: "Shown with your comment",
      anonymousLabel: "Post anonymously",
      anonymousHint: "Your name won't be shown or stored.",
      commentLabel: "Your comment",
      commentPlaceholder: "Share your thoughts or ask a question…",
      charsLeft: "characters left",
      submit: "Post Comment",
      submitting: "Posting…",
      posted: "Thank you — your comment is live.",
      pendingNotice: "Thank you! Comments containing links are reviewed before they appear.",
      publicNotice: "Comments are public. Please don't share private health details.",
      anonymous: "Anonymous",
      authorBadge: "Author",
      reply: "Reply",
      replyPlaceholder: "Write your reply…",
      sendReply: "Send Reply",
      cancel: "Cancel",
      statusPending: "Awaiting approval",
      statusHidden: "Hidden",
      approve: "Publish",
      hide: "Hide",
      unhide: "Show",
      delete: "Delete",
      deleteConfirm: "Delete this comment and any replies to it? This can't be undone.",
      moderationHint: "Signed in as an author — you can reply to and moderate comments.",
      errors: {
        invalid_content: "Please write between 2 and 2000 characters.",
        name_required: "Please enter your name, or choose to post anonymously.",
        invalid_name: "Please use a name of up to 60 characters.",
        reserved_name: "That name is reserved for the authors. Please use another name or post anonymously.",
        rate_limited: "You've posted several comments in a short time. Please wait a few minutes and try again.",
        not_found: "This post is no longer available for comments.",
        parent_unavailable: "That comment is no longer visible, so it can't be replied to.",
        unauthorized: "Your session has expired. Please sign in again.",
        forbidden: "You're not allowed to do that.",
        network: "Couldn't reach the server. Check your connection and try again — your text is kept.",
        generic: "Something went wrong. Please try again.",
      },
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
          description: "Share your exact date, time, and place of birth through our secure form.",
        },
        {
          title: "Secure Your Slot",
          description: "Pay the session fee in advance to confirm your request and begin chart preparation.",
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
    astrologyIntake: {
      step1Title: "Your Birth Details",
      step2Title: "Complete Your Payment",
      fields: {
        name: "Full Name",
        placeOfBirth: "Place of Birth",
        placeOfBirthPlaceholder: "City, Country",
        dateOfBirth: "Date of Birth",
        timeOfBirth: "Time of Birth",
        timeOfBirthHint: "Local time at your birth place, as exact as you have it.",
        contact: "Email or WhatsApp Number",
        contactHint: "We'll send your confirmation and appointment details here.",
      },
      consentPrefix: "I agree to Niramay storing these details to prepare my chart, per the",
      consentLinkLabel: "Privacy Policy",
      continueBtn: "Continue to Payment",
      backBtn: "Back",
      submitting: "Submitting...",
      submitError: "Something went wrong sending your details. Please try again.",
      refCodeLabel: "Your reference code",
      refCodeNote: "Include this in your payment note so we can match it to your request quickly.",
      priceLabel: "Price",
      priceValue: "25 EUR or 2500 INR",
      paymentEURTitle: "Pay in EUR",
      paypalLabel: "PayPal",
      paypalNote: "Usually confirmed within hours.",
      bankLabel: "Bank Transfer",
      bankNote: "SEPA transfers can take 1–2 business days to confirm.",
      paymentINRTitle: "Pay in INR",
      upiLabel: "UPI",
      upiNote: "Usually confirmed within hours.",
      paidBtn: "I've Paid",
      paidSubmitting: "Confirming...",
      paidError: "Couldn't confirm your payment claim. Please try again, or message us on WhatsApp.",
      confirmationTitle: "Thank you!",
      confirmationBody: "We've noted your payment claim and will confirm your appointment slot within 24–48 hours.",
      confirmationSentTo: "Confirmation will be sent to:",
      whatsappFallbackTitle: "Prefer WhatsApp instead?",
      whatsappFallbackBtn: "Message us on WhatsApp",
      whatsappTemplate: "Hi Richa, I'd like to book a Vedic Astrology reading.\nName:\nPlace of Birth:\nDate of Birth:\nTime of Birth:",
      closeBtn: "Close",
    },
    reiki: {
      badge: "Harmonize Mind, Body & Spirit",
      supportsTitle: "What Reiki Supports",
      supportsItems: [
        { title: "Stress & Burnout", description: "Calms the overstimulated mind and resets the nervous system." },
        { title: "Emotional Release", description: "Gently dissolves accumulated trauma, grief, anxiety, and unexpressed emotions." },
        { title: "Physical Vitality", description: "Eases tension, relieves chronic fatigue, and supports restful, restorative sleep." },
        { title: "Mental Clarity", description: "Clears energetic brain fog, restoring focus, groundedness, and intuitive flow." },
      ],
      howTitle: "In-Person vs. Distance Healing: How It Works",
      howItems: [
        { title: "In-Person Reiki", description: "You rest fully clothed and comfortable in a serene, grounding space while gentle, light touch or off-body hand placements are applied over your energy pathways and chakras. Many clients experience warmth, gentle tingling, or deep meditative rest." },
        { title: "Distance Reiki (Across the Globe)", description: "Energy is not constrained by time or physical space. Distance Reiki uses sacred frequency connection and focused intention to direct the flow of universal life force to wherever you are in the world. You simply relax in your quiet space at home during the session, receiving the exact same balancing frequency and emotional release." },
      ],
      packagesTitle: "Session Options & Packages",
      formatLabel: "Format",
      investmentLabel: "Investment",
      focusLabel: "Focus",
      packages: {
        "in-person": {
          title: "In-Person Reiki Immersion",
          format: "In-Person (45 mins)",
          investment: "€40",
          focus: "Deep somatic reset, tactile energetic recalibration, and localized tension release.",
          cta: "Book In-Person Session",
        },
        "distance-single": {
          title: "Distance Reiki — Single Session",
          format: "Remote (30 mins)",
          investment: "€20 / ₹2,000",
          focus: "Quick energetic alignment, chakra clearing, and acute stress relief from home.",
          cta: "Request Distance Session",
        },
        "distance-renewal": {
          title: "Distance Reiki Renewal Package (3 Sessions)",
          format: "Remote (3 × 30-min sessions)",
          investment: "€55 / ₹5,900",
          focus: "Layered healing, long-term chakra balancing, sustained emotional release, and energetic maintenance.",
          cta: "Request Renewal Package",
        },
      },
      cta: "Choose Your Session",
    },
    reikiIntake: {
      detailsTitle: "Your Details",
      calendarTitle: "Pick Your Session Slot",
      calendarDesc: "Choose a time that suits you in the calendar below, then continue to payment.",
      calendarDoneBtn: "I've Booked My Slot — Continue to Payment",
      calendarOpenTab: "Trouble viewing? Open in new tab",
      paymentTitle: "Complete Your Payment",
      selectedLabel: "Selected session",
      fields: {
        name: "Full Name",
        email: "Email",
        whatsapp: "WhatsApp Number",
        whatsappPlaceholder: "+49 …",
        reason: "What do you need Reiki for?",
        reasonPlaceholder: "e.g. stress, poor sleep, emotional heaviness…",
      },
      consentPrefix: "I agree to Niramay storing these details to arrange my session, per the",
      consentLinkLabel: "Privacy Policy",
      continueBtn: "Continue to Booking",
      sendBtn: "Send Request",
      backBtn: "Back",
      submitting: "Submitting...",
      submitError: "Something went wrong sending your details. Please try again.",
      refCodeLabel: "Your reference code",
      refCodeNote: "Include this in your payment note so we can match it to your booking quickly.",
      priceLabel: "Price",
      paymentEURTitle: "Pay in EUR",
      paypalLabel: "PayPal",
      paypalNote: "Usually confirmed within hours.",
      bankLabel: "Bank Transfer",
      bankNote: "SEPA transfers can take 1–2 business days to confirm.",
      paidBtn: "I've Paid",
      paidSubmitting: "Confirming...",
      paidError: "Couldn't confirm your payment claim. Please try again, or message us on WhatsApp.",
      confirmationTitle: "Thank you!",
      inPersonConfirmationBody: "We've noted your payment claim and will confirm your in-person session within 24–48 hours.",
      distanceConfirmationBody: "Your request has been sent to Richa. She will get in touch with you for the next steps.",
      confirmationSentTo: "A confirmation email has been sent to:",
      closeBtn: "Close",
    },
    yogaSeries: {
      badge: "Online · 8-Session Series",
      seoTitle: "Yoga for Stress, Immunity & Sleep — 8-Session Online Series | Niramay Wellbeing",
      seoDescription: "An 8-session live online yoga series (Tue & Thu, 8–9 pm, 4 weeks) with gentle stretching, breathing, meditation and deep relaxation to improve stress handling, immunity and sleep. €79.",
      breadcrumbCourses: "Courses",
      intro: "A gentle, structured 4-week online series to calm your nervous system, strengthen your body's natural defences and help you sleep more deeply. Each live session builds on the last, so by the end you have a simple routine you can keep using on your own.",
      scheduleLabel: "Schedule",
      schedule: "Every Tuesday & Thursday, 8:00–9:00 pm (German time), starting Tuesday, 3 November 2026",
      durationLabel: "Duration",
      duration: "4 weeks · 3–26 November 2026 · 8 sessions in total",
      formatLabel: "Format",
      format: "Live online — the meeting link is emailed one day before the session",
      priceLabel: "Price",
      price: "€79 for all 8 sessions",
      learnTitle: "What You Will Learn",
      learnItems: [
        { title: "Gentle Stretching & Loosening", description: "Yoga postures that release stiffness and tension held in the body after a long day." },
        { title: "Breathing Practices", description: "Simple pranayama techniques that calm the mind and settle the nervous system." },
        { title: "Meditation", description: "Guided practices to quieten mental chatter and build inner steadiness." },
        { title: "Deep Relaxation", description: "Restorative relaxation techniques that prepare the body for deeper, more restful sleep." },
      ],
      benefitsTitle: "Why It Helps",
      benefits: [
        "Handle everyday stress with more calm and clarity",
        "Support your immune system by reducing the strain of chronic stress",
        "Fall asleep more easily and wake up more rested",
        "Leave with a simple daily routine you can practise on your own",
      ],
      howTitle: "How Booking Works",
      howSteps: [
        "Fill in your details and reserve your place.",
        "Pay €79 via PayPal or bank transfer using your reference code.",
        "Confirm your payment — you'll receive a confirmation email straight away.",
        "One day before the session, we email you the online meeting link.",
      ],
      blogTitle: "Read More on This Topic",
      blogDescription: "Learn how yoga works on stress, immunity and sleep in our blog article.",
      blogLinkLabel: "Stress, Immunity and Sleep: How Yoga Restores Your Balance",
      questionsNote: "Questions? Email us at",
      moreInfoBtn: "More Info",
      bookBtn: "Book & Pay",
      bookCta: "Book Your Place — €79",
    },
    yogaAdventure: {
      badge: "Online · Kids 9–14 · Workshop",
      seoTitle: "Yoga Adventure for Kids (9–14) — Online Yoga Workshop | Niramay Wellbeing",
      seoDescription: "A fun, interactive 1.5-hour online yoga workshop for children aged 9–14: movement, breathing, focus, games and self-discovery in a small group of max. 12. Choose 24 or 29 October. €15 / ₹1500.",
      breadcrumbCourses: "Courses",
      intro: "A playful opportunity for children to experience yoga through movement, breathing, focus, games and self-discovery, in a small, interactive group. This is ONE workshop offered on TWO dates — you only choose one date, and the fee is for that one session. Registrations are open until 20 October.",
      scheduleLabel: "Choose ONE date",
      schedule: "Sat 24 Oct, 12:30–2:00 pm European time (4:00–5:30 pm IST) — or — Thu 29 Oct, 11:30 am–1:00 pm European time (4:00–5:30 pm IST)",
      durationLabel: "Duration",
      duration: "1.5 hours · one session",
      formatLabel: "Format",
      format: "Live online in English · ages 9–14 · max. 12 children per session · the meeting link is emailed one day before",
      priceLabel: "Price",
      price: "€15 / ₹1500 per child, per session",
      learnTitle: "What Your Child Will Experience",
      learnItems: [
        { title: "Move", description: "Playful yoga poses and flows that build strength, balance and flexibility." },
        { title: "Breathe", description: "Simple, child-friendly breathing practices to calm down and feel steady." },
        { title: "Play", description: "Yoga games that make focus and concentration fun." },
        { title: "Discover", description: "Moments of stillness and self-discovery to notice how body and mind feel." },
      ],
      benefitsTitle: "Why It Helps",
      benefits: [
        "Releases energy in a healthy, joyful way",
        "Builds focus and concentration through play",
        "Gives children simple tools to calm themselves",
        "A small group, so every child gets attention",
      ],
      howTitle: "How Booking Works",
      howSteps: [
        "Choose your preferred date and fill in your details (registration closes 20 October).",
        "Pay €15 via PayPal or bank transfer, or ₹1500 via UPI, using your reference code.",
        "Confirm your payment — you'll receive a confirmation email straight away.",
        "One day before the session, we email you the online meeting link.",
      ],
      blogTitle: "Read More on This Topic",
      blogDescription: "",
      blogLinkLabel: "",
      questionsNote: "Questions? Email us at",
      moreInfoBtn: "More Info",
      bookBtn: "Book & Pay",
      bookCta: "Reserve Your Child's Spot — €15 / ₹1500",
    },
    courseIntake: {
      detailsTitle: "Reserve Your Place",
      paymentTitle: "Complete Your Payment",
      selectedLabel: "Selected course",
      sessionLabel: "Choose ONE date",
      registrationClosed: "Registration closed",
      fields: {
        name: "Full Name",
        email: "Email",
        whatsapp: "WhatsApp Number",
        whatsappPlaceholder: "+49 …",
        notes: "Anything we should know? (optional)",
        notesPlaceholder: "e.g. injuries, health conditions, experience with yoga…",
      },
      consentPrefix: "I agree to Niramay storing these details to organise my course, per the",
      consentLinkLabel: "Privacy Policy",
      continueBtn: "Continue to Payment",
      backBtn: "Back",
      submitting: "Submitting...",
      submitError: "Something went wrong sending your details. Please try again.",
      refCodeLabel: "Your reference code",
      refCodeNote: "Include this in your payment note so we can match it to your booking quickly.",
      priceLabel: "Price",
      paymentEURTitle: "Pay in EUR",
      paypalLabel: "PayPal",
      paypalNote: "Usually confirmed within hours.",
      bankLabel: "Bank Transfer",
      bankNote: "SEPA transfers can take 1–2 business days to confirm.",
      paymentINRTitle: "Pay in INR",
      upiLabel: "UPI",
      upiNote: "Usually confirmed within hours.",
      paidBtn: "I've Paid",
      paidSubmitting: "Confirming...",
      paidError: "Couldn't confirm your payment claim. Please try again, or email {email}.",
      confirmationTitle: "You're booked in!",
      confirmationBody: "Thank you for joining. We'll verify your payment, and you'll receive the online meeting link by email one day before the session.",
      confirmationSentTo: "A confirmation email has been sent to:",
      questionsNote: "Questions? Email",
      closeBtn: "Close",
    },
    guidanceIntake: {
      cta: "Book Your Session",
      step1Title: "Book Your Session",
      packageLabel: "Choose your session",
      packages: {
        individual: { title: "Individual Soul Counseling & Guidance", price: "€50 / ₹5,000", priceValue: "50 EUR or 5000 INR" },
        couple: { title: "Relationship & Couple Guidance", price: "€90 / ₹9,000", priceValue: "90 EUR or 9000 INR" },
      },
      yourDetailsTitle: "Your birth details",
      partnerDetailsTitle: "Your partner's birth details",
      partnerName: "Partner's Full Name",
      consentPrefix: "I agree to Niramay storing these details to prepare my session, per the",
      whatsappTemplate: "Hi Richa, I'd like to book an Intuitive Guidance & Soul Counseling session.\nSession (individual / couple):\nName:\nPlace of Birth:\nDate of Birth:\nTime of Birth:",
      bookThisBtn: "Book this session",
    },
    // Tarot reuses the astrology intake's pay-first flow (see
    // AstrologyIntakeModal in src/App.tsx); only the keys that differ live here.
    tarotIntake: {
      step1Title: "Your Reading Details",
      fields: {
        question: "Your Question",
        questionPlaceholder: "What would you like clarity on? (career, relationships, a decision...)",
        questionHint: "One focused question works best. You can add a little background if it helps.",
      },
      consentPrefix: "I agree to Niramay storing these details to prepare my reading, per the",
      priceValue: "€10 / ₹1,000",
      confirmationBody: "We've noted your payment claim and will be in touch within 24–48 hours to schedule your online reading.",
      whatsappTemplate: "Hi Richa, I'd like to book a Tarot Guidance & Clarity Session.\nName:\nMy question:",
    },
    book: {
      title: "Journey from Body to Bliss",
      subtitle: "The Niramay Path to Pancha Koshas",
      description: "Explore the transformative path of holistic healing through the Five Sheaths (Pancha Koshas) of human existence. From physical vitality to spiritual ecstasy, this book provides a comprehensive roadmap for self-discovery and lasting transformation.",
      author: "Richa Jain Kansal",
      cta: "Order on Amazon",
      cover: "/bookcover-en.webp",
      link: "https://www.amazon.de/stores/Richa-Jain-Kansal/author/B0H3W87WW9?language=en&ref=sr_ntt_srch_lnk_1&qid=1790675468&sr=8-1&shoppingPortalEnabled=true",
      badges: ["Holistic Guide", "Ancient Wisdom"],
    },
    auth: {
      navLogIn: "Log In",
      navSignUp: "Sign Up",
      navLogOut: "Log Out",
      helloPrefix: "Hi, ",
      loginTitle: "Welcome Back",
      loginDesc: "Log in to your Niramay account.",
      signUpTitle: "Create Your Account",
      signUpDesc: "Save your details so booking and reviews are quicker next time.",
      resetTitle: "Reset Your Password",
      resetDesc: "Enter your email and we'll send you a reset link.",
      fields: {
        name: "Full Name",
        email: "Email",
        password: "Password",
      },
      passwordHint: "At least 8 characters, with a letter and a number.",
      loginBtn: "Log In",
      loginSubmitting: "Logging in...",
      signUpBtn: "Create Account",
      signUpSubmitting: "Creating account...",
      resetBtn: "Send Reset Link",
      resetSubmitting: "Sending...",
      resetSuccess: "Check your inbox for a password reset link.",
      switchToSignUp: "Don't have an account? Sign up",
      switchToLogin: "Already have an account? Log in",
      forgotPassword: "Forgot your password?",
      backToLogin: "Back to log in",
      errors: {
        invalidCredential: "Incorrect email or password.",
        emailInUse: "An account already exists with this email.",
        weakPassword: "Password must be at least 8 characters, with a letter and a number.",
        invalidEmail: "Please enter a valid email address.",
        tooManyRequests: "Too many attempts. Please wait a moment and try again.",
        generic: "Something went wrong. Please try again.",
      },
    },
  },
  DE: {
    nav: {
      services: "Dienstleistungen",
      about: "Über uns",
      events: "Veranstaltungen",
      reviews: "Bewertungen",
      blog: "Blog",
      faq: "FAQ",
      sessions: "Sitzungen",
      courses: "Kurse",
      bookNow: "Jetzt buchen",
      book: "Mein Buch",
      switchLang: "Auf Englisch wechseln",
      aboutGroup: "Über uns",
      trainers: "Trainer",
      offerings: "Angebote",
      read: "Lesen",
    },
    hero: {
      badge: "Ganzheitliches Wohlbefinden in Ostfildern, Deutschland",
      title: "Beginnen Sie heute Ihre Heilungsreise.",
      titleItalic: "Heilungs",
      description: "Die Verbindung von altem Wissen und moderner Psychologie, um Ihnen zu helfen, Balance, Klarheit und dauerhafte Transformation zu finden.",
      ctaPrimary: "Kostenloses 15-Min-Gespräch buchen",
      ctaSecondary: "Dienstleistungen erkunden",
      latestReads: "Neu zu lesen",
      seeAll: "Alle Artikel",
      reviewsLabel: "Stimmen unserer Klienten",
      bookLabel: "Das Buch",
      bookCta: "Buch entdecken",
    },
    services: {
      title: "Ergebnisorientierte Heilung",
      description: "Wir bieten nicht nur Sitzungen an; wir bieten Lösungen für Ihr körperliches, geistiges und spirituelles Wohlbefinden.",
      outcomeLabel: "Das Ergebnis",
      learnMore: "Mehr erfahren & buchen",
      priceLabel: "Investition",
    },
    servicePage: {
      home: "Startseite",
      breadcrumbServices: "Leistungen",
      otherServicesTitle: "Weitere Angebote entdecken",
      whatsappCta: "Oder schreiben Sie uns auf WhatsApp",
      clientsSayTitle: "Das sagen Klientinnen und Klienten",
      formatLabel: "Format",
      priceLabel: "Investition",
      inclusionsLabel: "Enthalten",
    },
    about: {
      title: "Lernen Sie Ihre Therapeuten kennen",
      description: "Zwei Lehrende, ein gemeinsamer Weg — das Ehepaar hinter jeder Sitzung, jedem Workshop und jeder Yoga-Tag-Feier bei Niramay.",
      richa: {
        name: "Richa Kansal",
        title: "Mitgründerin & zertifizierte Therapeutin",
        p1: "Ich bin Richa, eine zertifizierte Therapeutin, die sich darauf spezialisiert hat, Menschen dabei zu helfen, ihr wahres Potenzial zu entfalten. Mein Ansatz kombiniert die alten Praktiken von Yoga und Reiki mit den modernen psychologischen Rahmenbedingungen von NLP und Hypnotherapie.",
        p2: "In Ostfildern ansässig, biete ich einen sicheren, nährenden Raum, in dem Sie Ihre innere Welt erkunden und stärker, klarer und friedvoller hervorgehen können.",
      },
      riju: {
        name: "Riju Kansal",
        title: "Mitgründer, Yogalehrer & Yogatherapeut",
        p1: "Ich bin Riju, Mitgründer von Niramay sowie zertifizierter Yogalehrer und Yogatherapeut, ausgebildet bei S-VYASA und Vyasa Yoga Singapur. Gemeinsam mit meiner Frau Richa leite ich unsere Yogalehrer-Ausbildungen und laufenden Gruppensitzungen mit ruhiger, disziplinierter Präsenz.",
        p2: "Mein Ansatz setzt auf Beständigkeit statt Intensität — ich helfe meinen Schülern, Praktiken zu entwickeln, die auch im Alltag Bestand haben, nicht nur auf der Matte. Von Ostfildern aus setze ich mich dafür ein, authentisches, therapeutisches Yoga für jeden zugänglich zu machen, der zu Niramay kommt.",
      },
      together: "Seit 2018 gemeinsam unterrichtend — hier beim Internationalen Tag des Yoga, ausgerichtet mit dem Generalkonsulat von Indien, München.",
    },
    events: {
      title: "Momente unserer Reise",
      description: "Ein Rückblick auf die Workshops, Gemeinschaftskurse und Internationalen Yoga-Tag-Feiern, die Richa & Riju seit 2018 geleitet haben.",
      featured: "Ausgewählt",
    },
    testimonials: {
      title: "Echte Geschichten der Transformation",
      description: "In ihren eigenen Worten: Nachrichten, die Klientinnen und Klienten Richa nach ihren Sitzungen geschickt haben, hier mit ihrer Erlaubnis geteilt.",
      via: "über",
      client: "Klient:in",
      originalIn: { EN: "Originalzitat auf Englisch", HI: "Originalzitat auf Hindi" },
      translationLabel: "Übersetzung",
      seeOriginal: "Originalnachricht ansehen",
      originalAlt: "Screenshot der Originalnachricht, zugeschnitten und ohne persönliche Daten",
      readMore: "Weiterlesen",
      showLess: "Weniger anzeigen",
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
      seeAll: "Alle Fragen ansehen",
      pageTitle: "Häufig gestellte Fragen",
      pageDescription: "Antworten rund um Buchung, Sitzungen, unsere Angebote und das Niramay-Team in Ostfildern – vom kostenlosen Kennenlerngespräch bis zur Frage, was Sie mitbringen sollten.",
      seoTitle: "FAQ — Yoga, Reiki & Ganzheitliche Therapie in Ostfildern | Niramay Wellbeing",
      seoDescription: "Antworten auf häufige Fragen zu Niramay Wellbeing in Ostfildern: Buchung, Sitzungsdauer, Online-Sitzungen, Sprache, Stornierung, Reiki, Hypnotherapie, vedische Astrologie und mehr.",
      breadcrumb: "FAQ",
      categories: {
        start: "Erste Schritte",
        sessions: "Sitzungen & Organisatorisches",
        services: "Zu unseren Angeboten",
        about: "Über Niramay",
      },
      ctaTitle: "Noch Fragen offen?",
      ctaBody: "Buchen Sie ein kostenloses 15-minütiges Gespräch oder schreiben Sie uns auf WhatsApp – wir helfen gern weiter.",
      ctaBook: "Kostenloses 15-Min-Gespräch buchen",
      ctaWhatsapp: "Auf WhatsApp schreiben",
    },
    sessions: {
      title: "Laufende Sitzungen",
      description: "Nehmen Sie an unseren Gemeinschaftssitzungen und Workshops teil, die auf stetiges Wachstum und Heilung ausgelegt sind.",
      bookBtn: "Über WhatsApp beitreten",
      contactNote: "Reservieren Sie Ihren Platz über WhatsApp oder schreiben Sie uns eine E-Mail an richa@niramay.me",
      by: "von",
    },
    courses: {
      title: "Kurse",
      description: "Mehrwöchige Kurse und Workshops von Richa & Riju – Online-Serien, die Sie direkt hier buchen können, sowie Kurse über die VHS Ostfildern.",
      by: "von",
      registerVia: "Anmelden über",
      courseNo: "Kursnr.",
      contactNote: "Fragen zu einem Kurs? Schreiben Sie uns über WhatsApp oder per E-Mail an richa@niramay.me",
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
      viewOnGoogleMaps: "Auf Google Maps ansehen",
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
            },
            {
              title: "7. Anfragen für vedische Astrologie & Tarot",
              content: "Wenn Sie eine vedische Astrologie-Lesung anfragen, erfassen wir über unser Buchungsformular (oder, falls Sie uns direkt kontaktieren, per E-Mail oder WhatsApp) Ihren Namen, Geburtsort, Ihr Geburtsdatum, Ihre Geburtszeit sowie eine E-Mail-Adresse oder WhatsApp-Nummer, ausschließlich zur Erstellung Ihres Geburtshoroskops und zur Koordination Ihrer Sitzung. Diese Daten werden nur so lange gespeichert, wie es für die Vorbereitung Ihres Horoskops und die Durchführung Ihrer Sitzung erforderlich ist, und nicht an Dritte weitergegeben. Ebenso erfassen wir, wenn Sie eine Tarot-Beratung & Klarheits-Sitzung buchen, Ihren Namen, die Frage, zu der Sie sich Begleitung wünschen, sowie eine E-Mail-Adresse oder WhatsApp-Nummer, ausschließlich zur Vorbereitung Ihrer Lesung und zur Koordination Ihrer Sitzung, zu denselben Bedingungen. Sie müssen Ihre Einwilligung vor dem Absenden dieser Daten aktiv bestätigen; Sie können Ihre Einwilligung jederzeit widerrufen und die Löschung dieser Daten verlangen, indem Sie uns unter richa@niramay.me kontaktieren."
            },
            {
              title: "8. Analyse (Google Analytics)",
              content: "Mit Ihrer über den beim ersten Besuch angezeigten Cookie-Banner erteilten Einwilligung nutzt diese Website Google Analytics 4, einen Webanalysedienst der Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland). Google Analytics verwendet Cookies, damit wir nachvollziehen können, wie Besucher:innen die Website nutzen (z. B. welche Seiten aufgerufen und wie lange sie betrachtet werden). Google kann diese Daten an Server in den USA übertragen. Wir setzen Google Analytics nur nach Ihrer Zustimmung über den Banner ein; Sie können die Zustimmung jederzeit ablehnen oder widerrufen — in diesem Fall werden keine Google-Analytics-Cookies gesetzt bzw. bereits gesetzte nicht mehr zu Tracking-Zwecken verwendet. Widerrufen Sie Ihre Zustimmung, indem Sie die Cookies Ihres Browsers für diese Website löschen und beim danach angezeigten Banner „Ablehnen“ wählen."
            },
            {
              title: "9. Blog-Kommentare, Bewertungen & Teilen",
              content: "Wenn Sie einen Blogbeitrag kommentieren, speichern wir Ihren Kommentar, den Zeitpunkt und — sofern Sie nicht anonym posten — den eingegebenen Namen. Kommentare werden auf dieser Website veröffentlicht. Eine E-Mail-Adresse ist nicht erforderlich. Zum Schutz vor Spam und Missbrauch wird ein nicht umkehrbarer, verschlüsselter Hash Ihrer IP-Adresse kurzzeitig zur Begrenzung der Anfragen gespeichert und danach automatisch gelöscht; er wird nie mit Ihrem Kommentar gespeichert. „Gefällt mir“-Bewertungen werden über eine zufällige Kennung im lokalen Speicher Ihres Browsers gezählt, die nicht mit Ihrer Person verknüpft ist. Die Teilen-Schaltflächen sind einfache Links: Es werden keine Skripte sozialer Netzwerke geladen, und es werden keine Daten an ein soziales Netzwerk übermittelt, solange Sie keine davon anklicken. Für die Löschung eines Kommentars wenden Sie sich an richa@niramay.me."
            },
            {
              title: "10. Anfragen für Reiki-Sitzungen",
              content: "Wenn Sie eine Reiki-Sitzung buchen oder anfragen, erfassen wir über unser Buchungsformular Ihren Namen, Ihre E-Mail-Adresse, Ihre WhatsApp-Nummer und wobei Sie sich Unterstützung durch Reiki wünschen, ausschließlich zur Organisation und Durchführung Ihrer Sitzung und zum Versand einer Bestätigungs-E-Mail. Diese Daten werden an Richa (richa@niramay.me) weitergeleitet, damit sie Sie wegen der nächsten Schritte kontaktieren kann, nur so lange gespeichert, wie es für die Organisation und Durchführung Ihrer Sitzung erforderlich ist, und nicht an Dritte weitergegeben. Sitzungen vor Ort werden über Google Calendar terminiert (siehe Abschnitt 4). Sie müssen Ihre Einwilligung vor dem Absenden dieser Daten aktiv bestätigen; Sie können Ihre Einwilligung jederzeit widerrufen und die Löschung dieser Daten verlangen, indem Sie uns unter richa@niramay.me kontaktieren."
            },
            {
              title: "11. Buchungen von Online-Kursen",
              content: "Wenn Sie einen Online-Kurs buchen (etwa die Serie Yoga für Stress, Immunität & Schlaf oder den Kinder-Workshop Yoga-Abenteuer), erfassen wir über unser Buchungsformular Ihren Namen, Ihre E-Mail-Adresse, Ihre WhatsApp-Nummer, den gewählten Termin und optionale Hinweise (bei Kinder-Workshops z. B. Name und Alter Ihres Kindes), ausschließlich um den Kurs zu organisieren, Ihre Zahlung zuzuordnen, Ihnen eine Bestätigungs-E-Mail und vor der Einheit den Online-Meeting-Link zu senden. Diese Daten werden an Riju (riju.kansal@niramay.me) und Richa (richa@niramay.me) weitergeleitet, nur so lange gespeichert, wie es für die Durchführung des Kurses und die Zahlungsabwicklung erforderlich ist, und nicht an Dritte weitergegeben. Sie müssen Ihre Einwilligung vor dem Absenden dieser Daten aktiv bestätigen; Sie können Ihre Einwilligung jederzeit widerrufen und die Löschung dieser Daten verlangen, indem Sie uns unter riju.kansal@niramay.me kontaktieren."
            }
          ]
        }
      }
    },
    cookieConsent: {
      message: "Wir verwenden Cookies, um mit Google Analytics zu verstehen, wie Besucher:innen diese Website nutzen. Wir setzen sie nur mit Ihrer Einwilligung.",
      privacyLink: "Datenschutzerklärung",
      accept: "Akzeptieren",
      reject: "Ablehnen",
    },
    blog: {
      title: "Einblicke & Weisheit",
      description: "Entdecken Sie unsere Sammlung von Artikeln über ganzheitliche Heilung, Yoga und Achtsamkeit.",
      readMore: "Vollständigen Artikel lesen",
      loadMore: "Mehr laden",
      showLess: "Weniger anzeigen",
      backToList: "Zurück zum Blog",
      addPost: "Neuen Post erstellen",
      emptyState: "Neue Artikel sind unterwegs — schauen Sie bald wieder vorbei.",
      emptyStateFiltered: "Noch keine Beiträge in dieser Kategorie.",
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
        newTitle: "Neuer Post",
        editTitle: "Post bearbeiten",
        titleLabel: "Titel des Posts",
        excerptLabel: "Kurze Zusammenfassung",
        contentLabel: "Hauptinhalt",
        contentHint: "Drücken Sie die Eingabetaste, um einen neuen Absatz zu beginnen. Überschriften, Fett, Kursiv und Aufzählungen: siehe Formatierungshilfe unten.",
        formattingGuideTitle: "Formatierungshilfe",
        categoryLabel: "Kategorie",
        imageLabel: "Bild (optional)",
        audioLabel: "Audio (optional)",
        uploadImage: "Bild hochladen",
        uploadAudio: "Audio hochladen",
        uploading: "Wird hochgeladen...",
        remove: "Entfernen",
        saveDraft: "Als Entwurf speichern",
        publish: "Veröffentlichen",
        saving: "Wird gespeichert...",
        cancel: "Abbrechen",
        delete: "Löschen",
        deleteConfirm: "Diesen Post löschen? Dies kann nicht rückgängig gemacht werden.",
        yourPosts: "Ihre Beiträge",
        noPosts: "Noch keine Beiträge — schreiben Sie oben Ihren ersten.",
        statusPublished: "Veröffentlicht",
        statusDraft: "Entwurf",
        edit: "Bearbeiten",
        translateToGerman: "Ins Deutsche übersetzen",
        translating: "Wird übersetzt...",
        translateError: "Übersetzung fehlgeschlagen. Bitte versuchen Sie es erneut.",
        translateHint: "Erstellt einen neuen deutschen Entwurf aus diesem Post — bitte vor der Veröffentlichung prüfen.",
      }
    },
    write: {
      pageTitle: "Niramay Blog",
      usernameLabel: "Benutzername",
      passwordLabel: "Passwort",
      signIn: "Anmelden",
      signingIn: "Anmeldung läuft...",
      signOut: "Abmelden",
      invalidCredentials: "Ungültiger Benutzername oder Passwort.",
    },
    blogPost: {
      home: "Startseite",
      breadcrumbBlog: "Blog",
      listenLabel: "Diesen Artikel anhören",
      otherPostsTitle: "Weitere Beiträge",
      byline: "Geschrieben von",
      authoredBy: "Artikel verfasst von",
    },
    engagement: {
      like: "Gefällt mir",
      dislike: "Gefällt mir nicht",
      likedAria: "Ihnen gefällt dieser Beitrag",
      dislikedAria: "Ihnen gefällt dieser Beitrag nicht",
      voteError: "Ihre Bewertung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      share: "Teilen",
      shareTitle: "Diesen Beitrag teilen",
      copyLink: "Link kopieren",
      linkCopied: "Link kopiert!",
      copyFailed: "Kopieren fehlgeschlagen — bitte markieren Sie den Link oben und kopieren Sie ihn manuell.",
      email: "E-Mail",
      commentsTitle: "Kommentare",
      commentsLoading: "Kommentare werden geladen…",
      commentsLoadError: "Kommentare konnten nicht geladen werden.",
      retry: "Erneut versuchen",
      noComments: "Noch keine Kommentare — teilen Sie als Erste:r Ihre Gedanken.",
      showMore: "Weitere Kommentare anzeigen",
      formTitle: "Kommentar schreiben",
      nameLabel: "Ihr Name",
      namePlaceholder: "Wird mit Ihrem Kommentar angezeigt",
      anonymousLabel: "Anonym posten",
      anonymousHint: "Ihr Name wird weder angezeigt noch gespeichert.",
      commentLabel: "Ihr Kommentar",
      commentPlaceholder: "Teilen Sie Ihre Gedanken oder stellen Sie eine Frage…",
      charsLeft: "Zeichen übrig",
      submit: "Kommentar senden",
      submitting: "Wird gesendet…",
      posted: "Danke — Ihr Kommentar ist online.",
      pendingNotice: "Danke! Kommentare mit Links werden vor der Veröffentlichung geprüft.",
      publicNotice: "Kommentare sind öffentlich. Bitte teilen Sie keine privaten Gesundheitsdaten.",
      anonymous: "Anonym",
      authorBadge: "Autorin/Autor",
      reply: "Antworten",
      replyPlaceholder: "Ihre Antwort…",
      sendReply: "Antwort senden",
      cancel: "Abbrechen",
      statusPending: "Wartet auf Freigabe",
      statusHidden: "Ausgeblendet",
      approve: "Freigeben",
      hide: "Ausblenden",
      unhide: "Einblenden",
      delete: "Löschen",
      deleteConfirm: "Diesen Kommentar und alle Antworten darauf löschen? Das kann nicht rückgängig gemacht werden.",
      moderationHint: "Als Autor:in angemeldet — Sie können Kommentare beantworten und moderieren.",
      errors: {
        invalid_content: "Bitte schreiben Sie zwischen 2 und 2000 Zeichen.",
        name_required: "Bitte geben Sie Ihren Namen ein oder posten Sie anonym.",
        invalid_name: "Bitte verwenden Sie einen Namen mit höchstens 60 Zeichen.",
        reserved_name: "Dieser Name ist den Autor:innen vorbehalten. Bitte wählen Sie einen anderen Namen oder posten Sie anonym.",
        rate_limited: "Sie haben in kurzer Zeit mehrere Kommentare gesendet. Bitte warten Sie einige Minuten.",
        not_found: "Dieser Beitrag kann nicht mehr kommentiert werden.",
        parent_unavailable: "Dieser Kommentar ist nicht mehr sichtbar und kann nicht beantwortet werden.",
        unauthorized: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
        forbidden: "Diese Aktion ist nicht erlaubt.",
        network: "Server nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut — Ihr Text bleibt erhalten.",
        generic: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
      },
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
          description: "Teilen Sie Ihr genaues Geburtsdatum, Ihre Geburtszeit und Ihren Geburtsort über unser sicheres Formular mit.",
        },
        {
          title: "Platz sichern",
          description: "Bezahlen Sie die Sitzungsgebühr im Voraus, um Ihre Anfrage zu bestätigen und die Horoskop-Vorbereitung zu starten.",
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
    astrologyIntake: {
      step1Title: "Ihre Geburtsdaten",
      step2Title: "Zahlung abschließen",
      fields: {
        name: "Vollständiger Name",
        placeOfBirth: "Geburtsort",
        placeOfBirthPlaceholder: "Stadt, Land",
        dateOfBirth: "Geburtsdatum",
        timeOfBirth: "Geburtszeit",
        timeOfBirthHint: "Ortszeit am Geburtsort, so genau wie möglich.",
        contact: "E-Mail oder WhatsApp-Nummer",
        contactHint: "Hierhin senden wir Ihre Bestätigung und Termindetails.",
      },
      consentPrefix: "Ich stimme zu, dass Niramay diese Angaben zur Vorbereitung meines Horoskops speichert, gemäß der",
      consentLinkLabel: "Datenschutzerklärung",
      continueBtn: "Weiter zur Zahlung",
      backBtn: "Zurück",
      submitting: "Wird gesendet...",
      submitError: "Beim Senden Ihrer Angaben ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.",
      refCodeLabel: "Ihr Referenzcode",
      refCodeNote: "Geben Sie diesen bei Ihrer Zahlung als Verwendungszweck an, damit wir sie schnell zuordnen können.",
      priceLabel: "Preis",
      priceValue: "25 EUR oder 2500 INR",
      paymentEURTitle: "Zahlung in EUR",
      paypalLabel: "PayPal",
      paypalNote: "Meist innerhalb weniger Stunden bestätigt.",
      bankLabel: "Banküberweisung",
      bankNote: "SEPA-Überweisungen können 1–2 Werktage zur Bestätigung benötigen.",
      paymentINRTitle: "Zahlung in INR",
      upiLabel: "UPI",
      upiNote: "Meist innerhalb weniger Stunden bestätigt.",
      paidBtn: "Ich habe bezahlt",
      paidSubmitting: "Wird bestätigt...",
      paidError: "Ihre Zahlungsmeldung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut oder schreiben Sie uns über WhatsApp.",
      confirmationTitle: "Vielen Dank!",
      confirmationBody: "Wir haben Ihre Zahlungsmeldung erhalten und bestätigen Ihren Termin innerhalb von 24–48 Stunden.",
      confirmationSentTo: "Die Bestätigung geht an:",
      whatsappFallbackTitle: "Lieber über WhatsApp?",
      whatsappFallbackBtn: "Über WhatsApp schreiben",
      whatsappTemplate: "Hallo Richa, ich möchte eine vedische Astrologie-Lesung buchen.\nName:\nGeburtsort:\nGeburtsdatum:\nGeburtszeit:",
      closeBtn: "Schließen",
    },
    reiki: {
      badge: "Geist, Körper & Seele in Einklang",
      supportsTitle: "Wobei Reiki unterstützt",
      supportsItems: [
        { title: "Stress & Burnout", description: "Beruhigt den überreizten Geist und setzt das Nervensystem zurück." },
        { title: "Emotionale Befreiung", description: "Löst behutsam angesammelte Traumata, Trauer, Ängste und unausgesprochene Gefühle." },
        { title: "Körperliche Vitalität", description: "Löst Verspannungen, lindert chronische Erschöpfung und fördert erholsamen, regenerierenden Schlaf." },
        { title: "Mentale Klarheit", description: "Klärt energetischen Nebel im Kopf und stellt Fokus, Erdung und intuitiven Fluss wieder her." },
      ],
      howTitle: "Vor Ort oder Fernheilung: So funktioniert es",
      howItems: [
        { title: "Reiki vor Ort", description: "Sie ruhen bekleidet und bequem in einem ruhigen, erdenden Raum, während sanfte, leichte Berührungen oder Handauflegungen knapp über dem Körper entlang Ihrer Energiebahnen und Chakren erfolgen. Viele Klientinnen und Klienten spüren Wärme, ein sanftes Kribbeln oder tiefe meditative Ruhe." },
        { title: "Fern-Reiki (weltweit)", description: "Energie ist nicht an Zeit oder Raum gebunden. Fern-Reiki nutzt eine heilige Frequenzverbindung und fokussierte Absicht, um den Fluss universeller Lebensenergie dorthin zu lenken, wo auch immer Sie auf der Welt sind. Sie entspannen während der Sitzung einfach in Ihrem ruhigen Raum zu Hause und erhalten dieselbe ausgleichende Frequenz und emotionale Befreiung." },
      ],
      packagesTitle: "Sitzungsoptionen & Pakete",
      formatLabel: "Format",
      investmentLabel: "Investition",
      focusLabel: "Fokus",
      packages: {
        "in-person": {
          title: "Reiki-Immersion vor Ort",
          format: "Vor Ort (45 Min.)",
          investment: "40 €",
          focus: "Tiefe somatische Neuausrichtung, spürbare energetische Rekalibrierung und gezieltes Lösen von Verspannungen.",
          cta: "Sitzung vor Ort buchen",
        },
        "distance-single": {
          title: "Fern-Reiki — Einzelsitzung",
          format: "Online/Fern (30 Min.)",
          investment: "20 € / 2.000 ₹",
          focus: "Schnelle energetische Ausrichtung, Chakra-Reinigung und akute Stresslinderung von zu Hause aus.",
          cta: "Fernsitzung anfragen",
        },
        "distance-renewal": {
          title: "Fern-Reiki Erneuerungspaket (3 Sitzungen)",
          format: "Online/Fern (3 × 30-Min.-Sitzungen)",
          investment: "55 € / 5.900 ₹",
          focus: "Heilung in mehreren Schichten, langfristiger Chakra-Ausgleich, nachhaltige emotionale Befreiung und energetische Pflege.",
          cta: "Erneuerungspaket anfragen",
        },
      },
      cta: "Sitzung auswählen",
    },
    reikiIntake: {
      detailsTitle: "Ihre Angaben",
      calendarTitle: "Wählen Sie Ihren Termin",
      calendarDesc: "Wählen Sie im Kalender unten eine passende Zeit und fahren Sie dann mit der Zahlung fort.",
      calendarDoneBtn: "Termin gebucht — weiter zur Zahlung",
      calendarOpenTab: "Probleme bei der Anzeige? In neuem Tab öffnen",
      paymentTitle: "Zahlung abschließen",
      selectedLabel: "Gewählte Sitzung",
      fields: {
        name: "Vollständiger Name",
        email: "E-Mail",
        whatsapp: "WhatsApp-Nummer",
        whatsappPlaceholder: "+49 …",
        reason: "Wofür wünschen Sie sich Reiki?",
        reasonPlaceholder: "z. B. Stress, schlechter Schlaf, emotionale Schwere…",
      },
      consentPrefix: "Ich bin damit einverstanden, dass Niramay diese Angaben zur Organisation meiner Sitzung speichert, gemäß der",
      consentLinkLabel: "Datenschutzerklärung",
      continueBtn: "Weiter zur Buchung",
      sendBtn: "Anfrage senden",
      backBtn: "Zurück",
      submitting: "Wird gesendet...",
      submitError: "Beim Senden Ihrer Angaben ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.",
      refCodeLabel: "Ihr Referenzcode",
      refCodeNote: "Geben Sie diesen Code als Verwendungszweck an, damit wir die Zahlung schnell Ihrer Buchung zuordnen können.",
      priceLabel: "Preis",
      paymentEURTitle: "Zahlung in EUR",
      paypalLabel: "PayPal",
      paypalNote: "In der Regel innerhalb weniger Stunden bestätigt.",
      bankLabel: "Banküberweisung",
      bankNote: "SEPA-Überweisungen können 1–2 Werktage bis zur Bestätigung dauern.",
      paidBtn: "Ich habe bezahlt",
      paidSubmitting: "Wird bestätigt...",
      paidError: "Ihre Zahlungsmeldung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut oder schreiben Sie uns über WhatsApp.",
      confirmationTitle: "Vielen Dank!",
      inPersonConfirmationBody: "Wir haben Ihre Zahlungsmeldung erhalten und bestätigen Ihre Sitzung vor Ort innerhalb von 24–48 Stunden.",
      distanceConfirmationBody: "Ihre Anfrage wurde an Richa gesendet. Sie meldet sich bei Ihnen, um die nächsten Schritte zu besprechen.",
      confirmationSentTo: "Eine Bestätigungs-E-Mail wurde gesendet an:",
      closeBtn: "Schließen",
    },
    yogaSeries: {
      badge: "Online · Serie mit 8 Einheiten",
      seoTitle: "Yoga für Stress, Immunität & Schlaf — Online-Serie mit 8 Einheiten | Niramay Wellbeing",
      seoDescription: "Eine Live-Online-Yogaserie mit 8 Einheiten (Di & Do, 20–21 Uhr, 4 Wochen) mit sanfter Dehnung, Atemübungen, Meditation und Tiefenentspannung für besseren Umgang mit Stress, ein starkes Immunsystem und erholsamen Schlaf. 79 €.",
      breadcrumbCourses: "Kurse",
      intro: "Eine sanfte, strukturierte Online-Serie über 4 Wochen, die Ihr Nervensystem beruhigt, die natürlichen Abwehrkräfte Ihres Körpers stärkt und Ihnen zu tieferem Schlaf verhilft. Jede Live-Einheit baut auf der vorherigen auf – am Ende haben Sie eine einfache Routine, die Sie selbstständig weiterführen können.",
      scheduleLabel: "Termine",
      schedule: "Jeden Dienstag & Donnerstag, 20:00–21:00 Uhr (deutsche Zeit), ab Dienstag, 3. November 2026",
      durationLabel: "Dauer",
      duration: "4 Wochen · 3.–26. November 2026 · insgesamt 8 Einheiten",
      formatLabel: "Format",
      format: "Live online – den Meeting-Link erhalten Sie einen Tag vor der Einheit per E-Mail",
      priceLabel: "Preis",
      price: "79 € für alle 8 Einheiten",
      learnTitle: "Was Sie lernen",
      learnItems: [
        { title: "Sanfte Dehnung & Lockerung", description: "Yoga-Haltungen, die Steifheit und Verspannungen nach einem langen Tag lösen." },
        { title: "Atemübungen", description: "Einfache Pranayama-Techniken, die den Geist beruhigen und das Nervensystem ausgleichen." },
        { title: "Meditation", description: "Angeleitete Übungen, die das Gedankenkarussell zur Ruhe bringen und innere Stabilität aufbauen." },
        { title: "Tiefenentspannung", description: "Regenerative Entspannungstechniken, die den Körper auf tieferen, erholsameren Schlaf vorbereiten." },
      ],
      benefitsTitle: "Warum es hilft",
      benefits: [
        "Gelassener und klarer mit Alltagsstress umgehen",
        "Das Immunsystem stärken, indem chronischer Stress abgebaut wird",
        "Leichter einschlafen und erholter aufwachen",
        "Eine einfache tägliche Routine für die eigene Praxis mitnehmen",
      ],
      howTitle: "So funktioniert die Buchung",
      howSteps: [
        "Geben Sie Ihre Daten ein und reservieren Sie Ihren Platz.",
        "Zahlen Sie 79 € per PayPal oder Überweisung mit Ihrem Referenzcode.",
        "Bestätigen Sie Ihre Zahlung – Sie erhalten sofort eine Bestätigungs-E-Mail.",
        "Einen Tag vor der Einheit senden wir Ihnen den Online-Meeting-Link per E-Mail.",
      ],
      blogTitle: "Mehr zu diesem Thema",
      blogDescription: "Wie Yoga auf Stress, Immunität und Schlaf wirkt, erfahren Sie in unserem Blogartikel (auf Englisch).",
      blogLinkLabel: "Stress, Immunity and Sleep: How Yoga Restores Your Balance",
      questionsNote: "Fragen? Schreiben Sie uns an",
      moreInfoBtn: "Mehr Infos",
      bookBtn: "Buchen & bezahlen",
      bookCta: "Platz buchen — 79 €",
    },
    yogaAdventure: {
      badge: "Online · Kinder 9–14 · Workshop",
      seoTitle: "Yoga-Abenteuer für Kinder (9–14) — Online-Yoga-Workshop | Niramay Wellbeing",
      seoDescription: "Ein lustiger, interaktiver 1,5-stündiger Online-Yoga-Workshop für Kinder von 9–14 Jahren: Bewegung, Atmung, Konzentration, Spiele und Selbstentdeckung in einer kleinen Gruppe mit max. 12 Kindern. Wählen Sie den 24. oder 29. Oktober. 15 € / ₹1500.",
      breadcrumbCourses: "Kurse",
      intro: "Eine spielerische Gelegenheit für Kinder, Yoga durch Bewegung, Atmung, Konzentration, Spiele und Selbstentdeckung zu erleben – in einer kleinen, interaktiven Gruppe. Es ist EIN Workshop an ZWEI Terminen – Sie wählen nur einen Termin, und die Gebühr gilt für diese eine Einheit. Anmeldung bis zum 20. Oktober.",
      scheduleLabel: "EINEN Termin wählen",
      schedule: "Sa, 24. Okt., 12:30–14:00 Uhr europäische Zeit (16:00–17:30 Uhr IST) – oder – Do, 29. Okt., 11:30–13:00 Uhr europäische Zeit (16:00–17:30 Uhr IST)",
      durationLabel: "Dauer",
      duration: "1,5 Stunden · eine Einheit",
      formatLabel: "Format",
      format: "Live online auf Englisch · 9–14 Jahre · max. 12 Kinder pro Einheit · den Meeting-Link erhalten Sie einen Tag vorher per E-Mail",
      priceLabel: "Preis",
      price: "15 € / ₹1500 pro Kind und Einheit",
      learnTitle: "Was Ihr Kind erlebt",
      learnItems: [
        { title: "Bewegen", description: "Spielerische Yoga-Haltungen und Abläufe für Kraft, Gleichgewicht und Beweglichkeit." },
        { title: "Atmen", description: "Einfache, kindgerechte Atemübungen, um zur Ruhe zu kommen." },
        { title: "Spielen", description: "Yoga-Spiele, die Konzentration und Fokus zum Vergnügen machen." },
        { title: "Entdecken", description: "Momente der Stille und Selbstentdeckung, um Körper und Geist bewusst wahrzunehmen." },
      ],
      benefitsTitle: "Warum es hilft",
      benefits: [
        "Energie auf gesunde, fröhliche Weise rauslassen",
        "Konzentration spielerisch stärken",
        "Einfache Werkzeuge, um sich selbst zu beruhigen",
        "Kleine Gruppe – jedes Kind bekommt Aufmerksamkeit",
      ],
      howTitle: "So funktioniert die Buchung",
      howSteps: [
        "Wählen Sie Ihren Wunschtermin und geben Sie Ihre Daten ein (Anmeldeschluss: 20. Oktober).",
        "Zahlen Sie 15 € per PayPal oder Überweisung bzw. ₹1500 per UPI mit Ihrem Referenzcode.",
        "Bestätigen Sie Ihre Zahlung – Sie erhalten sofort eine Bestätigungs-E-Mail.",
        "Einen Tag vor der Einheit senden wir Ihnen den Online-Meeting-Link per E-Mail.",
      ],
      blogTitle: "Mehr zu diesem Thema",
      blogDescription: "",
      blogLinkLabel: "",
      questionsNote: "Fragen? Schreiben Sie uns an",
      moreInfoBtn: "Mehr Infos",
      bookBtn: "Buchen & bezahlen",
      bookCta: "Platz für Ihr Kind reservieren — 15 € / ₹1500",
    },
    courseIntake: {
      detailsTitle: "Platz reservieren",
      paymentTitle: "Zahlung abschließen",
      selectedLabel: "Gewählter Kurs",
      sessionLabel: "EINEN Termin wählen",
      registrationClosed: "Anmeldung geschlossen",
      fields: {
        name: "Vollständiger Name",
        email: "E-Mail",
        whatsapp: "WhatsApp-Nummer",
        whatsappPlaceholder: "+49 …",
        notes: "Gibt es etwas, das wir wissen sollten? (optional)",
        notesPlaceholder: "z. B. Verletzungen, gesundheitliche Einschränkungen, Yoga-Erfahrung…",
      },
      consentPrefix: "Ich bin damit einverstanden, dass Niramay diese Angaben zur Organisation meines Kurses speichert, gemäß der",
      consentLinkLabel: "Datenschutzerklärung",
      continueBtn: "Weiter zur Zahlung",
      backBtn: "Zurück",
      submitting: "Wird gesendet...",
      submitError: "Beim Senden Ihrer Angaben ist etwas schiefgelaufen. Bitte versuchen Sie es erneut.",
      refCodeLabel: "Ihr Referenzcode",
      refCodeNote: "Bitte geben Sie diesen Code als Verwendungszweck an, damit wir Ihre Zahlung schnell zuordnen können.",
      priceLabel: "Preis",
      paymentEURTitle: "Zahlung in EUR",
      paypalLabel: "PayPal",
      paypalNote: "In der Regel innerhalb weniger Stunden bestätigt.",
      bankLabel: "Banküberweisung",
      bankNote: "SEPA-Überweisungen können 1–2 Werktage bis zur Bestätigung dauern.",
      paymentINRTitle: "Zahlung in INR",
      upiLabel: "UPI",
      upiNote: "Meist innerhalb weniger Stunden bestätigt.",
      paidBtn: "Ich habe bezahlt",
      paidSubmitting: "Wird bestätigt...",
      paidError: "Ihre Zahlungsmeldung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut oder schreiben Sie an {email}.",
      confirmationTitle: "Sie sind angemeldet!",
      confirmationBody: "Vielen Dank für Ihre Anmeldung. Wir prüfen Ihre Zahlung, und Sie erhalten den Online-Meeting-Link einen Tag vor der Einheit per E-Mail.",
      confirmationSentTo: "Eine Bestätigungs-E-Mail wurde gesendet an:",
      questionsNote: "Fragen? Schreiben Sie an",
      closeBtn: "Schließen",
    },
    guidanceIntake: {
      cta: "Sitzung buchen",
      step1Title: "Ihre Sitzung buchen",
      packageLabel: "Wählen Sie Ihre Sitzung",
      packages: {
        individual: { title: "Individuelle Seelenberatung & Begleitung", price: "50 € / ₹5.000", priceValue: "50 EUR oder 5000 INR" },
        couple: { title: "Beziehungs- & Paarbegleitung", price: "90 € / ₹9.000", priceValue: "90 EUR oder 9000 INR" },
      },
      yourDetailsTitle: "Ihre Geburtsdaten",
      partnerDetailsTitle: "Geburtsdaten Ihres Partners / Ihrer Partnerin",
      partnerName: "Vollständiger Name des Partners / der Partnerin",
      consentPrefix: "Ich stimme zu, dass Niramay diese Angaben zur Vorbereitung meiner Sitzung speichert, gemäß der",
      whatsappTemplate: "Hallo Richa, ich möchte eine Sitzung für Intuitive Begleitung & Seelenberatung buchen.\nSitzung (einzeln / Paar):\nName:\nGeburtsort:\nGeburtsdatum:\nGeburtszeit:",
      bookThisBtn: "Diese Sitzung buchen",
    },
    tarotIntake: {
      step1Title: "Angaben zu Ihrer Lesung",
      fields: {
        question: "Ihre Frage",
        questionPlaceholder: "Wozu wünschen Sie sich Klarheit? (Beruf, Beziehungen, eine Entscheidung...)",
        questionHint: "Eine fokussierte Frage eignet sich am besten. Gerne können Sie etwas Hintergrund ergänzen.",
      },
      consentPrefix: "Ich stimme zu, dass Niramay diese Angaben zur Vorbereitung meiner Lesung speichert, gemäß der",
      priceValue: "10 € / 1.000 ₹",
      confirmationBody: "Wir haben Ihre Zahlungsmeldung erhalten und melden uns innerhalb von 24–48 Stunden, um Ihre Online-Lesung zu vereinbaren.",
      whatsappTemplate: "Hallo Richa, ich möchte eine Tarot-Beratung & Klarheits-Sitzung buchen.\nName:\nMeine Frage:",
    },
    book: {
      title: "Reise vom Körper zur Glückseligkeit",
      subtitle: "Der Niramay-Pfad zu den Pancha Koshas",
      description: "Erkunden Sie den transformativen Pfad der ganzheitlichen Heilung durch die fünf Hüllen (Pancha Koshas) der menschlichen Existenz. Von körperlicher Vitalität bis hin zu spiritueller Ekstase bietet dieses Buch einen umfassenden Fahrplan für Selbsterkenntnis und dauerhafte Transformation.",
      author: "Richa Jain Kansal",
      cta: "Auf Amazon bestellen",
      cover: "/bookcover-de.webp",
      link: "https://www.amazon.de/stores/Richa-Jain-Kansal/author/B0H3W87WW9?language=en&ref=sr_ntt_srch_lnk_1&qid=1790675468&sr=8-1&shoppingPortalEnabled=true",
      badges: ["Ganzheitlicher Leitfaden", "Altes Wissen"],
    },
    auth: {
      navLogIn: "Anmelden",
      navSignUp: "Registrieren",
      navLogOut: "Abmelden",
      helloPrefix: "Hallo, ",
      loginTitle: "Willkommen zurück",
      loginDesc: "Melden Sie sich bei Ihrem Niramay-Konto an.",
      signUpTitle: "Konto erstellen",
      signUpDesc: "Speichern Sie Ihre Daten, damit Buchungen und Bewertungen beim nächsten Mal schneller gehen.",
      resetTitle: "Passwort zurücksetzen",
      resetDesc: "Geben Sie Ihre E-Mail-Adresse ein, wir senden Ihnen einen Link zum Zurücksetzen.",
      fields: {
        name: "Vollständiger Name",
        email: "E-Mail",
        password: "Passwort",
      },
      passwordHint: "Mindestens 8 Zeichen, mit einem Buchstaben und einer Zahl.",
      loginBtn: "Anmelden",
      loginSubmitting: "Anmeldung läuft...",
      signUpBtn: "Konto erstellen",
      signUpSubmitting: "Konto wird erstellt...",
      resetBtn: "Link zum Zurücksetzen senden",
      resetSubmitting: "Wird gesendet...",
      resetSuccess: "Bitte prüfen Sie Ihr Postfach für den Link zum Zurücksetzen.",
      switchToSignUp: "Noch kein Konto? Registrieren",
      switchToLogin: "Schon ein Konto? Anmelden",
      forgotPassword: "Passwort vergessen?",
      backToLogin: "Zurück zur Anmeldung",
      errors: {
        invalidCredential: "E-Mail oder Passwort ist falsch.",
        emailInUse: "Für diese E-Mail-Adresse besteht bereits ein Konto.",
        weakPassword: "Das Passwort muss mindestens 8 Zeichen lang sein und einen Buchstaben sowie eine Zahl enthalten.",
        invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        tooManyRequests: "Zu viele Versuche. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
        generic: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
      },
    },
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
      details: [
        "Holistic Yoga treats you as a whole person, not just a body in a pose. Each session weaves together gentle asanas, pranayama (breathwork), relaxation and meditation, drawn from the classical S-VYASA tradition of yoga therapy.",
        "Practice is adapted to where you are today, whether you are a complete beginner, recovering from back or neck pain, managing stress and sleep, or looking to deepen an existing practice. Postures are modified with care so every body can take part safely.",
        "Sessions are offered one-to-one or in small groups, in person in Ostfildern or online, and you leave with simple routines you can continue at home.",
      ],
    },
    DE: {
      title: "Ganzheitliches Yoga",
      description: "Bringen Sie Körper und Geist durch traditionelle Asanas, Atemarbeit und Meditation in Einklang, die auf Ihre individuellen Bedürfnisse zugeschnitten sind.",
      outcome: "Verbessern Sie Ihre Flexibilität, lindern Sie chronische Schmerzen und finden Sie innere Ruhe.",
      details: [
        "Ganzheitliches Yoga betrachtet Sie als ganzen Menschen – nicht nur als Körper in einer Haltung. Jede Einheit verbindet sanfte Asanas, Pranayama (Atemarbeit), Entspannung und Meditation, basierend auf der klassischen Yogatherapie-Tradition von S-VYASA.",
        "Die Praxis wird an Ihre aktuelle Situation angepasst – ob Sie ganz neu beginnen, sich von Rücken- oder Nackenschmerzen erholen, Stress und Schlaf in den Griff bekommen oder Ihre bestehende Praxis vertiefen möchten. Haltungen werden achtsam abgewandelt, damit jeder Körper sicher mitmachen kann.",
        "Die Sitzungen finden einzeln oder in kleinen Gruppen statt, vor Ort in Ostfildern oder online – und Sie nehmen einfache Übungsabläufe für zu Hause mit.",
      ],
    }
  },
  {
    id: "reiki",
    icon: Sparkles,
    color: "bg-stone-100",
    category: "Spiritual Healing",
    EN: {
      title: "Reiki Energy Healing",
      description: "Harmonize mind, body & spirit with gentle Japanese energy healing, in person in Ostfildern or as distance Reiki wherever you are in the world.",
      outcome: "Dissolve energetic blockages, calm your nervous system and awaken your body's natural capacity to heal.",
      price: "Distance from €20 / ₹2,000 · In-person €40",
      details: [
        "Reiki is a gentle, non-invasive Japanese energy healing practice that channels universal life force energy (Prana or Ki) to dissolve energetic blockages, calm the nervous system, and awaken your body's natural capacity to heal. When our energy flow is stagnant or disrupted by stress, suppressed emotions, or physical strain, it often manifests as fatigue, emotional heaviness, or physical tension. Reiki restores this sacred balance across your subtle energy centers (chakras), bringing profound lightness and peace.",
      ],
    },
    DE: {
      title: "Reiki-Energieheilung",
      description: "Bringen Sie Geist, Körper & Seele in Einklang – mit sanfter japanischer Energieheilung, vor Ort in Ostfildern oder als Fern-Reiki, wo auch immer Sie auf der Welt sind.",
      outcome: "Lösen Sie energetische Blockaden, beruhigen Sie Ihr Nervensystem und wecken Sie die natürliche Heilkraft Ihres Körpers.",
      price: "Fern-Reiki ab 20 € / 2.000 ₹ · Vor Ort 40 €",
      details: [
        "Reiki ist eine sanfte, nicht-invasive japanische Methode der Energieheilung, die universelle Lebensenergie (Prana oder Ki) leitet, um energetische Blockaden zu lösen, das Nervensystem zu beruhigen und die natürliche Heilkraft Ihres Körpers zu wecken. Wenn unser Energiefluss durch Stress, unterdrückte Gefühle oder körperliche Belastung ins Stocken gerät, zeigt sich das oft als Erschöpfung, emotionale Schwere oder körperliche Anspannung. Reiki stellt dieses heilige Gleichgewicht in Ihren feinstofflichen Energiezentren (Chakren) wieder her und schenkt tiefe Leichtigkeit und Frieden.",
      ],
    }
  },
  {
    id: "subconscious-healing",
    icon: Brain,
    color: "bg-stone-100",
    category: "Mental Clarity",
    EN: {
      title: "Subconscious Healing",
      description: "Heal at the root by working with your subconscious mind through NLP Coaching, Hypnotherapy and Past Life Regression.",
      outcome: "Release limiting beliefs, anxiety and old emotional patterns, and create lasting change from within.",
      details: [
        "Most of what we think, feel and do is driven by the subconscious mind, which is why willpower alone often isn't enough to change a habit, a fear or a recurring pattern. Subconscious Healing brings together three complementary approaches to work directly at that deeper level.",
        "NLP (Neuro-Linguistic Programming) Coaching helps you identify and reframe limiting beliefs, change unhelpful thought and behaviour patterns, and move towards your goals with clarity and confidence.",
        "Hypnotherapy guides you into a deeply relaxed yet focused state in which you stay aware and in control, where the subconscious becomes open to positive suggestion. It is especially helpful for anxiety, phobias, stress, low self-esteem and unwanted habits.",
        "Past Life Regression gently explores memories held in the subconscious to understand the roots of present-day fears, relationship patterns and emotional blocks, bringing insight, release and a sense of peace.",
        "In a free discovery call, Richa will listen to what you'd like to work on and suggest the approach, or blend of approaches, best suited to you.",
      ],
    },
    DE: {
      title: "Heilung des Unterbewusstseins",
      description: "Heilen Sie an der Wurzel, indem Sie mit Ihrem Unterbewusstsein arbeiten – durch NLP-Coaching, Hypnotherapie und Rückführung in vergangene Leben.",
      outcome: "Lösen Sie einschränkende Überzeugungen, Ängste und alte emotionale Muster und schaffen Sie nachhaltige Veränderung von innen heraus.",
      details: [
        "Der Großteil unseres Denkens, Fühlens und Handelns wird vom Unterbewusstsein gesteuert – deshalb reicht Willenskraft allein oft nicht aus, um eine Gewohnheit, eine Angst oder ein wiederkehrendes Muster zu verändern. Die Heilung des Unterbewusstseins vereint drei sich ergänzende Ansätze, die genau auf dieser tieferen Ebene ansetzen.",
        "NLP-Coaching (Neuro-Linguistisches Programmieren) hilft Ihnen, einschränkende Überzeugungen zu erkennen und neu zu bewerten, hinderliche Denk- und Verhaltensmuster zu verändern und Ihre Ziele mit Klarheit und Zuversicht anzugehen.",
        "Hypnotherapie führt Sie in einen tief entspannten und zugleich fokussierten Zustand, in dem Sie jederzeit wach und selbstbestimmt bleiben und Ihr Unterbewusstsein für positive Impulse offen wird. Sie ist besonders hilfreich bei Ängsten, Phobien, Stress, geringem Selbstwertgefühl und unerwünschten Gewohnheiten.",
        "Die Rückführung in vergangene Leben erforscht behutsam Erinnerungen im Unterbewusstsein, um die Wurzeln heutiger Ängste, Beziehungsmuster und emotionaler Blockaden zu verstehen – für Einsicht, Befreiung und inneren Frieden.",
        "In einem kostenlosen Kennenlerngespräch hört Richa Ihnen zu und empfiehlt den Ansatz – oder die Kombination von Ansätzen –, der am besten zu Ihnen passt.",
      ],
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
      originalPrice: "€50 / ₹5,000",
      price: "€25 / ₹2,500",
    },
    DE: {
      title: "Vedische Astrologie & Kundali-Lesung",
      description: "1:1 Beratung auf Basis Ihres Geburtshoroskops, verwurzelt in der vedischen Astrologie (Jyotish), für ein tieferes Verständnis Ihrer Natur, wiederkehrender Lebensmuster und wichtiger Übergangsphasen.",
      outcome: "Erhalten Sie einen persönlichen Fahrplan für Karriere, Beziehungen und Ihr nächstes Lebenskapitel, basierend auf Ihrem individuellen Geburtshoroskop.",
      originalPrice: "50 € / 5.000 ₹",
      price: "25 € / 2.500 ₹",
    }
  },
  {
    id: "tarot",
    icon: WandSparkles,
    color: "bg-stone-100",
    category: "Mental Clarity",
    EN: {
      title: "Tarot Guidance & Clarity Session",
      description: "Feeling stuck, overthinking, or looking for a sign? A focused tarot reading that mirrors your subconscious, uncovers hidden blind spots, and shows you where your energy is truly flowing.",
      outcome: "Leave with clarity on your question and direct, grounded action steps to move forward with confidence.",
      details: [
        "When your mind is crowded with questions, making a simple decision can feel heavy. Sometimes you don't need all the answers at once, you just need a quiet pause and a moment of clarity to see the road ahead.",
        "The cards don't just predict; they mirror your subconscious, uncover hidden blind spots, and show you where your energy is truly flowing.",
      ],
      highlightsTitle: "What we explore",
      highlights: [
        "Uncover the root of current emotional or mental blocks",
        "Clarify choices around career, personal growth, or relationships",
        "Receive direct, grounded action steps to move forward with confidence",
      ],
      facts: [
        { label: "Investment", value: "€10 / ₹1,000" },
        { label: "Format", value: "Online (focused question reading + detailed intuitive guidance)" },
      ],
      ctaLabel: "Book Your Reading Now",
    },
    DE: {
      title: "Tarot-Beratung & Klarheits-Sitzung",
      description: "Fühlen Sie sich festgefahren, grübeln Sie zu viel oder warten Sie auf ein Zeichen? Eine fokussierte Tarot-Lesung, die Ihr Unterbewusstsein spiegelt, blinde Flecken sichtbar macht und zeigt, wohin Ihre Energie wirklich fließt.",
      outcome: "Gewinnen Sie Klarheit zu Ihrer Frage und erhalten Sie konkrete, bodenständige Handlungsschritte, um zuversichtlich weiterzugehen.",
      details: [
        "Wenn der Kopf voller Fragen ist, kann selbst eine einfache Entscheidung schwer wiegen. Manchmal brauchen Sie nicht alle Antworten auf einmal – sondern nur eine stille Pause und einen Moment der Klarheit, um den Weg vor sich zu sehen.",
        "Die Karten sagen nicht nur voraus: Sie spiegeln Ihr Unterbewusstsein, decken verborgene blinde Flecken auf und zeigen, wohin Ihre Energie wirklich fließt.",
      ],
      highlightsTitle: "Was wir gemeinsam erkunden",
      highlights: [
        "Die Wurzel aktueller emotionaler oder mentaler Blockaden aufdecken",
        "Klarheit bei Entscheidungen rund um Beruf, persönliche Entwicklung oder Beziehungen gewinnen",
        "Konkrete, bodenständige Handlungsschritte erhalten, um zuversichtlich weiterzugehen",
      ],
      facts: [
        { label: "Investition", value: "10 € / 1.000 ₹" },
        { label: "Format", value: "Online (fokussierte Lesung zu Ihrer Frage + ausführliche intuitive Begleitung)" },
      ],
      ctaLabel: "Jetzt Lesung buchen",
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
    id: "intuitive-guidance",
    icon: Sparkles,
    color: "bg-stone-100",
    category: "Spiritual Healing",
    EN: {
      title: "Intuitive Guidance & Soul Counseling",
      description: "Are you facing big life changes, inner stress, or relationship challenges? These sessions combine astrology, tarot cards, and caring counseling to help you find clarity, peace, and direction in your life.",
      outcome: "Find clarity, peace, and direction, with simple, grounded steps forward.",
      receiveTitle: "What You Receive in These Sessions",
      receive: [
        { title: "Astrology Guidance (Your Cosmic Map)", description: "Learn about your planetary cycles and the best timing for important life decisions." },
        { title: "Tarot Card Reading (Clear Direction)", description: "Discover hidden feelings, current energies, and what is truly influencing your life right now." },
        { title: "Compassionate Soul Counseling", description: "A safe, friendly space to talk about your feelings, release stress, and find simple steps forward." },
      ],
      offeringsTitle: "Intuitive Guidance & Soul Counseling Offerings",
      offerings: [
        {
          package: "individual" as const,
          title: "Individual Soul Counseling & Guidance",
          format: "Online / Video Call (60 mins)",
          price: "€50 / ₹5,000",
          inclusions: [
            "Astrological chart analysis for cosmic alignment & timing",
            "1 In-depth tarot reading for intuitive clarity",
            "1-hour personalized counseling & emotional mentoring",
          ],
        },
        {
          package: "couple" as const,
          title: "Relationship & Couple Guidance",
          format: "Online / Video Call (60 mins)",
          price: "€90 / ₹9,000",
          inclusions: [
            "Dual astrological chart analysis for energetic synergy & patterns",
            "2 Tarot readings exploring both individual perspectives and shared dynamics",
            "1-hour joint counseling & conflict navigation",
          ],
        },
      ],
    },
    DE: {
      title: "Intuitive Begleitung & Seelenberatung",
      description: "Stehen Sie vor großen Veränderungen, innerem Stress oder Herausforderungen in Ihrer Beziehung? Diese Sitzungen verbinden Astrologie, Tarotkarten und einfühlsame Beratung, damit Sie Klarheit, Frieden und Orientierung in Ihrem Leben finden.",
      outcome: "Finden Sie Klarheit, Frieden und Orientierung – mit einfachen, geerdeten nächsten Schritten.",
      receiveTitle: "Was Sie in diesen Sitzungen erhalten",
      receive: [
        { title: "Astrologische Begleitung (Ihre kosmische Landkarte)", description: "Erfahren Sie mehr über Ihre planetaren Zyklen und den besten Zeitpunkt für wichtige Lebensentscheidungen." },
        { title: "Tarot-Lesung (Klare Richtung)", description: "Entdecken Sie verborgene Gefühle, aktuelle Energien und das, was Ihr Leben gerade wirklich beeinflusst." },
        { title: "Einfühlsame Seelenberatung", description: "Ein sicherer, vertrauensvoller Raum, um über Ihre Gefühle zu sprechen, Stress loszulassen und einfache nächste Schritte zu finden." },
      ],
      offeringsTitle: "Angebote: Intuitive Begleitung & Seelenberatung",
      offerings: [
        {
          package: "individual" as const,
          title: "Individuelle Seelenberatung & Begleitung",
          format: "Online / Videoanruf (60 Min.)",
          price: "50 € / ₹5.000",
          inclusions: [
            "Astrologische Horoskopanalyse für kosmische Ausrichtung & Timing",
            "1 ausführliche Tarot-Lesung für intuitive Klarheit",
            "1 Stunde persönliche Beratung & emotionales Mentoring",
          ],
        },
        {
          package: "couple" as const,
          title: "Beziehungs- & Paarbegleitung",
          format: "Online / Videoanruf (60 Min.)",
          price: "90 € / ₹9.000",
          inclusions: [
            "Doppelte Horoskopanalyse für energetische Synergien & Muster",
            "2 Tarot-Lesungen zu beiden individuellen Perspektiven und der gemeinsamen Dynamik",
            "1 Stunde gemeinsame Beratung & Konfliktbegleitung",
          ],
        },
      ],
    }
  },
];

// Real client feedback: messages clients sent Richa on WhatsApp, Instagram
// and Facebook, each shared here with the client's consent. `quote` is kept
// verbatim in the client's own language, typos included; "…" marks the only
// edits (cuts). Two health-outcome passages (back pain, meniscus) were cut
// on purpose, because German health-advertising law (HWG) is strict about
// testimonials that suggest a treatment cured something. None of these
// carry a star rating unless the client gave one, and they are never put
// into Review/AggregateRating JSON-LD (see TestimonialsSection).
//
// `serviceId` puts a story on that service's own page; `featured` puts it in
// the homepage hero rotation; `screenshot` is a cropped, redacted image of
// the original message under public/testimonials/.
export type ClientStory = {
  id: string;
  name?: string;
  category: string;
  serviceId?: string;
  source?: "WhatsApp" | "Instagram" | "Facebook";
  date?: string; // YYYY-MM
  rating?: number;
  quote: string;
  quoteLang: "EN" | "DE" | "HI";
  translation?: { EN?: string; DE?: string };
  screenshot?: string;
  featured?: boolean;
  EN: { role: string };
  DE: { role: string };
};

export const TESTIMONIALS: ClientStory[] = [
  {
    id: "story-yoga-beginner-advanced",
    category: "Physical Wellness",
    serviceId: "yoga",
    source: "WhatsApp",
    date: "2024-07",
    quoteLang: "EN",
    featured: true,
    quote: "Hello ladies, just wanted to share my experience of doing yoga with Richa, which was amazing. She's great at making one feel comfortable, whether you're a beginner or advanced. Richa asked me what was my goal and paid attention to how I moved, during the session. She ensured I was getting the most out of each pose and class. Her classes felt peaceful and help relax. What I love most is her kindness and encouragement, which makes every class feel welcoming. If you want to improve your yoga practice and feel more balanced, Richa's classes are perfect for you. Highly recommend.",
    EN: { role: "Yoga classes" },
    DE: { role: "Yoga-Kurse" },
  },
  {
    id: "story-tarot-palbhar21",
    name: "@palbhar21",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    featured: true,
    quote: "Completely AWESTRUCK by the accuracy of it. Thank you so much. Evry interaction with you is so rewarding. Must say you are one of those few healers who truely do it out of their love and kindness for people. Extending genuine comfort and help is at the core of your effort. That's exactly why you ate able to do it so effectively, it's almost magical. Thank you so much",
    EN: { role: "Tarot reading" },
    DE: { role: "Tarot-Lesung" },
  },
  {
    id: "story-healing-upasna",
    name: "Upasna T.",
    category: "Spiritual Healing",
    source: "Facebook",
    date: "2024-07",
    quoteLang: "EN",
    featured: true,
    quote: "The experience after session is really valuable for me, After session I realise the motive of my remaining life ! thanks for giving me this wonderful and healing. Before healing I was confused that what is the motive of my life. Why God send me after session i Got all the answers ...it's wonderful experience thanks Richa for this beautiful gift",
    EN: { role: "Healing session" },
    DE: { role: "Heilsitzung" },
  },
  {
    id: "story-yoga-private-richa-b",
    name: "Richa B.",
    category: "Physical Wellness",
    serviceId: "yoga",
    source: "WhatsApp",
    quoteLang: "EN",
    featured: true,
    screenshot: "/testimonials/yoga-private-sessions.webp",
    quote: "Hello everyone, I want to share my feedback for the Yoga classes that I am taking Richa. I always wanted to practice yoga but her free session was the one which inspired me to go ahead and take some private sessions. She is an excellent instructor and guides clearly. I can follow her instructions even with closed eyes. I feel light after every session even though I am exhausted before the sessions and above all her voice is so soothing.",
    EN: { role: "Private yoga sessions" },
    DE: { role: "Yoga-Einzelstunden" },
  },
  {
    id: "story-tarot-8sunnysideup8",
    name: "@8sunnysideup8",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    featured: true,
    quote: "I must admit I was a non believer when I got into it. But after having your reading I was almost in shock and blown away with how exact it was. It definitely gave me more clarity into my current situation and welcomed guidance on how to navigate this. I still have goosebumps. Thank you so much for the good work that you're doing",
    EN: { role: "Tarot reading" },
    DE: { role: "Tarot-Lesung" },
  },
  {
    id: "story-reiki-mother",
    category: "Spiritual Healing",
    serviceId: "reiki",
    rating: 5,
    quoteLang: "HI",
    quote: "Thankyou so much Richa kansal ji . Jab sy aapse REIK HEALING ka Session liya hai tab sy aapko blessings de rahi hai meri mother, Or sabsy badi baat ki aapke baat karne ka tarika or samjhane ka tarika bhi healing sy kaam nahi bilkul stress free kar diya aapne mujhe bhi or meri mother ko bhi . Thankyou so much once again dear . God bless you always . Aap aise hi aage badte rahen or help karte rahen",
    translation: {
      EN: "Thank you so much, Richa Kansal ji. Ever since we had a Reiki healing session with you, my mother has been sending you her blessings. And the best part is that the way you talk and explain things is no less than healing. You made both me and my mother completely stress-free. Thank you so much once again, dear. God bless you always. Keep growing like this and keep helping people.",
      DE: "Vielen herzlichen Dank, Richa Kansal ji. Seit wir bei dir eine Reiki-Sitzung hatten, schickt dir meine Mutter ihren Segen. Und das Schönste ist: Schon die Art, wie du sprichst und Dinge erklärst, ist nicht weniger als Heilung. Du hast mich und meine Mutter ganz stressfrei gemacht. Nochmals vielen Dank, Liebe. Gott segne dich immer. Mach weiter so und hilf weiterhin Menschen.",
    },
    EN: { role: "Reiki for my mother and me" },
    DE: { role: "Reiki für meine Mutter und mich" },
  },
  {
    id: "story-tarot-meetu-verma01",
    name: "@meetu.verma01",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    quote: "Thank you so much for your time it was on spot. You mentioned exactly what is my current situation and helped in giving clarity which I needed. I am really grateful to you I would highly recommend anyone to get in touch with you who has any doubts or questions in their minds .... Once again thank you so much",
    EN: { role: "Tarot reading" },
    DE: { role: "Tarot-Lesung" },
  },
  {
    id: "story-reiki-priyanka",
    name: "Priyanka",
    category: "Spiritual Healing",
    serviceId: "reiki",
    source: "WhatsApp",
    date: "2024-07",
    quoteLang: "EN",
    featured: true,
    quote: "Hi Richa i am glad to say thank you to you for helping me with the Reiki sessions. … I did Both Distance (Distance Reiki) and In person sessions, From day 1, I feel so good and lots of positivity feel in my body. My best wishes for you in future, May you get lots of success in your life and carrier. Thank you very much",
    EN: { role: "Distance and in-person Reiki" },
    DE: { role: "Fern- und Präsenz-Reiki" },
  },
  {
    id: "story-tarot-themessysassy-56",
    name: "@themessysassy_56",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    quote: "Thank you so much for your mini reading!! It gave me the much needed clarity on path forward and definitely put my mind to ease",
    EN: { role: "Mini tarot reading" },
    DE: { role: "Mini-Tarot-Lesung" },
  },
  {
    id: "story-yoga-evening",
    category: "Physical Wellness",
    serviceId: "yoga",
    source: "WhatsApp",
    date: "2024-02",
    quoteLang: "EN",
    screenshot: "/testimonials/yoga-evening-session.webp",
    quote: "Thank you Richa.. It was really lovely and relaxing evening yoga session with you. Enjoyed to the fullest. See you again next Tuesday",
    EN: { role: "Evening yoga" },
    DE: { role: "Abend-Yoga" },
  },
  {
    id: "story-tarot-subtly-subtle",
    name: "@subtly_subtle",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    quote: "Thank you so much the reading resonated with me very well and brought clarity. It wasn't a short but quiet detailed reading according to me.",
    EN: { role: "Tarot reading" },
    DE: { role: "Tarot-Lesung" },
  },
  {
    id: "story-yoga-knee",
    category: "Physical Wellness",
    serviceId: "yoga",
    quoteLang: "EN",
    quote: "Richa, I want to thank you for your advice on rehabbing my knee. … I feel much better … Thank you very much",
    EN: { role: "Yoga for the knee" },
    DE: { role: "Yoga für das Knie" },
  },
  {
    id: "story-tarot-peace-of-mind",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-10",
    quoteLang: "EN",
    quote: "Thank u thank u so much for ur kind words niramay.me.....ur words are more positive and brings peace in my mind....thank u so much for ur timely support....let me follow ur words of positivity to bring my mind calm and peaceful ...thank u once again",
    EN: { role: "Tarot reading" },
    DE: { role: "Tarot-Lesung" },
  },
  {
    id: "story-tarot-god-bless",
    category: "Tarot Reading",
    source: "Instagram",
    date: "2025-08",
    quoteLang: "EN",
    quote: "Thank u thank u so much for ur time..ur msg means a lot to me ... Feeling happy and relaxed now after receiving the answer for my question ...may god bless you abundantly..",
    EN: { role: "Free tarot reading" },
    DE: { role: "Kostenlose Tarot-Lesung" },
  },
];

// Grouped by `category` on the /faq page (headings in TRANSLATIONS.faq.categories).
// Only the `featured` ones also appear in the homepage FAQ section, which
// links through to the full page — so the FAQPage JSON-LD lives on /faq alone.
export const FAQS = [
  {
    category: "start",
    EN: {
      question: "I'm new to this — which service is right for me?",
      answer: "Book the free 15-minute discovery call. We'll talk through your goals and suggest the best fit, whether that's body-focused (Yoga), mind-focused (NLP, Hypnotherapy) or spiritual (Reiki, Past Life Regression, Vedic Astrology).",
    },
    DE: {
      question: "Ich bin neu hier – welches Angebot passt zu mir?",
      answer: "Buchen Sie das kostenlose 15-minütige Kennenlerngespräch. Wir sprechen über Ihre Ziele und empfehlen, was am besten passt – ob körperorientiert (Yoga), mental (NLP, Hypnotherapie) oder spirituell (Reiki, Rückführung, Vedische Astrologie).",
    }
  },
  {
    category: "start",
    featured: true,
    EN: {
      question: "Is there a free consultation?",
      answer: "Absolutely. We offer a free 15-minute discovery call to see if we are a good fit for your healing journey.",
    },
    DE: {
      question: "Gibt es eine kostenlose Beratung?",
      answer: "Absolut. Wir bieten ein kostenloses 15-minütiges Kennenlerngespräch an, um zu sehen, ob wir für Ihre Heilungsreise gut zusammenpassen.",
    }
  },
  {
    category: "start",
    featured: true,
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
    category: "start",
    EN: {
      question: "Do I need any prior experience?",
      answer: "No. Every individual session is tailored to you, and group classes like Active Yoga and Chair Yoga are open to everyone. Our seminars, such as Surya Namaskar, need no prior experience either.",
    },
    DE: {
      question: "Brauche ich Vorerfahrung?",
      answer: "Nein. Jede Einzelsitzung wird auf Sie abgestimmt, und Gruppenkurse wie Active Yoga und Stuhl-Yoga sind für alle offen. Auch unsere Seminare, etwa Surya Namaskar, setzen keine Vorkenntnisse voraus.",
    }
  },
  {
    category: "start",
    featured: true,
    EN: {
      question: "How do I book?",
      answer: "Click \"Book Now\" to pick a slot in our Google Calendar (Mon–Fri, 9am–6pm). For weekly group classes, message us on WhatsApp or email richa@niramay.me. VHS courses are booked directly with VHS Ostfildern using the course number.",
    },
    DE: {
      question: "Wie buche ich einen Termin?",
      answer: "Klicken Sie auf „Jetzt buchen\" und wählen Sie einen Termin in unserem Google-Kalender (Mo–Fr, 9–18 Uhr). Für die wöchentlichen Gruppenkurse schreiben Sie uns per WhatsApp oder an richa@niramay.me. VHS-Kurse buchen Sie direkt bei der VHS Ostfildern über die Kursnummer.",
    }
  },
  {
    category: "start",
    EN: {
      question: "Do I need to create an account?",
      answer: "No, an account is optional. It simply saves your details so booking and leaving reviews are quicker next time.",
    },
    DE: {
      question: "Muss ich ein Konto anlegen?",
      answer: "Nein, ein Konto ist optional. Es speichert lediglich Ihre Angaben, damit Buchungen und Bewertungen beim nächsten Mal schneller gehen.",
    }
  },
  {
    category: "sessions",
    featured: true,
    EN: {
      question: "Where do sessions take place?",
      answer: "Individual sessions take place at Ernst Kirchner Str 13/3, 73760 Ostfildern. Group classes run at Bürgertreff Scharnhauserpark, Treffpunkt Ruit, and An der Halle in Nellingen.",
    },
    DE: {
      question: "Wo finden die Sitzungen statt?",
      answer: "Einzelsitzungen finden in der Ernst Kirchner Str 13/3, 73760 Ostfildern statt. Gruppenkurse laufen im Bürgertreff Scharnhauserpark, im Treffpunkt Ruit und An der Halle in Nellingen.",
    }
  },
  {
    category: "sessions",
    EN: {
      question: "Do you offer online sessions?",
      answer: "Yes. Vedic Astrology readings are held online via Google Meet or Zoom, and Reiki can be done as distance energy work. NLP, Hypnotherapy and Yoga are also offered online.",
    },
    DE: {
      question: "Bieten Sie Online-Sitzungen an?",
      answer: "Ja. Vedische Astrologie-Lesungen finden online über Google Meet oder Zoom statt, und Reiki ist auch als Fernenergiearbeit möglich. NLP, Hypnotherapie und Yoga bieten wir ebenfalls online an.",
    }
  },
  {
    category: "sessions",
    EN: {
      question: "How long is a session?",
      answer: "Individual and group sessions usually last 60–90 minutes, depending on the service.",
    },
    DE: {
      question: "Wie lange dauert eine Sitzung?",
      answer: "Einzel- und Gruppensitzungen dauern in der Regel 60–90 Minuten, je nach Angebot.",
    }
  },
  {
    category: "sessions",
    EN: {
      question: "What should I wear or bring?",
      answer: "Wear comfortable clothes you can move in. For yoga, bring a mat and a small towel. No mat is needed for Chair Yoga.",
    },
    DE: {
      question: "Was soll ich anziehen oder mitbringen?",
      answer: "Tragen Sie bequeme Kleidung, in der Sie sich gut bewegen können. Für Yoga bringen Sie bitte eine Matte und ein kleines Handtuch mit. Für Stuhl-Yoga brauchen Sie keine Matte.",
    }
  },
  {
    category: "sessions",
    featured: true,
    EN: {
      question: "Do you offer sessions in German?",
      answer: "Our instructors are fluent in English and also use German as needed. Sessions are mostly held in English, with course material and translations available in German whenever you need them — around 95% of our clients are German speakers.",
    },
    DE: {
      question: "Bieten Sie Sitzungen auf Deutsch an?",
      answer: "Unsere Lehrenden sprechen fließend Englisch und nutzen bei Bedarf auch Deutsch. Die Sitzungen finden überwiegend auf Englisch statt, Kursmaterialien und Übersetzungen ins Deutsche stehen jederzeit zur Verfügung – rund 95 % unserer Klientinnen und Klienten sind deutschsprachig.",
    }
  },
  {
    category: "sessions",
    featured: true,
    EN: {
      question: "What is your cancellation policy?",
      answer: "Please give at least 24 hours' notice to reschedule or cancel.",
    },
    DE: {
      question: "Wie sind Ihre Stornierungsbedingungen?",
      answer: "Bitte sagen Sie mindestens 24 Stunden vorher Bescheid, wenn Sie einen Termin verschieben oder absagen möchten.",
    }
  },
  {
    category: "services",
    EN: {
      question: "What is Reiki, and do I have to be touched?",
      answer: "Reiki is gentle energy work for deep relaxation and emotional release. It can be done with light touch or at a distance — whichever you prefer.",
    },
    DE: {
      question: "Was ist Reiki, und werde ich dabei berührt?",
      answer: "Reiki ist sanfte Energiearbeit für tiefe Entspannung und emotionale Befreiung. Sie kann mit leichter Berührung oder aus der Ferne erfolgen – ganz wie Sie möchten.",
    }
  },
  {
    category: "services",
    EN: {
      question: "Will I lose control under hypnosis?",
      answer: "No. You stay aware and in control throughout. Hypnotherapy is a deeply relaxed, focused state that helps you work with your subconscious on things like anxiety, phobias or habits.",
    },
    DE: {
      question: "Verliere ich unter Hypnose die Kontrolle?",
      answer: "Nein. Sie bleiben die ganze Zeit wach und behalten die Kontrolle. Hypnotherapie ist ein tief entspannter, fokussierter Zustand, in dem Sie mit Ihrem Unterbewusstsein an Themen wie Ängsten, Phobien oder Gewohnheiten arbeiten.",
    }
  },
  {
    category: "services",
    EN: {
      question: "How much is a Vedic Astrology reading, and how do I pay?",
      answer: "A reading costs 25 EUR or 2500 INR (special offer — usually 50 EUR or 5000 INR), paid in advance via PayPal or SEPA bank transfer (EUR) or UPI (INR). Include your reference code in the payment note — your slot is confirmed within 24–48 hours.",
    },
    DE: {
      question: "Was kostet eine Vedische Astrologie-Lesung, und wie bezahle ich?",
      answer: "Eine Lesung kostet 25 EUR oder 2500 INR (Sonderangebot – regulär 50 EUR oder 5000 INR), zahlbar im Voraus per PayPal oder SEPA-Überweisung (EUR) bzw. UPI (INR). Geben Sie Ihren Referenzcode im Verwendungszweck an – Ihr Termin wird innerhalb von 24–48 Stunden bestätigt.",
    }
  },
  {
    category: "services",
    EN: {
      question: "What do I need for an astrology reading?",
      answer: "Your full name, place of birth, date of birth and time of birth, as exact as you have it. Your chart is prepared before the call, and you receive a write-up of the analysis afterwards.",
    },
    DE: {
      question: "Was brauche ich für eine Astrologie-Lesung?",
      answer: "Ihren vollständigen Namen, Geburtsort, Geburtsdatum und Geburtszeit – so genau wie möglich. Ihr Horoskop wird vor dem Gespräch vorbereitet, und im Anschluss erhalten Sie eine schriftliche Zusammenfassung der Analyse.",
    }
  },
  {
    category: "services",
    EN: {
      question: "Is astrology about predicting my future?",
      answer: "No. We treat your birth chart as a map of your nature and life cycles, not as fixed fortune-telling — grounded guidance free from fear or fatalism.",
    },
    DE: {
      question: "Geht es bei Astrologie darum, meine Zukunft vorherzusagen?",
      answer: "Nein. Wir betrachten Ihr Geburtshoroskop als Landkarte Ihrer Natur und Lebenszyklen, nicht als starre Wahrsagerei – eine geerdete Begleitung ohne Angst oder Fatalismus.",
    }
  },
  {
    category: "services",
    EN: {
      question: "Do you offer classes for children?",
      answer: "Yes. Yoga Kids (ages 7–11, Fridays) and Teen Yoga (ages 12–14, Tuesdays) run through VHS Ostfildern.",
    },
    DE: {
      question: "Gibt es Kurse für Kinder?",
      answer: "Ja. Yoga Kids (7–11 Jahre, freitags) und Teen Yoga (12–14 Jahre, dienstags) finden über die VHS Ostfildern statt.",
    }
  },
  {
    category: "services",
    EN: {
      question: "What is Chair Yoga, and who is it for?",
      answer: "Gentle movement and breathing done seated or with the support of a chair — no mat and no getting down on the floor. It suits older adults, people with limited mobility, or anyone who prefers to stay off the floor.",
    },
    DE: {
      question: "Was ist Stuhl-Yoga, und für wen ist es geeignet?",
      answer: "Sanfte Bewegung und Atmung im Sitzen oder mit Unterstützung eines Stuhls – ohne Matte und ohne auf den Boden zu müssen. Ideal für ältere Menschen, Menschen mit eingeschränkter Beweglichkeit oder alle, die lieber nicht auf dem Boden üben.",
    }
  },
  {
    category: "about",
    EN: {
      question: "Who are the teachers, and what are their qualifications?",
      answer: "Richa Kansal is Yoga Alliance and S-VYASA certified, a certified NLP practitioner, Reiki Master, hypnotherapist and Past Life Regression therapist. Riju Kansal is an S-VYASA certified yoga therapist, trained at Vyasa Yoga Singapore and Yoga Alliance certified. They have taught together since 2018.",
    },
    DE: {
      question: "Wer sind die Lehrenden, und welche Qualifikationen haben sie?",
      answer: "Richa Kansal ist Yoga-Alliance- und S-VYASA-zertifiziert, zertifizierte NLP-Praktikerin, Reiki-Meisterin, Hypnotherapeutin und Rückführungstherapeutin. Riju Kansal ist S-VYASA-zertifizierter Yogatherapeut, ausgebildet bei Vyasa Yoga Singapur und Yoga-Alliance-zertifiziert. Beide unterrichten seit 2018 gemeinsam.",
    }
  },
  {
    category: "about",
    EN: {
      question: "Is this a replacement for medical or psychological treatment?",
      answer: "No. Our sessions complement, but don't replace, medical or psychotherapeutic care. If you have a diagnosed condition, please continue working with your doctor.",
    },
    DE: {
      question: "Ersetzen die Sitzungen eine ärztliche oder psychotherapeutische Behandlung?",
      answer: "Nein. Unsere Sitzungen ergänzen eine ärztliche oder psychotherapeutische Behandlung, ersetzen sie aber nicht. Wenn bei Ihnen eine Erkrankung diagnostiziert wurde, bleiben Sie bitte weiterhin in ärztlicher Betreuung.",
    }
  },
  {
    category: "about",
    EN: {
      question: "How is my personal data handled?",
      answer: "Birth details and contact information are used only to prepare your session, are never shared with third parties, and can be deleted on request via richa@niramay.me. Analytics cookies are only set with your consent.",
    },
    DE: {
      question: "Wie werden meine persönlichen Daten behandelt?",
      answer: "Geburtsdaten und Kontaktangaben werden ausschließlich zur Vorbereitung Ihrer Sitzung verwendet, nie an Dritte weitergegeben und auf Anfrage über richa@niramay.me gelöscht. Analyse-Cookies setzen wir nur mit Ihrer Einwilligung.",
    }
  },
  {
    category: "about",
    EN: {
      question: "Can I buy Richa's book?",
      answer: "Yes. \"Journey from Body to Bliss: The Niramay Path to Pancha Koshas\" is available on Amazon.",
    },
    DE: {
      question: "Kann ich Richas Buch kaufen?",
      answer: "Ja. „Journey from Body to Bliss: The Niramay Path to Pancha Koshas\" ist bei Amazon erhältlich.",
    }
  },
];

// Per-person credential badges shown on the "Meet Your Healers" cards.
export const HEALER_CERTIFICATIONS = {
  richa: [
    {
      icon: ShieldCheck,
      EN: { name: "Yoga Alliance Certified" },
      DE: { name: "Yoga Alliance Zertifiziert" }
    },
    {
      icon: Brain,
      EN: { name: "Certified NLP Practitioner" },
      DE: { name: "Zertifizierter NLP-Praktiker" }
    },
    {
      icon: Sparkles,
      EN: { name: "Master Reiki Healer" },
      DE: { name: "Reiki-Meister-Heiler" }
    },
    {
      icon: Moon,
      EN: { name: "Hypnotherapist" },
      DE: { name: "Hypnotherapeut" }
    },
    {
      icon: History,
      EN: { name: "Certified Past Life Regression Therapist" },
      DE: { name: "Zertifizierte Rückführungstherapeutin" }
    },
    {
      icon: Star,
      EN: { name: "Spiritual Astrology Consultant" },
      DE: { name: "Spirituelle Astrologie-Beraterin" }
    },
    {
      icon: GraduationCap,
      EN: { name: "S-VYASA Certified" },
      DE: { name: "S-VYASA-zertifiziert" }
    },
  ],
  riju: [
    {
      icon: GraduationCap,
      EN: { name: "S-VYASA Certified" },
      DE: { name: "S-VYASA-zertifiziert" }
    },
    {
      icon: Heart,
      EN: { name: "Certified Yoga Therapist" },
      DE: { name: "Zertifizierter Yogatherapeut" }
    },
    {
      icon: Award,
      EN: { name: "Vyasa Yoga Singapore Trained" },
      DE: { name: "Ausgebildet bei Vyasa Yoga Singapur" }
    },
    {
      icon: ShieldCheck,
      EN: { name: "Yoga Alliance Certified" },
      DE: { name: "Yoga Alliance Zertifiziert" }
    },
  ],
};

// Portrait + shared "together" photos for the "Meet Your Healers" section.
export const HEALER_IMAGES = {
  richa: "/about/richa-portrait.webp",
  riju: "/about/riju-portrait.webp",
  together: "/about/richa-riju-together.webp",
};

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

// Structured, multi-week courses and workshops. Unlike ONGOING_SESSIONS (which
// people join directly by messaging Richa/Riju), each of these is administered
// by an external `provider` who owns registration and the course number — so
// cards link out to the provider instead of offering a direct WhatsApp booking.
// A future Niramay-run course can simply omit `provider`/`kursnr`/`registrationUrl`
// and CoursesSection falls back to the WhatsApp booking flow (see App.tsx).
export const COURSES = [
  {
    // Niramay's own online series: booked and paid for on this site (see
    // CourseIntakeModal in App.tsx), with a dedicated /courses/:id page.
    id: "yoga-stress-immunity-sleep",
    bookable: true,
    // TRANSLATIONS key holding this course's /courses/:id page copy.
    pageKey: "yogaSeries",
    offerPrice: "79",
    blogSlug: "stress-immunity-and-sleep-how-yoga-restores-your-balance",
    EN: {
      title: "Yoga for Stress, Immunity & Sleep: 8-Session Series",
      time: "Starts Nov 3 · Tue & Thu, 20:00–21:00 · 4 weeks",
      location: "Online (live)",
      price: "€79 · 8 sessions",
      instructor: "Riju",
      description: "Gentle stretching, breathing, meditation and deep relaxation to handle stress better, support immunity and sleep well.",
    },
    DE: {
      title: "Yoga für Stress, Immunität & Schlaf: Serie mit 8 Einheiten",
      time: "Ab 3. Nov. · Di & Do, 20:00–21:00 Uhr · 4 Wochen",
      location: "Online (live)",
      price: "79 € · 8 Einheiten",
      instructor: "Riju",
      description: "Sanfte Dehnung, Atemübungen, Meditation und Tiefenentspannung für mehr Gelassenheit, ein starkes Immunsystem und guten Schlaf.",
    }
  },
  {
    // One workshop offered on two dates: the booker picks one `sessions`
    // entry (stored as `session` on the courseBookings doc — keep the ids in
    // sync with firestore.rules and api/notify-course-booking.ts). Payable in
    // EUR or INR, and bookable only until `bookingClosesAt`.
    id: "yoga-adventure",
    bookable: true,
    pageKey: "yogaAdventure",
    offerPrice: "15",
    acceptsINR: true,
    contactEmail: "richa@niramay.me",
    bookingClosesAt: "2026-10-20T23:59:59+02:00",
    sessions: [
      {
        id: "2026-10-24",
        EN: "Sat 24 Oct · 12:30–2:00 pm European time (4:00–5:30 pm IST)",
        DE: "Sa, 24. Okt. · 12:30–14:00 Uhr europäische Zeit (16:00–17:30 Uhr IST)",
      },
      {
        id: "2026-10-29",
        EN: "Thu 29 Oct · 11:30 am–1:00 pm European time (4:00–5:30 pm IST)",
        DE: "Do, 29. Okt. · 11:30–13:00 Uhr europäische Zeit (16:00–17:30 Uhr IST)",
      },
    ],
    EN: {
      title: "Yoga Adventure – Move • Breathe • Play • Discover!",
      time: "Sat 24 Oct or Thu 29 Oct · 1.5 hours",
      location: "Online (live) · English",
      price: "€15 / ₹1500 per child",
      instructor: "Richa",
      description: "A fun, interactive yoga workshop for children aged 9–14 — movement, breathing, focus, games and self-discovery in a small group (max. 12). Choose one date; registration until 20 October.",
      nameLabel: "Parent's Full Name",
      notesPlaceholder: "Your child's name and age, and anything we should know (health conditions, yoga experience…)",
    },
    DE: {
      title: "Yoga-Abenteuer – Bewegen • Atmen • Spielen • Entdecken!",
      time: "Sa, 24. Okt. oder Do, 29. Okt. · 1,5 Stunden",
      location: "Online (live) · Englisch",
      price: "15 € / ₹1500 pro Kind",
      instructor: "Richa",
      description: "Ein lustiger, interaktiver Yoga-Workshop für Kinder von 9–14 Jahren – Bewegung, Atmung, Konzentration, Spiele und Selbstentdeckung in kleiner Gruppe (max. 12). Einen Termin wählen; Anmeldung bis 20. Oktober.",
      nameLabel: "Vollständiger Name (Elternteil)",
      notesPlaceholder: "Name und Alter Ihres Kindes sowie alles, was wir wissen sollten (Gesundheit, Yoga-Erfahrung…)",
    }
  },
  {
    id: "bollywood-dance-workshop",
    provider: "VHS Ostfildern",
    kursnr: "262-301115",
    registrationUrl: "https://vhs-ostfildern.de/programm/kw/bereich/kursdetails/kurs/262-301115/",
    EN: {
      title: "Indian Bollywood Dance",
      time: "Sat, Oct 10, 11:00–12:30",
      location: "An der Halle, Nellingen – Ballettsaal",
      instructor: "Richa & Riju",
      description: "Fun & Energetic — a one-off Saturday of upbeat choreography, open to every level.",
    },
    DE: {
      title: "Indian Bollywood Dance",
      time: "Sa, 10.10., 11:00–12:30 Uhr",
      location: "An der Halle, Nellingen – Ballettsaal",
      instructor: "Richa & Riju",
      description: "Fun & Energetic – ein Samstag voller mitreißender Choreos, für jedes Niveau geeignet.",
    }
  },
  {
    id: "surya-namaskar-seminar",
    provider: "VHS Ostfildern",
    kursnr: "262-301116",
    registrationUrl: "https://vhs-ostfildern.de/programm/kw/bereich/kursdetails/kurs/262-301116/",
    EN: {
      title: "Surya Namaskar Seminar",
      time: "Sat, Oct 17, 10:00",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "The Power of the Sun Salutation — a focused Saturday workshop, no prior experience needed.",
    },
    DE: {
      title: "Yoga-Seminar: Surya Namaskar",
      time: "Sa, 17.10., 10:00 Uhr",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "Die Kraft des Sonnengrußes – ein kompakter Samstags-Workshop, keine Vorkenntnisse nötig.",
    }
  },
  {
    id: "patanjali-seminar",
    provider: "VHS Ostfildern",
    kursnr: "262-301117",
    registrationUrl: "https://vhs-ostfildern.de/programm/kw/bereich/kursdetails/kurs/262-301117/",
    EN: {
      title: "The 8 Limbs of Yoga (Patanjali)",
      time: "Sat, Nov 14, 10:00",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "An introduction to Patanjali's eight-limbed path — yoga philosophy made practical.",
    },
    DE: {
      title: "Yoga-Seminar: Die 8 Glieder des Yoga",
      time: "Sa, 14.11., 10:00 Uhr",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "Eine Einführung in die acht Glieder des Yoga nach Patanjali – Philosophie für den Alltag.",
    }
  },
  {
    id: "pranayama-seminar",
    provider: "VHS Ostfildern",
    kursnr: "262-301118",
    registrationUrl: "https://vhs-ostfildern.de/programm/kw/bereich/kursdetails/kurs/262-301118/",
    EN: {
      title: "Pranayama Seminar",
      time: "Sat, Jan 23, 10:00",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "The Power of the Breath — breathing techniques to calm the mind and boost energy.",
    },
    DE: {
      title: "Yoga-Seminar: Pranayama",
      time: "Sa, 23.01., 10:00 Uhr",
      location: "An der Halle, Nellingen, R. 17",
      instructor: "Riju",
      description: "Die Kraft des Atems – Atemtechniken zur Beruhigung des Geistes und für neue Energie.",
    }
  }
];

// Short items for the announcement bar at the top of every page (see
// AnnouncementBar in App.tsx). `href` is a site path without the /de prefix
// (it's added for German pages); `until` is the last day (YYYY-MM-DD, German
// time) the item is shown, so it drops out on its own once it's over.
export const ANNOUNCEMENTS: {
  id: string;
  href: string;
  until: string;
  // `short` is the phone version of `label`; keep it under ~38 characters.
  EN: { label: string; short: string; cta: string };
  DE: { label: string; short: string; cta: string };
}[] = [
  {
    id: "yoga-stress-immunity-sleep-2026-11",
    href: "/courses/yoga-stress-immunity-sleep",
    until: "2026-11-03",
    EN: { label: "New online series: Yoga for Stress, Immunity & Sleep · starts 3 Nov", short: "New: Yoga for Stress & Sleep · 3 Nov", cta: "Book now" },
    DE: { label: "Neue Online-Serie: Yoga für Stress, Immunität & Schlaf · ab 3. Nov.", short: "Neu: Yoga für Stress & Schlaf · 3.11.", cta: "Jetzt buchen" },
  },
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
