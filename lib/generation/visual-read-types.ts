// Call 0A output — a targeted interrogation of a screenshot's composition, not a
// description. Same shape for both modes; EXISTING_SITE and REFERENCE_SITE each add a
// handful of mode-specific fields on top of the shared core.

export type WorkingPaletteColor = { hex: string; role: string };

export type Failure = { issue: string; kind: "function" | "taste"; cost: "high" | "medium" | "low" };

export type EquityAsset = { asset: string; why_keep: string };

export type VisualRead = {
  mode: "EXISTING_SITE" | "REFERENCE_SITE";
  url: string;
  first_impression: { word: string; elaboration: string };
  mechanism: string[];
  hierarchy: { order: string[]; appropriate: boolean; note: string };
  type_read: { families: string[]; has_real_scale: boolean; character: string };
  spacing: { systematic: boolean; density: "airy" | "balanced" | "dense"; rhythm_note: string };
  colour: {
    working_palette: WorkingPaletteColor[];
    accent: string;
    accent_discipline: "restrained" | "moderate" | "scattered";
  };
  mobile: { survives: boolean; issues: string[] };

  // EXISTING_SITE mode only
  era?: { reads_as: string; dating_signals: string[] };
  identity?: { deliberate: boolean; default_family: string };
  failures?: Failure[];
  equity?: EquityAsset[];

  // REFERENCE_SITE mode only
  why_it_works?: string;
  boldness_location?: string;
  transferable?: string[];
  not_transferable?: string[];
  copy_test?: string;
};

const REQUIRED_KEYS: (keyof VisualRead)[] = [
  "mode",
  "url",
  "first_impression",
  "mechanism",
  "hierarchy",
  "type_read",
  "spacing",
  "colour",
  "mobile",
];

export type VisualReadValidation = { valid: true } | { valid: false; reason: string };

export function validateVisualReadShape(value: unknown): VisualReadValidation {
  if (!value || typeof value !== "object") {
    return { valid: false, reason: `expected an object, got ${value === null ? "null" : typeof value}` };
  }
  const obj = value as Record<string, unknown>;

  const missing = REQUIRED_KEYS.filter((key) => !(key in obj));
  if (missing.length > 0) {
    return { valid: false, reason: `missing top-level keys: ${missing.join(", ")}` };
  }

  if (!Array.isArray(obj.mechanism) || obj.mechanism.length < 2) {
    return { valid: false, reason: "mechanism is not an array with at least 2 items" };
  }

  const colour = obj.colour as Record<string, unknown> | undefined;
  if (!Array.isArray(colour?.working_palette)) {
    return { valid: false, reason: "colour.working_palette is not an array" };
  }

  return { valid: true };
}

export function isValidVisualReadShape(value: unknown): value is VisualRead {
  return validateVisualReadShape(value).valid;
}
