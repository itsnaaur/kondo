// Mirrors the Call 1 (design-direction) JSON output. This is the artifact a human reviews
// and approves before the expensive build call (Call 2) runs against it.

export type PaletteColor = {
  name: string;
  hex: string;
  role: "background" | "surface" | "ink" | "ink-muted" | "accent" | "accent-alt" | "border";
};

export type FontSpec = {
  family: string;
  fallback: string;
  source: "google" | "system" | "self-hosted";
  weights: number[];
};

export type TypeScaleStep = {
  token: string;
  size_rem: number;
  weight: number;
  line_height: number;
  letter_spacing: string;
};

export type MotionMoment = {
  trigger: string;
  behaviour: string;
  duration_ms: number;
  easing: string;
};

export type StructuralDevice = {
  device: string;
  encodes: string;
};

export type Revision = {
  changed: string;
  from: string;
  to: string;
  why: string;
};

export type DesignSpec = {
  subject: {
    business: string;
    audience: string;
    page_job: string;
  };
  palette: {
    colors: PaletteColor[];
    accent_policy: string;
    rationale: string;
  };
  type: {
    display: FontSpec;
    body: FontSpec;
    utility?: FontSpec;
    scale: TypeScaleStep[];
    pairing_rationale: string;
  };
  layout: {
    concept: string;
    hero_wireframe: string;
    section_wireframe: string;
    grid: string;
    spacing_scale: string[];
    radius: string;
    density: "airy" | "balanced" | "dense";
  };
  signature: {
    element: string;
    description: string;
    why_this_subject: string;
  };
  motion: {
    policy: string;
    moments: MotionMoment[];
    deliberately_absent: string[];
  };
  structural_devices?: StructuralDevice[];
  revisions: Revision[];
};

export const DESIGN_SPEC_REQUIRED_KEYS: (keyof DesignSpec)[] = [
  "subject",
  "palette",
  "type",
  "layout",
  "signature",
  "motion",
  "revisions",
];

export type DesignSpecValidation = { valid: true } | { valid: false; reason: string };

// Returns *why* validation failed, not just whether it did — an empty-string reason
// ("Claude did not return a valid design spec") told us nothing about whether this is a
// rare hiccup or a real, frequently-firing failure mode being papered over by the retry.
export function validateDesignSpecShape(value: unknown): DesignSpecValidation {
  if (!value || typeof value !== "object") {
    return { valid: false, reason: `expected an object, got ${value === null ? "null" : typeof value}` };
  }
  const obj = value as Record<string, unknown>;

  const missing = DESIGN_SPEC_REQUIRED_KEYS.filter((key) => !(key in obj));
  if (missing.length > 0) {
    return { valid: false, reason: `missing top-level keys: ${missing.join(", ")}` };
  }

  const palette = obj.palette as Record<string, unknown> | undefined;
  if (!Array.isArray(palette?.colors) || palette.colors.length === 0) {
    return { valid: false, reason: "palette.colors is not a non-empty array" };
  }

  const type = obj.type as Record<string, unknown> | undefined;
  const display = type?.display as Record<string, unknown> | undefined;
  const body = type?.body as Record<string, unknown> | undefined;
  if (typeof display?.family !== "string" || typeof body?.family !== "string") {
    return { valid: false, reason: "type.display.family or type.body.family is not a string" };
  }

  if (!Array.isArray(obj.revisions)) {
    return { valid: false, reason: "revisions is not an array" };
  }

  return { valid: true };
}

export function isValidDesignSpecShape(value: unknown): value is DesignSpec {
  return validateDesignSpecShape(value).valid;
}
