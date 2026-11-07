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
- 2026-11-04 (Wed, daily): All normal. Vercel 11-03: 12 visitors (3 non-DE: IN, US, IE) vs 4 (1 non-DE) on 10-27. GSC latest day 11-01: 0 clicks, 5 impressions (10-25..11-01 range 3–15/day; n too small). Home, /services/reiki, /courses/yoga-adventure 200. Runtime errors: only recurring url.parse deprecation warning (harmless). E1 too early.
- 2026-11-05 (Thu, daily): All normal. Vercel 11-04: 9 visitors (3 non-DE: IN 3) vs 8 (3 non-DE) on 10-28. GSC latest day 11-02: 1 click, 13 impressions (vs 11-01: 5; 10-27..11-02 range 3–15/day; n too small). Home, /services/reiki, /courses/yoga-adventure 200. Runtime errors: only url.parse deprecation warning. E1 too early.
- 2026-11-06 (Fri, daily): All normal. Vercel 11-05: 8 visitors (2 non-DE: IN 1, US 1) vs 4 (1 non-DE) on 10-29. GSC latest day 11-03: 0 clicks, 5 impressions (vs 15 on 10-27; n too small). Home, /services/reiki, /courses/yoga-adventure 200. Runtime errors: only url.parse deprecation warning. E1 too early.
- 2026-11-07 (Sat, daily): All normal. Vercel 11-06: 4 visitors (1 non-DE: BE) vs prior-week same day not fetched; week 10-31..11-06 non-DE visitors ~14 of ~44 daily-sum. GSC latest day 11-04: 0 clicks, 3 impressions (vs 5 on 10-30; n too small). Home, /services/reiki, /de, /courses/yoga-adventure 200. Runtime errors: only url.parse deprecation warning. E1 too early.
