export type StyleSample = {
  color: string | null;
  backgroundColor: string | null;
  fontFamily: string | null;
  fontSize: string | null;
  fontWeight: string | null;
} | null;

export type PageExtraction = {
  url: string;
  title: string;
  text: string;
  links: string[];
  images: string[];
  logoCandidate: string | null;
  favicon: string | null;
  ogImage: string | null;
  samples: Array<{ selector: string; style: StyleSample }>;
  generatorMeta: string | null;
  scriptSrcs: string[];
  linkHrefs: string[];
  hasDataAOS: boolean;
  hasForm: boolean;
  screenshotPath: string;
};
