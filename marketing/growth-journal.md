# Niramay growth journal
## Goal
Grow qualified traffic and bookings for online offerings from clients worldwide (English-speaking, India). Main metric: Search Console impressions and clicks from outside Germany, plus visits to online-offer pages. Secondary: course bookings and newsletter sign-ups.
## Baselines (recorded 2026-11-01)
- Search Console, 3–30 Oct 2026 (28 days): 210 impressions, 12 clicks, CTR 5.7%, average position 5.2. Germany 178 impressions / 10 clicks; rest of world 32 impressions / 2 clicks (US 15, India 8, Canada 3).
- Top queries: niramay (36 impressions, position 2.5), meditation (30, 4.5), yoga ostfildern (15, 8.2), reiki (5, 7.0).
- Vercel, 4–31 Oct 2026 (28 days): about 355 visitors. DE 229, US 53, IN 32, GB 6, SG 4, AE 3, IE 3 → about 35% non-DE. Referrers: mostly direct; Facebook ~24, Google ~13, Instagram 7.
## Experiments
| ID | Started | Change | Metric | Baseline | Evaluate | Status |
|---|---|---|---|---|---|---|
| E1 | 2026-10-30 | Online positioning (PR kriju/niramayme_2026_googai#72): online services titled "online" / "online & Ostfildern"; areaServed Worldwide; homepage title "& Online"; Course + online Event structured data on course pages | Non-DE impressions; impressions of online-offer pages | 32 non-DE impressions / 28 days | 2026-11-30, 2026-12-28 | running |
## Backlog
- Old-site URLs still get impressions (niramay.me/sessions/ 10, /impressum/ 6, /our-services/ 3). They redirect in 3 hops to the homepage. Map each to its matching page with a single 301 in vercel.json.
- Course pages are tied to one run (e.g. /courses/yoga-adventure). Consider evergreen pages per recurring online programme. Needs Riju's decision on which programmes recur.
- Google Business Profile, reviews and directory listings are Riju's to do; remind Riju monthly.
- Social scheduling via Metricool once Instagram/Facebook are connected there.
- Minor: /api/admin threw RangeError "Invalid time value" once (2026-11-02, courseChecklist/startOf in api/_lib/courseModel.ts). Likely a course with a bad date; check on Monday review.
- Tooling note: system python's cryptography is broken; use a venv (`python3 -m venv v && v/bin/pip install cryptography`) for the GSC helper.
## Run log
- 2026-11-01: Journal created from seed.
- 2026-11-03 (Tue, daily): All normal. Vercel 11-02: 6 visitors (5 non-DE; IN 4, PK 1) vs 7 (3 non-DE) on 10-26. GSC latest day 10-31: 0 clicks, 3 impressions (prior-week same day n/a; 7-day avg ~8/day, low, n too small). Home, /services/reiki, /courses/yoga-adventure all 200. One /api/admin RangeError, no spike. E1 too early.
