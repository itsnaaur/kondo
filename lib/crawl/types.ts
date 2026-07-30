export type PageExtraction = {
  url: string;
  title: string;
  text: string;
  links: string[];
  images: string[];
  logoCandidate: string | null;
  favicon: string | null;
  ogImage: string | null;
};
