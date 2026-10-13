<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Niramay Wellbeing · niramay.me

## Brand and naming

| Name | Use |
| --- | --- |
| **Niramay Wellbeing** (English) / **Niramay Wohlbefinden** (German) | The name of the organisation behind the initiative. Used in the header and footer lockup, page titles, copyright line and structured data. The German pages show the German form. |
| **niramay.me** | The website address and the handle on all social media channels (Instagram, Facebook, YouTube). |
| **Niramay** | Short form in running text only (e.g. "the Niramay team", consent checkboxes). |

**What the name means.** *Niramay* (Sanskrit निरामय, *nirāmaya*) means "free from ailment": free from illness, negativity and toxins, in body, mind and spirit. The purpose of the initiative is that every person can become *niramay*, which is why the website and social media handles are **niramay.me**. **Niramay Wellbeing** (*Niramay Wohlbefinden*) is the name under which Richa and Riju Kansal pursue this purpose, and the foundation of their shared commitment to help heal the world they live in.

**Legal status.** "Niramay Wellbeing" / "Niramay Wohlbefinden" is a business name (*Geschäftsbezeichnung*), not a registered company. Unless stated otherwise, the provider of the services on the site is Richa Kansal as a freelancer. The source of truth for these facts is `src/legal/config.ts`, and the Impressum explains the name ("Hinweis zur Bezeichnung"). If a legal entity is ever registered (e.g. an e.V.), update `legalForm`/`owners` there and have the legal texts reviewed. Note: in German, do not describe the organisation as a *Stiftung*, which is a specific legal form.

**Logo.** `public/logo.svg` is a clean vector on a transparent background (green ring `#3DBE0E`, navy figure `#0B3A6B`). `favicon-16x16.png`, `favicon-32x32.png` and `apple-touch-icon.png` (white background, as iOS requires) are rendered from it. Regenerate them whenever the SVG changes.

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/594cf9c4-79be-46f5-b470-815b908e1d16

## Run It Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
