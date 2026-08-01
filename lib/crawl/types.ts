export type PageImage = {
  src: string;
  // alt text plus the nearest ancestor container's text — the only per-image context
  // available without reconstructing full DOM position from a flat innerText blob. Used
  // by lib/content/classify-partner-logos.ts's Signal B (surrounding-text match, e.g. "we
  // accept" / "health fund" / "certified") — a flat page-wide text blob can't be
  // correlated back to a specific image, so this has to be captured at extraction time.
  nearbyText: string;
};

export type PageExtraction = {
  url: string;
  title: string;
  text: string;
  links: string[];
  images: PageImage[];
  logoCandidate: string | null;
  favicon: string | null;
  ogImage: string | null;
};
