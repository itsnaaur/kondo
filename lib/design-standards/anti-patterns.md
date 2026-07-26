# AI-generic habits to actively avoid

Left unconstrained, generative design defaults to the statistically safest, most common
pattern — which is exactly what makes AI-generated sites look like AI-generated sites. These
are specific, recognizable habits to break. For each: don't do the default thing reflexively;
only do it when the client's actual content genuinely calls for it, and say why.

## Spacing & layout habits

- **Don't apply one wide max-width container with large left/right margins to every section by
  default.** That "safe" wide-gutter look is the single most common AI tell. Vary container
  width by content: a dense data table or long-form content block can run wider than a sparse
  hero; a focused CTA band can be narrower than the page. Decide container width per section,
  not once for the whole page.
- **Don't center everything by default.** Center-aligned headline + center-aligned paragraph +
  center-aligned button, repeated on every section, is a generic pattern. Left-align body copy
  and mixed-width sections more often than not — reserve full centering for a small hero moment,
  not the whole page.
- **Don't give every section identical vertical padding.** Copy-pasting the same `py-24`
  (or equivalent) on every section regardless of content weight is a tell. A short CTA band and
  a dense feature section shouldn't get the same breathing room.
- **Don't reuse the same 3-column card grid for every list.** Features, testimonials, team
  members, and pricing tiers all defaulting to an identical "grid of equal cards" layout is a
  strong AI signal. Vary the structure — a staggered list, an alternating left/right sequence, a
  single featured item plus a compact list, etc. — based on how many items there actually are
  and how they differ from each other.

## Copy & content habits

- **Don't add an eyebrow label (a small uppercase word/phrase above every heading, e.g.
  "WELCOME TO" or "OUR SERVICES") reflexively.** This has become a default AI decoration. Only
  include one when it does real work — e.g. it names a distinct section a returning visitor
  would scan for, or clarifies an otherwise-ambiguous heading. If the heading is already clear on
  its own, skip the eyebrow.
- **Don't write a subheading that just restates the headline in different words.** ("We help
  businesses grow." / "Our mission is to help your business grow.") If the subheading doesn't add
  a new, concrete piece of information, cut it or replace it with something specific (what, for
  whom, how).
- **Don't insert a "Trusted by" logo strip or fake social-proof band unless the audit or brief
  actually surfaced real client/partner names or testimonials to put there.** An empty or
  placeholder logo strip is a stronger negative signal than no logo strip at all.
- **Don't invent stats bars** ("500+ Happy Clients", "10 Years of Experience", "99% Satisfaction")
  **that aren't grounded in something the audit or brief actually stated.** If real numbers exist
  in the source content, use them; otherwise don't manufacture a stats section for its own sake.
- **Don't default every CTA to "Get Started" / "Learn More" / "Book a Call."** Write the button
  label for the actual action being requested on this specific site (e.g. "Request a quote,"
  "See pricing," "Start your free trial" — whatever the business actually wants next).
- **Don't turn every list of benefits into a checkmark bullet list.** It's the fastest way to
  make a features section look templated. Prose, a numbered sequence, or a short paired
  heading+description per item often communicates better and looks less generic.

## Visual habits

- **Don't default to a purple-to-blue (or any) gradient background as a "modern" signal.** It's
  one of the most overused AI-design tells. Use a gradient only when the archetype and brand
  color genuinely call for it, and prefer solid color + contrast + spacing to create visual
  interest instead.
- **Don't wrap every icon in a colored circle and place one next to every list item uniformly.**
  If icons don't add real clarity (helping someone scan faster), leave them out rather than
  adding them as decoration.
- **Don't apply the exact same border-radius and drop-shadow to every card, button, image, and
  input as a blanket "polish" pass.** Uniform rounding/shadow everywhere reads as a default
  theme, not a considered design. Vary treatment or use it more sparingly and deliberately, per
  the archetype's layout pattern (see layout-patterns.md).
- **Don't add wavy/blob SVG dividers between every section.** This was a distinctive trend for a
  while and is now itself a cliché. Prefer a clean edge, a color-block transition, or nothing.
- **Don't sprinkle emoji into headings or body copy as a substitute for tone.** If the brand
  voice genuinely is casual/playful, that should come through in the actual word choice, not an
  emoji glued onto otherwise generic copy.

## Structural habits

- **Don't default to the generic SaaS skeleton (hero → 3-feature-grid → testimonials →
  CTA-band → footer) regardless of what kind of business this is.** A local service business, a
  restaurant, a portfolio, and a B2B SaaS product should not all produce the same page shape.
  Build the page structure from what the audit's content inventory and the brief actually
  contain, not from a template.
- **Before finalizing a page, do a pass and ask: which of the above did I include reflexively
  rather than because this specific client's content justified it?** Cut anything that only
  exists because it's the common pattern, not because the content needs it.
