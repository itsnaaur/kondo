// Starting points for translating client adjectives into mechanisms — a lookup to
// consult and adapt per subject, not a table to copy from verbatim. Review alongside
// anti-defaults.ts: if the model produces the same mechanism for an adjective across
// unrelated industries, the translation below is too prescriptive and should be loosened.

export type AdjectiveTranslation = {
  word: string;
  means: string;
  mechanism: string;
  not: string;
};

export const ADJECTIVE_TRANSLATIONS: AdjectiveTranslation[] = [
  {
    word: "modern",
    means:
      "Almost always negative — the current site embarrasses them. Identify the specific dating signals in the existing site read and treat removing those as the actual instruction.",
    mechanism: "Current type choices, generous spacing, restraint, considered proportion.",
    not: "Gradients, glassmorphism, dark mode, or whatever is fashionable this quarter.",
  },
  {
    word: "clean",
    means: "Reduce competing elements. Usually a complaint about visual noise, not a request for white.",
    mechanism: "Fewer elements per view, stronger hierarchy, consistent spacing scale, restrained palette.",
    not: "White background with everything centred.",
  },
  {
    word: "professional",
    means: "Precision and consistency. Often a fear of looking amateur or homemade.",
    mechanism:
      "Alignment discipline, a real type scale, restrained palette, no novelty typefaces, consistent component treatment.",
    not: "Navy blue and stock photos of handshakes.",
  },
  {
    word: "premium",
    means: "Restraint and confidence. Density is the enemy — cheap looks crowded.",
    mechanism:
      "Generous space, slower pacing, fewer elements each doing more work, high-quality imagery, minimal accent usage.",
    not: "Black and gold, or serif fonts alone.",
  },
  {
    word: "trustworthy",
    means: "Predictability and legibility. Trust comes from nothing feeling hidden.",
    mechanism:
      "Consistent patterns, clear labelling, visible contact and credential information, comfortable body type, honest imagery.",
    not: "Blue.",
  },
  {
    word: "friendly",
    means: "Human warmth. Usually a reaction to feeling corporate or cold.",
    mechanism: "Warm palette temperature, softer forms, real photography of real people, conversational copy, generous line-height.",
    not: "Rounded corners and an illustration of a person with no face.",
  },
  {
    word: "bold",
    means: "Presence and confidence, not aggression.",
    mechanism: "Scale contrast, decisive type, committed use of one strong element.",
    not: "Saturated colour everywhere or all-caps headlines.",
  },
  {
    word: "minimal",
    means: "Few elements, each carrying more weight. A discipline, not an absence.",
    mechanism:
      "Ruthless reduction, precise spacing, one accent, strong typographic hierarchy doing the work layout would otherwise do.",
    not: "Empty white space with small centred text.",
  },
  {
    word: "playful",
    means: "Unexpectedness. Something that surprises without undermining credibility.",
    mechanism: "Unusual proportion, one unexpected motion moment, wit in the copy, an unconventional but controlled palette.",
    not: "Primary colours and bouncing animations.",
  },
  {
    word: "luxury",
    means: "Same core as premium, with more emphasis on slowness and materiality.",
    mechanism: "Very generous space, restrained motion, considered imagery, near-absent accent colour, refined type detailing.",
    not: "Gold gradients.",
  },
];

export function formatAdjectiveTranslations(): string {
  return ADJECTIVE_TRANSLATIONS.map(
    (t) => `${t.word}:\n  means: ${t.means}\n  mechanism: ${t.mechanism}\n  not: ${t.not}`
  ).join("\n\n");
}
