export type TechnicalAudit = {
  platform: string;
  pageBuilders: string[];
  formsDetected: boolean;
  pagesCrawled: number;
  crawlTruncated: boolean;
};

export type VisualDesignAudit = {
  colorPalette: Array<{ value: string; count: number }>;
  backgroundPalette: Array<{ value: string; count: number }>;
  typography: Array<{ value: string; count: number }>;
};

export type MotionInteractionAudit = {
  animationLibraries: string[];
  scrollRevealDetected: boolean;
};

export type ContentInventoryEntry = { url: string; title: string };

export type BrandToneAudit = {
  personality: string[];
  voice: string;
  emotionalImpression: string;
  summary: string;
};

export type RecommendationItem = { title: string; rationale: string };
