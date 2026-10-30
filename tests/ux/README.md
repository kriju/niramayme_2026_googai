# Persona UX suite

AI personas use a deployment of niramay.me the way real visitors would and report back like a usability-testing team. Each persona has its own age, location, language, device, network, accessibility needs and goal. Each run also includes automated checks for accessibility (axe, WCAG 2.2 AA), load performance (TTFB, LCP, CLS on the persona's device and network), pages wider than the screen, console errors and failed requests.

The output is an HTML report (`ux-report/index.html`) with:
- top issues across all personas
- for each persona: a debrief, star ratings, a quote, findings ranked by severity, and a step-by-step timeline with screenshots and think-aloud notes.

## Running it

```bash
# All personas against a preview deployment
ANTHROPIC_API_KEY=... npm run test:ux -- --url https://<preview>.vercel.app

# A subset, fewer steps
npm run test:ux -- --url https://<preview>.vercel.app --personas ingrid-ostfildern,robert-esslingen --max-steps 10

# No API key or --checks-only: visits key pages on each persona's device/network, runs the automated checks only
npm run test:ux -- --url https://<preview>.vercel.app --checks-only
```

Locally, first install the browsers with `npx playwright install chromium webkit`. iPhone and iPad personas run in WebKit (Safari's engine) and the others in Chromium. Pass `--chromium-only` (or set `UX_CHROMIUM_ONLY=1`) if WebKit isn't installed. Network and CPU throttling work in Chromium only.

| Option / env var | Default | |
|---|---|---|
| `--url` / `UX_BASE_URL` | — | Deployment to test. Production (`niramay.me`) is refused unless you pass `--allow-production`. |
| `--personas` / `UX_PERSONAS` | all | Comma-separated persona ids. |
| `--max-steps` / `UX_MAX_STEPS` | 18 | Actions per persona before the "moderator" ends the session. |
| `--concurrency` / `UX_CONCURRENCY` | 2 | Personas run in parallel (max 4). |
| `--checks-only` | off | Skip the AI personas. |
| `UX_MODEL` | `claude-opus-5-5` | Claude model that plays the personas. |
| `UX_EFFORT` | `medium` | `low` … `max`. Higher effort means more careful personas and higher cost. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | — | Needed when preview deployments are protected (see below). |

## In CI

`.github/workflows/ux-personas.yml` runs automatically after every successful Vercel **preview** deployment, and can be started by hand from the Actions tab (*Persona UX test → Run workflow*) with any URL. The job summary shows a table for each persona. The full report with screenshots is the `ux-report` artifact, kept for 14 days.

Set these in GitHub under *Settings → Secrets and variables → Actions*:
- **Secret `ANTHROPIC_API_KEY`**: without it, the job runs checks only.
- **Secret `VERCEL_AUTOMATION_BYPASS_SECRET`**: Vercel → project → *Settings → Deployment Protection → Protection Bypass for Automation*. The suite sends it only to the site itself, never to third parties.
- Optional **variables**:
  - `UX_PERSONAS`: limits automatic runs to some personas.
  - `UX_CHECKS_ONLY=1`: automatic runs skip the AI personas; manual runs can still include them.
  - `UX_MODEL`, `UX_EFFORT`, `UX_MAX_STEPS`.

**Cost.** Each persona sends one Claude request per action, each with a screenshot. Prompt caching keeps resent history cheap. At the defaults, expect very roughly $0.50–$1.50 per persona, so a few dollars per full run. The report shows the exact estimate. If previews deploy often, set `UX_PERSONAS` to 2–3 personas or `UX_CHECKS_ONLY=1`, and run the full set by hand before releases.

## What the suite never does

- **Touch real data.** Every non-GET `/api` call except `/api/course-quote` (a read-only price calculation) gets a fake success reply. Firestore writes, Firebase sign-ups and Stripe checkout are blocked. Personas are told to enter placeholder details only (`test+<id>@example.com`). The report lists every intercepted submission.
- **Count as a visitor.** Google Analytics, Vercel Web Analytics and Speed Insights requests are blocked, and every user agent ends in `NiramayUXTest/1.0` so any logs can filter it out.
- **Leave the site.** Off-site links are blocked and recorded. The persona is told where the link would have gone.
- **Test production by default, or generate traffic.** Run it on previews. It is a quality tool, not a traffic or SEO tool: bot visits don't improve search rankings, and inflating analytics would hide the real visitors.

Page text from the site, including visitor comments, reaches the model only as material to judge. The model can only act through the click, type and scroll tools on this site.

## Personas

Each persona is a JSON file in `tests/personas/`. To add one, copy a file and edit it.

| Field | |
|---|---|
| `id` | File-safe id (`a-z0-9-`). |
| `name`, `age`, `location`, `background` | Who they are. Write the background the way a recruiter would brief a test participant: habits, worries, patience. |
| `goal` | What they're trying to do this session, in their words. |
| `startPath` | Where they land, e.g. `/de` or `/de/services/reiki`. |
| `language` | `EN` or `DE`: which version of the site they read. |
| `locale`, `timezone`, `geolocation` | Browser settings for their location (e.g. `de-CH`, `Europe/Zurich`). |
| `device` | A [Playwright device name](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json), e.g. `Pixel 5`, `iPhone 13`, `Desktop Chrome`. |
| `network` | `slow-3g`, `fast-3g`, `4g` or `wifi`. Slower networks also slow the CPU. |
| `techComfort` | `low`, `medium` or `high`. |
| optional | `colorScheme: "dark"`, `reducedMotion: "reduce"`, `keyboardOnly: true` (the persona can only use Tab/Enter/arrow keys, which tests focus order and visible focus), `accessibilityNeeds`. |

Current cast:

| Persona | Device | Goal |
|---|---|---|
| Ingrid, 68, Ostfildern | Pixel 5 | Find a gentle beginner yoga class for bad knees (German only) |
| Priya, 34, Pune | Galaxy S9+, fast 3G | Understand astrology/tarot readings and the price in INR |
| James, 41, London | Desktop | Judge a blog post's credibility, maybe subscribe |
| Lena, 27, Berlin | iPhone 13, dark mode | Compare Reiki packages; check cancellation and privacy terms |
| Marco, 52, Zurich | iPad landscape | See whether the sleep or subconscious-healing offers suit him |
| Aisha, 23, Toronto | Moto G4, slow 3G, reduced motion | Find an affordable online course and discounts |
| Robert, 71, Esslingen | Desktop, keyboard only | Use the FAQ, check class language, contact the teacher |
| Sofia, 38, Vienna | Galaxy S9+ | Find workshops and the book; switch languages and compare |

AI personas find problems quickly and cheaply, but they don't replace people. Once the issues they find are fixed, a handful of sessions with real visitors from the target audience is the best next step.
