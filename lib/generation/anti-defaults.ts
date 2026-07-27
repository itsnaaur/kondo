// Current AI-design clichés — reviewed periodically against what Kondo's own pipeline
// over-produces. This is the highest-leverage text in the whole design-direction system:
// naming *specific* looks works, "don't be generic" does not. Update this list as new
// patterns show up across generations; it only stays useful if it reflects current output.

export const ANTI_DEFAULTS: string[] = [
  "Cream or off-white background (near #F4F1EA) with a high-contrast serif display and a terracotta or warm-clay accent (near #D97757)",
  "Near-black background with a single acid-green, electric-violet or vermilion accent",
  "Gradient mesh or blurred colour blobs behind a centred hero with a pill-shaped CTA",
  "Broadsheet pastiche: hairline rules, zero border-radius, dense newspaper columns",
  "Three feature cards in a row, each with a line icon at the top",
  "01 / 02 / 03 numbered section markers where the content is not a sequence",
  "Glassmorphism: translucent cards with backdrop-blur over a colourful background",
  "Scroll-triggered fade-and-rise applied uniformly to every section",
  "Inter, Poppins, Montserrat, Roboto, or Arial as the display face",
  "A large statistic with a small label as the hero's primary element",
  "Purple-to-blue or blue-to-cyan gradient on headings or buttons",
  "Full-width dark section with centred white text as the only rhythm change",
  // Added 2026-07-27 after 4 of 5 test specs for warm/family/handcrafted-feeling
  // businesses independently chose Fraunces as the display face, including two runs
  // on an *identical* input with no other change — without temperature as a variance
  // knob, this typeface is this model's default answer to that specific mood. Revisit
  // this monthly against real output; drop it if it stops recurring.
  "Fraunces as the display face for a warm, family-friendly, or handcrafted-feeling brand",
];

export function formatAntiDefaults(): string {
  return ANTI_DEFAULTS.map((item) => `- ${item}`).join("\n");
}
