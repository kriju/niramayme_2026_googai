# Review checklist

Go through every section for every draft and every translation. Nothing here is legal advice. It makes the review consistent, and Riju (and a lawyer, where needed) decides.

## 1. Off-limits (checked at the brief and again on the draft)

Niramay doesn't publish:
- **Discriminating content** based on religion, caste, ethnicity, nationality, gender, sexual orientation, age, disability, body shape or size, or health status. That includes stereotypes and "jokes".
- **Content that goes against Patanjali's Yoga Sutras**, the eight limbs (*ashtanga*, YS 2.29). Use the *yamas* (YS 2.30) and *niyamas* (YS 2.32) as a practical test:
  - *Ahimsa* (non-harm, YS 2.35): nothing that encourages harm to self or others. That covers dangerous practices, extreme fasting, pushing through pain, and shaming.
  - *Satya* (truthfulness, YS 2.36): no exaggeration, no invented facts, no misleading health claims. This overlaps with §2.
  - *Asteya* (non-stealing, YS 2.37): no copied text or images, and credit every idea and quote.
  - *Brahmacharya* (moderation): no sensationalism and no excess.
  - *Aparigraha* (non-grasping, YS 2.39): no pressure selling, fear-of-missing-out or manipulation.
  - *Niyamas* (*saucha*, *santosha*, *tapas*, *svadhyaya*, *ishvara pranidhana*): the post should leave the reader clearer, more content and more self-reliant, not dependent or anxious.
- **Disparaging** other traditions, faiths, teachers or medical professionals.

If a topic or passage is unclear, raise it with Riju rather than deciding alone.

## 2. Health and advertising law (Germany)

The site's word list (`api/_lib/claimsCheck.ts`, which the check script runs) is deliberately strict. Beyond it:
- **HWG §3, misleading health advertising:** no claim that a practice has effects it hasn't been shown to have, and no implying success is certain. Phrase effects as experience or as evidence with its strength ("many students find…", "studies suggest… although they are small").
- **HWG §11 / §12, advertising to the public:** no healing testimonials or before/after stories, and nothing that reads as treating serious illnesses. You can discuss an illness, but never as something yoga, Reiki and the like treat or cure.
- **UWG §5, misleading commercial practices:** offers, prices, qualifications and credentials must be accurate.
- **Advertising labels:** shop or affiliate links need "Anzeige" / an affiliate note next to them. The check script flags them.
- **Disclaimer:** posts in health categories show the standard disclaimer (`disclaimer: true`). The check script flags it if it's missing.
- **Professional boundaries:** no diagnosing, no advice to stop or change medication, no telling readers to skip a doctor.

## 3. Accuracy

- Every health or factual claim maps to a source in the claims table. Remove or mark anything without one.
- Sutra numbers, quotes, names, dates and Sanskrit terms are checked against a source, not memory.
- Statistics name their source and are not rounded up to sound stronger.
- Safety: say which groups need adapted practice or a doctor's advice (pregnancy, high blood pressure, heart conditions, glaucoma, recent surgery, trauma history, and so on), as relevant.

## 4. Images and copyright

- A cover image needs a source or licence in `imageCredit` ("Own photo", "Unsplash, Jane Doe", "AI-generated (tool name)"). Never use an image found through search without a clear licence.
- AI-generated images are labelled as AI-generated in `imageCredit`.
- Quotes are short, attributed, and serve the post (German quotation right, UrhG §51). Modern translations of classical texts are copyrighted.

## 5. Privacy

- Client stories need the client's consent, or must be anonymised beyond recognition. Health details are special-category data under GDPR Art. 9.
- No names, photos or identifying details of third parties without consent.

## 6. Transparency and responsibility

- The byline is a real person who has read and stands behind the post.
- AI assistance: under the EU AI Act (Art. 50, applying from 2 August 2026), AI-generated text published to inform the public may need a label, unless a person reviewed it and holds editorial responsibility. Riju's review and the approval in /write provide that. Remind Riju of it at hand-off, and let Riju decide whether to mention AI assistance in the post. Confirm the details with a lawyer.

## 7. /write's own approval checklist

The reviewer ticks these in /write (`REVIEW_CHECKLIST` in `api/_lib/claimsCheck.ts`). Make sure each can honestly be ticked:
- Claims are worded as experience, not promises.
- The health disclaimer is shown where needed.
- Image rights are confirmed.
- Client personal data is removed, or the client consented.
- The German text was read by a person (or the post is English only).
