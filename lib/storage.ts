import path from "path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "clients");

export function clientDir(clientId: string): string {
  return path.join(STORAGE_ROOT, clientId);
}

export function clientAssetsDir(clientId: string, assetType: string): string {
  return path.join(clientDir(clientId), "assets", assetType);
}

export function clientCrawlDir(clientId: string): string {
  return path.join(clientDir(clientId), "crawl");
}

export function clientReferenceScreenshotsDir(clientId: string): string {
  return path.join(clientDir(clientId), "crawl", "reference-screenshots");
}

export function clientVisualShotsDir(clientId: string): string {
  return path.join(clientDir(clientId), "crawl", "visual-shots");
}

export function clientSourceDir(clientId: string): string {
  return path.join(clientDir(clientId), "source");
}

export function clientGeneratedDir(clientId: string): string {
  return path.join(clientDir(clientId), "generated");
}

export function clientExportDir(clientId: string): string {
  return path.join(clientDir(clientId), "export");
}
