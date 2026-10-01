# PRD: Paid Online Workshops (discover → pay → attend → certify)

| Field | Value |
|---|---|
| Status | Draft v1, for review |
| Owner | Riju (product), Richa (content and teaching) |
| Last updated | 2026-10-01 |
| Target release | MVP in 3 slices (see §12) |
| Related code | `src/App.tsx`, `src/constants.ts` (`COURSES`), `src/lib/auth.tsx`, `firestore.rules`, `api/` |

> **How to use this document (for humans and AI coding agents).**
> Each requirement has a stable ID (`FR-…`, `NFR-…`, `SEC-…`). Reference IDs in commits, PRs and tests.
> §3 lists the constraints that come from the codebase as it is today. Read it before writing code.
> §14 is a brief you can paste into an agent for each build slice. Each requirement is labelled
> **MUST**, **SHOULD** or **COULD**. When something here is ambiguous, it is listed in §15 (Open questions).
> Ask about it. Don't guess.

---

## 1. Problem and goal

Niramay currently sells workshops through third parties (VHS Ostfildern, see `COURSES` in
`src/constants.ts`) or through manual WhatsApp/PayPal arrangements (for example the astrology flow with
its `paymentClaimed` flag). Running our own **online** workshops this way means manual payment matching,
manual link sharing, and no record of who attended.

**Goal:** a visitor finds a workshop, understands what it gives them, pays in under two minutes, and
afterwards gets everything they need (calendar entries, join link, notes, certificate) without anyone
from Niramay doing manual work.

### 1.1 Success metrics

| Metric | Target (first 3 workshops) |
|---|---|
| Visit to workshop page → paid | ≥ 3% |
| Checkout started → paid | ≥ 60% |
| Median time from "Book" click to payment confirmed | < 2 min |
| Paid attendees who join session 1 | ≥ 85% |
| "How do I join?" / "Where's the link?" support messages | ≤ 1 per workshop |
| Manual admin steps per workshop after it is published | ≤ 2 per session (upload notes, publish recap) |
| Transactional email delivered (not bounced or spam-foldered) | ≥ 98% |

### 1.2 Non-goals for MVP

- A full LMS (quizzes, graded assignments, drip content).
- Self-hosted video. We use an external meeting provider.
- Selling physical goods, gift cards, subscriptions or memberships.
- A multi-instructor marketplace. Only Richa and Riju run workshops.
- In-person workshops. The data model allows them (`format: "online" | "in_person"`), but the MVP flows are online only.
- Native mobile apps.

---

## 2. Users and roles

| Role | Description | Auth |
|---|---|---|
| **Visitor** | Anonymous. Arrives from the home page, blog, social or a shared link. | none |
| **Participant** | Signed-in user with at least one paid registration. | Firebase Auth |
| **Admin** | Richa or Riju. Creates workshops, uploads notes, publishes recaps, issues refunds. | Firebase Auth plus the existing email allowlist (`isBlogAdmin()` in `firestore.rules`, `api/_lib/blogAuth.ts`) |
| **System** | Vercel cron, Stripe webhooks, email sender. | Server secrets |

---

## 3. Context: constraints from the current codebase

This section describes the codebase as it is today. Proposals must fit inside it, or explicitly say why they don't.

1. **Stack.** React 19 SPA (Vite, react-router v7) hosted on Vercel. Serverless functions live in `api/*.ts`
   and use `@vercel/node`. Data is in Firestore. The admin SDK is in `api/_lib/firebaseAdmin.ts`.
2. **Auth.** Firebase email/password through `src/lib/auth.tsx`. The SDK is lazy-loaded to keep the bundle
   small, and the new flows must keep it that way. `users/{uid}` is immutable after signup and readable
   only by its owner.
3. **Security model.** `firestore.rules` is default-deny. Anything that involves money, rate limiting or
   trust goes through `api/` with the admin SDK and is never written by the client. The comments,
   votes and review flows already follow this pattern. Copy it.
4. **Email.** nodemailer over Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). Today it is only used for
   low-volume admin notifications. Escape user content with `escapeHtml` and add a `[Preview]` prefix
   with `adminSubject()` (both in `api/_lib/util.ts`).
5. **Signed links.** HMAC helpers with domain separation (`api/_lib/engagement.ts`, `reviewToken.ts`).
   Reuse them for tokenised email links.
6. **i18n.** Everything user-facing is in EN and DE (`/` and `/de/` routes, `TRANSLATIONS` in `constants.ts`).
   Workshop content, emails, certificates and `.ics` files MUST be bilingual, and the language is picked
   per user.
7. **Locale.** The business is in Ostfildern, Germany, and most customers are German speakers (FAQ: about 95%).
   GDPR applies, as do German consumer law (Widerrufsrecht) and German invoicing rules. The default timezone
   is `Europe/Berlin`.
8. **Link previews and SEO.** `api/blog-share.ts` server-renders OG tags for blog posts, and
   `api/sitemap.ts` builds the sitemap. Workshop pages need the same treatment.
9. **Preview environment.** Vercel preview deployments use a separate Firebase project. Payments in preview
   MUST use Stripe test mode.

---

## 4. Key product decisions (with recommendations)

Each decision lists the recommended option first. Record the final choice in the Decision log (§16).

| # | Decision | Recommendation | Why | Alternative |
|---|---|---|---|---|
| D1 | Payment provider | **Stripe Checkout (hosted page)** | Cards, PayPal, Apple Pay, Google Pay, Klarna and SEPA in one integration. Keeps PCI scope at SAQ‑A. No payment JS in our bundle. Tax and invoice support built in. | PayPal Checkout only. Simpler, but no wallets, weaker webhooks, more custom work. |
| D2 | Cart vs. "Book now" | **"Book now" goes straight to checkout, quantity 1.** The data model is order-based, so a cart can be added later. | We sell 1–3 workshops at a time, and a cart adds steps, state and abandoned-cart edge cases for little benefit. If a cart is required, see FR‑CART. | A full multi-item cart (FR‑CART, marked COULD). |
| D3 | When to sign in | **Sign in inline at checkout, before payment.** Offer email/password (existing), **Google** and **email link (passwordless)**. | A registration needs an owner so the user area, notes and certificate work. Inline sign-in avoids leaving the page. Passwordless removes "forgot password" drop-off. | Guest checkout, then auto-create the account from the Stripe email after payment. Lowest friction, more complex account linking. Candidate for v2. |
| D4 | Meeting provider | **Zoom Meetings with registration** (per-attendee join links), *or* **Google Meet** if staying in Google Workspace | Per-attendee links make sharing links less useful and give attendance reports, which a v2 attendance-based certificate needs. | One static Meet link per workshop. Simplest, but anyone with the link can join. |
| D5 | How the join link is given out | **Never email the raw meeting URL.** Email a **gated link** `/{lang}/my/workshops/{regId}/join` that checks the session and time window, then redirects. | One place to rotate a link, enforce timing and log clicks for attendance. | Raw link in email. Simple, but leaks and can't be updated. |
| D6 | Email transport | **Transactional ESP (Postmark, Resend or Brevo, EU region)** with SPF, DKIM and DMARC on `niramay.me` | Gmail SMTP has daily limits, poor deliverability for bulk reminders and no bounce webhooks. | Keep Gmail for admin notices only. |
| D7 | Certificate eligibility | **MVP: every paid, non-refunded participant, and admin can exclude someone.** v2: attended ≥ N% of sessions. | Measuring attendance reliably depends on D4. Don't block the MVP on it. | Attendance-gated from day one. |
| D8 | File storage for notes and certificates | **Private storage served through an authenticated API** (Firebase Storage with rules, or private Vercel Blob plus short-lived signed URLs) | Notes are paid content. Public Blob URLs can be shared. | Public Blob with obscure URLs. Not acceptable for paid content. |

---

## 5. End-to-end journey (happy path)

```
Discover ─▶ Workshop page ─▶ Book ─▶ Sign in (inline) ─▶ Stripe Checkout ─▶ Success page
                                                                │
                                         Stripe webhook ◀───────┘ (source of truth)
                                                │
                     Confirmation email (+ .ics, invoice, "Add to calendar")
                                                │
             T‑7d (optional) / T‑24h / T‑1h reminders (gated join link)
                                                │
                     Session ─▶ Recap email (notes link to user area) ─▶ … repeat per session
                                                │
               Final session ─▶ Completion email (certificate PDF, help docs, review request)
```

---

## 6. Functional requirements

### 6.1 Discovery (FR‑DISC)

| ID | Pri | Requirement |
|---|---|---|
| FR‑DISC‑1 | MUST | The home page shows an **"Upcoming workshops"** section (next to the existing Courses section) with up to 3 upcoming, published workshops: title, date range, format badge "Online", price, seats left (when ≤ 5), and a CTA. Sorted by start date. |
| FR‑DISC‑2 | MUST | A blog post can embed a **workshop card** by reference (`workshopId`, or a shortcode such as `[[workshop:slug]]` in the content). The card reads live data, so price and seats are never stale. If the workshop is past or unpublished, the card says "This workshop has ended. See upcoming workshops" and links to the list instead of breaking. |
| FR‑DISC‑3 | MUST | `/workshops` and `/de/workshops` list page: upcoming first, then a collapsed "Past workshops" section (social proof). |
| FR‑DISC‑4 | SHOULD | Workshop URLs get OG and Twitter preview tags through a server function (same pattern as `api/blog-share.ts`), are included in `api/sitemap.ts`, and carry `schema.org/Event` JSON‑LD (`eventAttendanceMode: OnlineEventAttendanceMode`, `offers`, `startDate`). |
| FR‑DISC‑5 | COULD | A "Notify me" email capture for sold-out or future workshops, with separate, explicit marketing consent (double opt-in). |

### 6.2 Workshop detail page (FR‑DET) at `/workshops/:slug`

| ID | Pri | Requirement |
|---|---|---|
| FR‑DET‑1 | MUST | Content shown above the fold: title, one-line promise, dates, times (in the visitor's timezone **and** Europe/Berlin, e.g. "Sat 17 Oct, 10:00–12:00 CEST (your time: 09:00 BST)"), price incl. VAT, seats left, primary CTA "Book your place". |
| FR‑DET‑2 | MUST | Body sections: **What you'll learn** (3–6 outcome bullets), **Who it's for / not for**, **Schedule** (one row per session: date, time, topic), **What you need** (mat, quiet space, camera optional), **Your teacher(s)**, **What's included** (live sessions, notes, certificate), **FAQ**, **Cancellation and refund policy** (short form plus link to the full terms). |
| FR‑DET‑3 | MUST | The CTA changes with state: `Book your place` → `Only N left` → `Sold out – join waitlist` → `Booking closed` (after the cutoff) → `You're booked ✓ – go to My Workshops` (signed in and already registered; this prevents double purchase). |
| FR‑DET‑4 | MUST | Sticky CTA bar on mobile, shown after scrolling past the hero. |
| FR‑DET‑5 | SHOULD | Testimonials filtered by workshop category, from approved `reviews`. |
| FR‑DET‑6 | MUST | Price and seats-left come from Firestore at render time. The page MUST NOT rely on a cached price at checkout, because the server recomputes it (SEC‑PAY‑2). |

### 6.3 Sign-in at checkout (FR‑AUTH)

| ID | Pri | Requirement |
|---|---|---|
| FR‑AUTH‑1 | MUST | Clicking "Book" while signed out opens the existing `AuthDialog` in **checkout mode**: the heading names the workshop being booked, it defaults to the **Sign up** tab for new visitors, and on success it continues straight to checkout without a second click. |
| FR‑AUTH‑2 | SHOULD | Add **Continue with Google** and **Email me a sign-in link** (Firebase `signInWithEmailLink`) to the dialog. Keep the lazy loading of `firebase/auth`. |
| FR‑AUTH‑3 | MUST | The account email becomes the registration's contact email, and is pre-filled and locked in Stripe Checkout (`customer_email`). |
| FR‑AUTH‑4 | MUST | Signup asks for the **preferred language** (defaults to the current site language) and **timezone** (auto-detected, editable later). Both are used for emails and calendar files. *(This needs a `users` schema change; today `isValidUser` requires exactly 3 keys. See §8.)* |
| FR‑AUTH‑5 | MUST | Email verification: the user may pay before verifying, but the confirmation email doubles as verification ("Confirm your email to access your workshop area"). Don't block payment on it. |

### 6.4 Cart (FR‑CART), COULD, see D2

If a cart is required for the MVP:

- One line per workshop, quantity fixed at 1 (each person needs their own account for their certificate).
- The cart lives in `localStorage` while anonymous and moves to `carts/{uid}` (server-written) on sign-in.
- The cart shows live price and availability, and flags changed or sold-out items before checkout.
- No seat is held while an item is in the cart. Seats are held only when checkout starts (FR‑PAY‑3).
- Abandoned-cart emails are **out of scope**. They count as marketing email and need consent.

### 6.5 Checkout and payment (FR‑PAY)

| ID | Pri | Requirement |
|---|---|---|
| FR‑PAY‑1 | MUST | The client calls `POST /api/checkout` with `{ workshopId, lang }` and a Firebase ID token. The server validates everything and creates a Stripe Checkout Session, then the client redirects to `session.url`. |
| FR‑PAY‑2 | MUST | The server rejects the request when the workshop is unpublished, booking is closed, the user already has an active registration for it, or no seats are available. Each case returns a machine-readable code that the UI translates. |
| FR‑PAY‑3 | MUST | **Seat hold:** in the same Firestore transaction, create `orders/{orderId}` with `status: "pending"` and increment `workshop.seatsHeld`. The hold expires with the Stripe session (`expires_at` = now + 30 min, Stripe's minimum). `checkout.session.expired` or a sweeping cron releases it. |
| FR‑PAY‑4 | MUST | Stripe session settings: `mode: payment`, `client_reference_id = orderId`, `metadata {orderId, workshopId, uid}`, `locale` = user language, `customer_email`, `invoice_creation.enabled = true`, `success_url = /{lang}/checkout/success?order={orderId}`, `cancel_url` = the workshop page with `?checkout=cancelled`. |
| FR‑PAY‑5 | MUST | Payment methods: card, PayPal, Apple Pay, Google Pay. **SEPA Direct Debit and other delayed methods are disabled** when the workshop starts in less than 7 days (see ALT‑6). |
| FR‑PAY‑6 | MUST | **The webhook is the source of truth.** `POST /api/stripe-webhook` verifies the signature and handles `checkout.session.completed` (when `payment_status=paid`), `checkout.session.async_payment_succeeded`, `async_payment_failed`, `checkout.session.expired` and `charge.refunded`. On payment it **idempotently** moves the order to `paid`, creates `registrations/{regId}`, moves the seat from held to sold, and queues the confirmation email. |
| FR‑PAY‑7 | MUST | The success page **never assumes** the payment went through. It shows "Confirming your payment…" and listens to the user's own order doc (or polls it every 2 s for up to 30 s). It then shows ✓ plus the next steps (add to calendar, go to My Workshops). If it times out: "Your payment is being processed. You'll get an email within a few minutes", with the order reference shown. |
| FR‑PAY‑8 | MUST | Invoices and receipts come from Stripe and meet German invoice requirements (business name and address, tax number or VAT ID, sequential number, date, VAT line or the §19 UStG small-business note). **Decision needed, see Q1.** |
| FR‑PAY‑9 | MUST | Before paying, the user checks a box accepting the T&Cs, cancellation policy and privacy policy. For withdrawal rights, show the legally required text (see Q2). The acceptance is stored on the order with a timestamp and the policy version. |
| FR‑PAY‑10 | SHOULD | Promotion codes (`allow_promotion_codes: true`), managed in the Stripe dashboard. No custom code needed. |

### 6.6 Confirmation and calendar (FR‑CONF)

| ID | Pri | Requirement |
|---|---|---|
| FR‑CONF‑1 | MUST | **Confirmation email** within 1 minute of payment, in the user's language. It contains the workshop title, every session's date and time (user's timezone plus Berlin time), a "How to join" explanation, a **My Workshops** button, a **calendar file** (`.ics`), "Add to Google / Outlook" links, a link to the invoice or receipt, the cancellation policy, and a contact address. |
| FR‑CONF‑2 | MUST | The `.ics` file contains **one `VEVENT` per session**, each with a stable `UID` (`{sessionId}-{regId}@niramay.me`), `SEQUENCE`, `DTSTART`/`DTEND` in UTC, a `VALARM` 30 min before, `URL` and `LOCATION` set to the gated join link (D5), and a description with the user-area link. Use `METHOD:PUBLISH` (an add-to-calendar file, not a meeting invitation). |
| FR‑CONF‑3 | MUST | The same `.ics` can be downloaded from the success page and from My Workshops (`GET /api/workshop-ics?reg=…`, authenticated). |
| FR‑CONF‑4 | SHOULD | **Per-user calendar subscription feed** (`webcal://…/api/calendar/{token}.ics`, with an HMAC token that can be revoked). When a session is rescheduled, the user's calendar updates on its own, with no new file to import. Recommended because reschedules happen. |
| FR‑CONF‑5 | MUST | Admin gets a short email for every new booking (existing `adminSubject()` pattern). |

### 6.7 Before each session (FR‑PRE)

| ID | Pri | Requirement |
|---|---|---|
| FR‑PRE‑1 | MUST | **T‑24h reminder** per session: time, what to prepare, the gated **Join** button, and a "Can't make it?" link (policy and contact). |
| FR‑PRE‑2 | MUST | **T‑1h reminder** per session: short, with the Join button as the main element and "Starts at 10:00 your time". |
| FR‑PRE‑3 | SHOULD | **First-session tech check** with the T‑24h email: "Test your audio and video" (the meeting provider's test link), install tips, and "Join 10 minutes early". |
| FR‑PRE‑4 | MUST | A user who books **after** a reminder's send time gets no stale reminder. The confirmation email says "Your first session is in X hours" with the Join button (see ALT‑3). |
| FR‑PRE‑5 | MUST | In **My Workshops**, the session card shows a countdown. The **Join** button becomes active **15 min before the start** and stays active until **30 min after the scheduled end**. |

### 6.8 Joining (FR‑JOIN)

| ID | Pri | Requirement |
|---|---|---|
| FR‑JOIN‑1 | MUST | `GET /{lang}/my/workshops/:regId/join` (client route plus `GET /api/join?reg=&session=`) checks that the user is signed in, owns the registration, the registration is `active`, and the time is within the join window. It then logs `joinClickedAt` and **302-redirects** to the meeting URL (the per-attendee URL when D4 = Zoom registration). |
| FR‑JOIN‑2 | MUST | Join links in emails carry a **signed, single-purpose token** (HMAC over `regId`, `sessionId` and an expiry at session end + 1 h). A participant who isn't signed in on that device (for example on a phone) can still join with one tap and is **not** forced to log in. A token on its own never reveals notes or account data. |
| FR‑JOIN‑3 | MUST | Outside the window, the page explains what's happening instead of failing: "This session starts in 2 h 14 min" with an add-to-calendar button, or "This session has ended. Notes will appear in My Workshops". |
| FR‑JOIN‑4 | SHOULD | A fallback is always shown: "Trouble joining? Dial-in number / WhatsApp us", with the host's contact. |

### 6.9 After each session (FR‑POST)

| ID | Pri | Requirement |
|---|---|---|
| FR‑POST‑1 | MUST | Admin uploads notes or materials for each session (PDF, audio, images; up to 50 MB per file) in an admin screen in the `/write` area. |
| FR‑POST‑2 | MUST | Admin clicks **Publish recap** for a session, with an optional short message. This sends the **recap email** to every active registration: a thank-you, key takeaways (the admin's message), any homework, the date of the next session, and a **"Download your notes"** button that deep-links to `/{lang}/my/workshops/:regId#session-{n}`. **Files are never attached and never linked publicly.** |
| FR‑POST‑3 | SHOULD | Safety net: if no recap has been published 24 h after a session ends, the admin gets a reminder email. No automatic participant email is sent. |
| FR‑POST‑4 | MUST | Downloads go through `GET /api/material?id=` (auth plus ownership check), which streams the file or redirects to a signed URL that expires in 5 min or less. |
| FR‑POST‑5 | COULD | Session recording (when the teachers consent) is published the same way, available for N days. |

### 6.10 Completion (FR‑DONE)

| ID | Pri | Requirement |
|---|---|---|
| FR‑DONE‑1 | MUST | When the last session's recap is published, or admin clicks **Complete workshop**, each eligible participant (D7) gets the **completion email**: congratulations, the **certificate** (PDF attachment plus a link in the user area), **help docs and next steps** links (practice guides, FAQ, upcoming workshops), and a **review request** (deep link to the existing review flow with the category pre-selected). |
| FR‑DONE‑2 | MUST | The certificate is a PDF generated server-side (e.g. `pdf-lib`) from a bilingual template. It contains the participant's name (as entered, editable once before issue, see ALT‑12), the workshop title, dates, total hours, teacher signature(s), an issue date, a **certificate ID** and a **verification URL or QR code**. |
| FR‑DONE‑3 | SHOULD | `/verify/:certId` is a public page that shows **only** "Valid: {first name + last initial}, {workshop}, {date}" or "Not found". No email or other personal data. |
| FR‑DONE‑4 | MUST | The certificate can be re-downloaded from My Workshops at any time. It is generated once and stored, so it is the same file every time. |

### 6.11 User area: "My Workshops" (FR‑ME) at `/my/workshops`

| ID | Pri | Requirement |
|---|---|---|
| FR‑ME‑1 | MUST | List of the user's registrations with status labels: *Upcoming*, *In progress*, *Completed*, *Cancelled/Refunded*. |
| FR‑ME‑2 | MUST | Registration detail: the session timeline (past, next, future), a Join button (FR‑PRE‑5), notes per session, calendar download or subscription, invoice link, certificate (when issued), the cancellation policy, and a "Request cancellation" button (FR‑ALT‑8). |
| FR‑ME‑3 | MUST | Profile settings: display name, language, timezone, email preferences (transactional emails can't be turned off; marketing emails are opt-in). |
| FR‑ME‑4 | MUST | GDPR self-service: "Download my data" (JSON) and "Delete my account". Deletion anonymises registrations and keeps invoices, because the law requires keeping invoices (10 years in DE). |

### 6.12 Admin (FR‑ADM), minimum viable

| ID | Pri | Requirement |
|---|---|---|
| FR‑ADM‑1 | MUST | Create and edit a workshop: EN and DE content, slug, price, capacity, sessions (date, time, duration, topic), meeting URLs per session, booking cutoff, status `draft → published → completed / cancelled`. The existing `api/translate-post.ts` (DeepL) can pre-fill DE from EN. |
| FR‑ADM‑2 | MUST | Participant list per workshop: name, email, status, paid amount, join clicks per session, and CSV export. |
| FR‑ADM‑3 | MUST | Actions: upload materials, publish recap, complete workshop, exclude someone from the certificate, refund (calls the Stripe refund API, and the webhook updates state), reschedule session (FR‑ALT‑9), cancel workshop (FR‑ALT‑10). |
| FR‑ADM‑4 | MUST | Every admin action writes an `auditLog` entry: who, what, when, before and after. |

---

## 7. Alternative and error scenarios

Each scenario lists the expected behaviour. Each one becomes at least one test case.

### 7.1 Discovery and booking

| ID | Scenario | Expected behaviour |
|---|---|---|
| ALT‑1 | Sold out while the user is reading the page | The CTA updates live through a Firestore listener. If they click anyway, `/api/checkout` returns `SOLD_OUT` and the UI offers the waitlist. |
| ALT‑2 | Two users race for the last seat | The Firestore transaction on `seatsSold + seatsHeld < capacity` admits exactly one. The other sees `SOLD_OUT`. |
| ALT‑3 | Booking after session 1 has started, or very close to the start | Bookings close at `bookingCutoff` (default: 1 h before session 1). After that the CTA reads "Booking closed – contact us". Between the cutoff and the start, the confirmation includes the Join link straight away. |
| ALT‑4 | User already registered and clicks Book again (another tab or device) | The server returns `ALREADY_REGISTERED`. The UI shows "You're already booked" and links to My Workshops. No second charge. |
| ALT‑5 | User wants to book for someone else (gift or colleague) | MVP: not supported in the flow. The FAQ says "each participant books with their own account". v2: "Book for someone else" with an invite email that claims the seat. |
| ALT‑6 | Price changed between page view and checkout | The server always charges the current price. If the price differs from the one the client displayed (sent as `expectedPriceCents`), the server returns `PRICE_CHANGED`, the UI shows the new price, and the user has to confirm again. |

### 7.2 Payment

| ID | Scenario | Expected behaviour |
|---|---|---|
| ERR‑P1 | Card declined, 3‑D Secure failed, or user cancels on Stripe | Stripe handles the retry on its own page. If the user cancels, they return to the workshop page with a neutral banner ("No payment was taken. Your place is held for a few more minutes"). The hold expires on its own. |
| ERR‑P2 | Payment succeeds but the user closes the tab before redirect | The webhook still completes the order. The confirmation email is the user's receipt. |
| ERR‑P3 | Webhook delayed or failed | Stripe retries for up to 3 days. The success page shows the processing state (FR‑PAY‑7). A cron job every 10 min checks `pending` orders older than 15 min against the Stripe API, so missed webhooks are recovered automatically. |
| ERR‑P4 | Webhook delivered twice, or out of order | The handler is idempotent. It keys on `event.id` (stored in `stripeEvents/{id}`) and on the order's status transitions (a `paid` order is never moved back to `pending`). |
| ERR‑P5 | Payment succeeds **after** the hold expired and the seat was sold to someone else (very rare) | Overbook by 1 and alert the admin (who decides whether to accept or refund). Never silently drop a paid customer. |
| ERR‑P6 | Async method (SEPA) fails days later | `async_payment_failed`: the registration becomes `payment_failed`, the seat is released, and the user gets a "Payment didn't go through" email with a retry link. |
| ERR‑P7 | Chargeback or dispute | The registration is flagged `disputed` and the admin is alerted. Access stays until the dispute is resolved. |
| ERR‑P8 | `/api/checkout` errors (Stripe down, Firestore down) | The user sees "Payment is temporarily unavailable. Please try again in a minute" and nothing is charged. The error is logged and the admin alerted when it happens more than 3 times in 10 min. |

### 7.3 Auth and account

| ID | Scenario | Expected behaviour |
|---|---|---|
| ERR‑A1 | Email already in use during signup | Switch to the Sign in tab with the email pre-filled. Offer an email link or password reset. |
| ERR‑A2 | Forgot password mid-checkout | The reset flow returns to the same workshop and resumes the booking (via a `continueUrl`). |
| ERR‑A3 | User signs in with Google using a different email than an earlier email/password account | Firebase account linking. Ask the user to link the two accounts rather than creating a duplicate. |
| ERR‑A4 | Typo in the user's email address, so confirmation emails bounce | A bounce webhook from the ESP flags the registration. The admin sees ⚠ in the participant list. The user area always works, and the success page tells the user to "check your email: {address}" with a "Wrong address?" link. |

### 7.4 Before, during and after sessions

| ID | Scenario | Expected behaviour |
|---|---|---|
| ALT‑7 | User can't find the email on the day | Three independent ways in: the calendar event (which has the join link), My Workshops on the site, and the T‑1h email. The home page shows a banner to signed-in users with a session today: "Your session starts at 10:00 → Join". |
| ALT‑8 | User wants to cancel | The "Request cancellation" button applies the policy automatically. Example policy: full refund ≥ 7 days before session 1, 50% at 2–7 days, none under 48 h, transfer to a future workshop always allowed. The automatic part is the refund or transfer; edge cases go to the admin. **The policy itself is a business decision, see Q3.** |
| ALT‑9 | Admin reschedules a session | The session doc is updated and its `SEQUENCE` incremented. Subscribed calendars update on their own (FR‑CONF‑4). Every participant gets a "Session moved" email with a new `.ics` (same `UID`, higher `SEQUENCE`, so it **replaces** the old event instead of duplicating it). Reminder jobs are recalculated. Anyone who can't make the new time gets a one-click refund or transfer. |
| ALT‑10 | Admin cancels the whole workshop | Automatic full refunds, a cancellation email (with the calendar events cancelled via `STATUS:CANCELLED`), an offer to transfer to the next date, and the workshop marked `cancelled`. |
| ALT‑11 | Meeting link changes at the last minute (Zoom outage, host switches to Meet) | Admin updates the URL in one place. Because of D5, every link already sent stays valid. Admin can send a one-off "Link updated – same button" notice. |
| ALT‑12 | Name on the certificate is wrong | Before issue: the user can edit "Name on certificate" in My Workshops (FR‑ME‑2). After issue: one free reissue on request. The old certificate ID is revoked. |
| ALT‑13 | Participant misses a session | The recap email and notes still arrive. In v2 with attendance-based certificates, the email says how many sessions remain for eligibility. |
| ALT‑14 | User in another timezone or a DST change between sessions | All times are stored in UTC and rendered per user. Emails show both the user's time and Berlin time. Test case: a workshop spanning the last Sunday of October. |
| ERR‑S1 | Cron job didn't run (Vercel incident) | Jobs are **catch-up safe**. Each run sends every reminder whose `sendAt ≤ now` and that isn't marked sent, unless it is more than 30 min past the session start (skip stale reminders). A per-message `sentAt` gives exactly-once delivery. |
| ERR‑S2 | ESP rejects or rate-limits email | Retry with backoff (3 attempts). After that, `emailLog.status = failed` and the admin dashboard shows a count. |

---

## 8. Data model (Firestore)

All collections are **server-write only** unless stated otherwise, and default-deny remains in place.

```text
workshops/{workshopId}
  slug, status: draft|published|completed|cancelled, format: online
  price: { amountCents, currency: "EUR", taxBehavior }, capacity, seatsSold, seatsHeld
  bookingCutoff: Timestamp, startsAt, endsAt (denormalised from sessions)
  EN: { title, tagline, outcomes[], audience, notFor, requirements[], faq[], body }
  DE: { … same … }
  teachers: ["richa"|"riju"], category, coverImage, policyVersion
  createdAt, updatedAt
  ── rules: get/list if status in [published, completed] || isAdmin()

workshops/{workshopId}/sessions/{sessionId}
  index, startsAt (UTC), durationMin, EN:{topic}, DE:{topic}, sequence (int, for .ics)
  recapPublishedAt?, recapMessage?{EN,DE}
  ── public fields only; meeting URLs live in workshopsPrivate

workshopsPrivate/{workshopId}/sessions/{sessionId}
  meetingUrl, meetingProvider, meetingId, dialIn?
  ── rules: read,write: false (server only)

orders/{orderId}
  uid, workshopId, status: pending|paid|expired|failed|refunded|partially_refunded|disputed
  amountCents, currency, stripeSessionId, stripePaymentIntentId, invoiceUrl
  termsAcceptedAt, policyVersion, lang, createdAt, expiresAt
  ── rules: get if request.auth.uid == resource.data.uid

registrations/{regId}            // one per (uid, workshopId); id = `${workshopId}_${uid}` enforces uniqueness
  uid, workshopId, orderId, status: active|cancelled|refunded|payment_failed|disputed
  certificateName, certificateEligible (bool, admin override), certificateId?
  lang, timezone, emailBounced?
  joins: { [sessionId]: firstClickAt }
  ── rules: get/list where uid == request.auth.uid; client may update ONLY certificateName while no certificate exists

materials/{materialId}
  workshopId, sessionId, storagePath, fileName, mimeType, sizeBytes, EN/DE title, publishedAt
  ── rules: read false (served via /api/material)

certificates/{certId}            // certId is random, unguessable (≥ 128 bits)
  regId, uid, workshopId, displayName, issuedAt, storagePath, revokedAt?
  ── rules: read false (public verify page goes through API, returns minimal fields)

scheduledEmails/{id}             // materialised reminder queue
  regId, sessionId?, type: confirm|t24h|t1h|recap|complete|reschedule|cancel
  sendAt, sentAt?, attempts, lastError?
emailLog/{id}, stripeEvents/{eventId}, auditLog/{id}, waitlist/{workshopId}/entries/{uid}

users/{uid}  (CHANGE) add optional: lang, timezone, marketingOptIn{at,source}
  ── isValidUser must change from keys().size()==3 to hasOnly([...]) with optional fields,
     and allow update of lang/timezone/displayName only.
```

**Indexes:** `registrations (uid, status)`, `scheduledEmails (sentAt == null, sendAt asc)`,
`orders (status, createdAt)`, `workshops (status, startsAt)`.

---

## 9. API surface (`api/`)

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/checkout` | ID token | Validate, hold the seat, create the Stripe session (FR‑PAY‑1…4) |
| `POST /api/stripe-webhook` | Stripe signature | Order and registration state machine (FR‑PAY‑6). **Must read the raw body** (`export const config = { api: { bodyParser: false } }`) |
| `GET /api/join` | ID token **or** signed join token | Gated redirect (FR‑JOIN) |
| `GET /api/workshop-ics` | ID token | `.ics` for one registration |
| `GET /api/calendar/[token].ics` | HMAC token | Subscription feed (FR‑CONF‑4) |
| `GET /api/material` | ID token + ownership | Material download (FR‑POST‑4) |
| `GET /api/certificate` | ID token + ownership | Certificate PDF |
| `GET /api/verify-certificate` | public, rate-limited | Minimal verification (FR‑DONE‑3) |
| `POST /api/registration-cancel` | ID token | Policy-driven cancel or refund (ALT‑8) |
| `POST /api/admin/workshop-*` | Admin ID token | Recap, complete, reschedule, cancel, refund, upload (FR‑ADM) |
| `GET /api/cron/dispatch-emails` | `CRON_SECRET` header | Every 5 min: send due `scheduledEmails` |
| `GET /api/cron/reconcile-orders` | `CRON_SECRET` header | Every 10 min: expire holds, recover missed webhooks |
| `GET /api/workshop-share` | public | OG tags for `/workshops/:slug` (same pattern as blog-share) |

Shared helpers belong in `api/_lib/` (`stripe.ts`, `email.ts` with templates, `ics.ts`, `tokens.ts` reusing the
`hmac()` domain-separation pattern, and `requireUser()` modelled on `requireBlogAdmin()`).
Vercel Cron is configured in `vercel.json` under `"crons"`. Check the plan's cron frequency limits.

---

## 10. Non-functional requirements

### 10.1 Security (SEC)

| ID | Requirement |
|---|---|
| SEC‑PAY‑1 | No card data touches our servers or bundle (hosted Stripe Checkout, PCI SAQ‑A). |
| SEC‑PAY‑2 | The **server decides the price** (from Firestore). The client never sends an amount that gets charged. |
| SEC‑PAY‑3 | Verify the webhook signature with `STRIPE_WEBHOOK_SECRET` against the raw body. Reject anything older than 5 min. Keep separate test and live secrets per Vercel environment. |
| SEC‑AUTH‑1 | Every user endpoint verifies the Firebase ID token server-side (`verifyIdToken`) and checks **ownership** (`registration.uid == token.uid`). Never trust IDs that come from the client. |
| SEC‑AUTH‑2 | Admin endpoints use the existing email allowlist. Long term, move to a Firebase custom claim `admin: true` so the list isn't kept in sync by hand in three places (see the comment in `blogAuth.ts`). |
| SEC‑TOK‑1 | Email tokens: HMAC-SHA256 with a purpose prefix (`join:`, `ics:`, `unsub:`), an expiry, and constant-time comparison (`safeEqual`). A join token grants **only** the join redirect for one session. |
| SEC‑DATA‑1 | Meeting URLs, materials and certificates are never readable through client Firestore rules. They are served only via the API after an ownership check. |
| SEC‑DATA‑2 | Private file storage. Signed URLs expire in 5 min or less. `Content-Disposition: attachment`. Uploads are checked for MIME type and size. |
| SEC‑RATE‑1 | Rate limits: `checkout` 10/min/uid, `verify-certificate` 30/min/IP, auth endpoints follow Firebase defaults plus App Check (SHOULD). |
| SEC‑INJ‑1 | Every user-supplied string in emails, PDFs and `.ics` files is escaped (`escapeHtml`, `.ics` text escaping for `,` `;` `\` and newlines). Certificate names are limited to 80 characters and a Unicode letters/space/hyphen/apostrophe whitelist. |
| SEC‑OPEN‑1 | The join redirect only goes to URLs on an allowlist of meeting hosts (`zoom.us`, `meet.google.com`, …), so it can't be used as an open redirect. |
| SEC‑GDPR‑1 | Privacy policy updated (Stripe, ESP and meeting provider as processors, with DPAs signed). Transactional and marketing emails are separated, and marketing needs double opt-in. Data export and deletion (FR‑ME‑4). Order and invoice data are kept 10 years, `emailLog` 12 months. |
| SEC‑SEC‑1 | Secrets live only in Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ESP_API_KEY`, `CRON_SECRET`, `JOIN_TOKEN_SECRET`, plus any meeting-provider OAuth keys. Add them to `.env.example` with comments. |

### 10.2 Performance (NFR‑PERF)

| ID | Requirement |
|---|---|
| NFR‑PERF‑1 | Workshop detail page: LCP < 2.5 s on 4G mobile (p75, Vercel Speed Insights). Cover image goes through the existing Vercel image optimisation (`vercel.json` `images`). |
| NFR‑PERF‑2 | **No increase in the home-page JS bundle** beyond 5 KB gzip. Workshop, checkout, user-area and admin routes are lazy-loaded (`React.lazy`). No Stripe.js is needed, since we redirect to hosted Checkout. |
| NFR‑PERF‑3 | `/api/checkout` p95 < 1.5 s. Webhook handler p95 < 2 s (Stripe times out at 10 s), with email sending **queued** rather than done inside the webhook. |
| NFR‑PERF‑4 | The workshop list reads at most 1 query (denormalised `startsAt`, `seats*` on the workshop doc). No N+1 reads of sessions on list pages. |
| NFR‑PERF‑5 | Cron batches send at most 50 emails per run, so they stay within function timeouts. They are resumable thanks to `sentAt`. |

### 10.3 UX, accessibility and i18n (NFR‑UX)

| ID | Requirement |
|---|---|
| NFR‑UX‑1 | Booking takes at most **3 screens** for a new user: Workshop → Sign up (dialog) → Stripe → Success. 2 screens for a returning signed-in user. |
| NFR‑UX‑2 | WCAG 2.2 AA: keyboard-operable dialog, focus management on return from Stripe, 4.5:1 contrast, no meaning carried by colour alone (seat badges also have text). |
| NFR‑UX‑3 | Every error message says **what happened, what it means for the user (charged or not), and what to do next**, in EN and DE. Error codes come from the API and are translated on the client (existing `HttpError` code pattern). |
| NFR‑UX‑4 | Emails are mobile-first, a single column, with one primary button per email. Every email has a plain-text part and works with images blocked. The subject line states the action: e.g. "Starts in 1 hour: Surya Namaskar – Join here". |
| NFR‑UX‑5 | Dates are formatted per locale (`Intl.DateTimeFormat`). The timezone is always written out (e.g. "10:00 CEST"). |

### 10.4 Reliability and observability

- Structured logs for every state transition (`orderId`, `regId`, `event`).
- An admin "health" panel: pending orders older than 15 min, failed emails, bounced addresses, and unpublished recaps older than 24 h.
- Stripe test-mode end-to-end run on every preview deployment before promoting to production (manual checklist for the MVP).

---

## 11. Email catalogue

| Code | Trigger | Timing | Primary CTA | Attachments |
|---|---|---|---|---|
| `confirm` | order paid | ≤ 1 min | Go to My Workshops | `.ics` (+ invoice link) |
| `t24h` | per session | start − 24 h | Join (gated) | none |
| `t1h` | per session | start − 1 h | Join (gated) | none |
| `recap` | admin publishes recap | on demand | Download notes (user area) | none |
| `complete` | last recap or admin completes | on demand | View certificate | certificate PDF |
| `reschedule` | admin moves session | immediate | Updated calendar | `.ics` (same UID, higher SEQUENCE) |
| `cancelled` | workshop cancelled or user refund | immediate | See refund details | `.ics` with `STATUS:CANCELLED` |
| `payment_failed` | async failure | immediate | Retry payment | none |
| `admin_booking` | order paid | immediate | (admin) participant list | none |

Every email uses one shared layout (logo, language-specific footer with the business address as German
law requires, and the contact address). Templates are typed functions in `api/_lib/email/`, with a snapshot test per language.

---

## 12. Delivery plan (vertical slices)

Each slice can ship on its own and is usable without the next one.

**Slice 1: Sell it (about 1.5 weeks).**
Data model, admin creates a workshop (can start as a seeded script and JSON), workshop list and detail pages,
inline auth, `/api/checkout`, webhook, success page, confirmation email with `.ics`, My Workshops (read-only),
the ESP set up with DNS records.
*Exit criteria: a real €1 test workshop is bought end to end in production by a non-admin account.*

**Slice 2: Run it (about 1 week).**
Gated join, reminder cron (t24h, t1h), materials upload and download, publish-recap email,
reschedule and cancel flows, the reconcile cron.

**Slice 3: Finish it (about 1 week).**
Certificate generation, verification page, completion email, user cancellation and refund policy,
GDPR export and delete, admin participant list and CSV, health panel.

**Later (v2):** cart, guest checkout, gifting, attendance-based certificates via the Zoom API,
waitlist auto-offer, recordings, coupons beyond Stripe codes, in-person format.

---

## 13. Acceptance criteria (Given/When/Then, examples to grow into tests)

```gherkin
Scenario: New visitor books a workshop
  Given a published workshop "surya-namaskar-online" with 10 seats and 0 sold
  And I am not signed in
  When I click "Book your place" and sign up with a new email
  Then I am redirected to Stripe Checkout with my email pre-filled and the price from Firestore
  When I pay with test card 4242 4242 4242 4242
  Then the success page shows "You're booked" within 10 seconds
  And exactly one registration exists for (my uid, workshop) with status "active"
  And seatsSold is 1 and seatsHeld is 0
  And I receive a confirmation email in my language with an .ics containing one VEVENT per session

Scenario: Webhook is delivered twice
  Given a paid checkout.session.completed event E
  When E is delivered a second time
  Then no second registration, seat increment or email is created

Scenario: Join link before the window opens
  Given my session starts in 2 hours
  When I open the Join link from my email
  Then I see a countdown and an "Add to calendar" button
  And I am not redirected to the meeting

Scenario: Join link used by someone else after the session ended
  Given a valid join token for session S, which ended 2 hours ago
  When anyone opens it
  Then they see "This session has ended" and no meeting URL is revealed

Scenario: Notes are private
  Given materials M for workshop W
  When a signed-in user without an active registration for W requests /api/material?id=M
  Then the response is 403 and no storage URL is revealed

Scenario: Reschedule updates calendars without duplicates
  Given I imported the .ics for session 2
  When the admin moves session 2 by one day
  Then I receive a "Session moved" email whose .ics has the same UID and a higher SEQUENCE
```

---

## 14. Agent brief (paste per slice)

> **Role:** You are implementing Slice N of `docs/prd/online-workshops.md` in this repository.
> **Read first:** this PRD §3, §8, §9, §10.1; `firestore.rules`; `api/_lib/engagement.ts`; `api/_lib/blogAuth.ts`;
> `src/lib/auth.tsx`; `api/blog-share.ts`.
> **Do:** follow the existing patterns (server-only writes via `api/` with the admin SDK, HMAC tokens with
> purpose prefixes, `escapeHtml` in emails, EN and DE strings in `TRANSLATIONS`, lazy-loaded routes).
> Reference requirement IDs in commit messages. Add Firestore rules **and** indexes for every new collection.
> Add env vars to `.env.example` with comments.
> **Don't:** trust any amount, ID or status from the client. Email raw meeting URLs. Make materials or
> certificates publicly readable. Send email inside the webhook request. Add Stripe.js to the bundle.
> Change the existing `COURSES` (VHS) behaviour.
> **Done when:** `npm run lint` and `npm run lint:api` pass, every acceptance criterion for the slice is
> demonstrated in a preview deployment with Stripe test mode, and new behaviour comes with notes on
> what was tested and how.
> **If unsure:** stop and ask. Ambiguities are listed in §15 and must not be resolved by guessing.

---

## 15. Open questions (need a decision before the related slice starts)

| # | Question | Blocks |
|---|---|---|
| Q1 | VAT status: is Niramay a **Kleinunternehmer (§19 UStG)** or VAT-registered? This decides the price display ("incl. VAT" or the §19 note) and the invoice content. Ask the Steuerberater. | Slice 1 |
| Q2 | **Withdrawal right (Widerrufsrecht)** for date-specific *online* live workshops. The §312g(2) Nr. 9 BGB exemption for leisure events on a fixed date may not apply to online delivery. Either show a proper withdrawal notice and get the customer's request to start early, or get legal confirmation of the exemption. Legal review needed. | Slice 1 |
| Q3 | Cancellation and refund policy: tiers and transfer rules (ALT‑8). | Slice 3 (Slice 1 needs at least the policy text) |
| Q4 | Meeting provider: Zoom (paid plan needed for registration and attendance) or Google Meet (D4)? | Slice 2 |
| Q5 | Cart in MVP: yes or no (D2)? | Slice 1 |
| Q6 | ESP choice and who manages DNS for `niramay.me` (SPF, DKIM, DMARC) (D6)? | Slice 1 |
| Q7 | Certificate: are hours stated? Is it "Certificate of Completion" or "Participation"? Any accreditation body (e.g. Yoga Alliance CEUs)? Need signature images. | Slice 3 |
| Q8 | Capacity and pricing per workshop. Any early-bird pricing? (Stripe promo codes cover simple cases.) | Slice 1 |
| Q9 | Should sessions be recorded? This needs consent text for participants. | v2 |

---

## 16. Decision log

| Date | Decision | By | Notes |
|---|---|---|---|
| 2026-10-01 | PRD drafted with recommendations D1–D8 | Claude (draft) | Awaiting review |

---

## Appendix A: Prompt and context engineering notes for this PRD

How this document is set up so humans and AI agents can both work from it reliably:

1. **Stable IDs** for every requirement and scenario, so prompts, commits and tests can point to exact items instead of paraphrasing them.
2. **Repository context is stated explicitly (§3)**, so an agent doesn't make up a stack or patterns. Real file paths ground it in the code.
3. **Constraints are written as do and don't lists (§14).** Negative instructions cover the most expensive mistakes (trusting client amounts, leaking links).
4. **MUST, SHOULD and COULD** priorities let an agent cut scope safely when a slice runs long.
5. **Decisions are separated from requirements (§4, §16)** so recommendations aren't mistaken for settled facts. Open questions are listed explicitly (§15) to stop agents from resolving ambiguity on their own.
6. **Examples come before abstractions:** Given/When/Then scenarios (§13) and concrete copy ("Only N left") show what "done" means.
7. **Vertical slices with exit criteria (§12)** keep each agent task small enough to fit in one context window and to verify end to end.
8. **Single source of truth:** when something changes, update this file and the Decision log. Don't change scope only in a chat thread.
