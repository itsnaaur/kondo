import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

// One-time infra setup (not code): create a public-read Supabase Storage bucket named
// below in the Supabase dashboard. SUPABASE_SECRET_KEY (already in .env/.env.example)
// must also be set in the worker's own deploy environment (Railway/Fly/a VM), not just
// Vercel's — the worker is a separate process and does not inherit Vercel's env vars.
const BUCKET = "kondo-assets";

// Every storage-js call (upload/list/remove) goes through fetch under the hood with no
// timeout of its own — confirmed the worker's main loop (scripts/worker.ts) is strictly
// single-job-at-a-time, so one hung request here (a bad day for Supabase, a stalled
// socket) freezes analysis for every client indefinitely, not just the one in flight, and
// nothing auto-recovers short of a human noticing and restarting the process. Longer than
// downloadImage's FETCH_TIMEOUT_MS (lib/crawl/download-images.ts) since an upload's body
// can be considerably larger than a single image fetch.
const STORAGE_FETCH_TIMEOUT_MS = 30_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORAGE_FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

// A plain service-role client, not the cookie-based SSR client from lib/supabase/* — this
// runs from both a Vercel server action (AssetDropzone's upload) and the standalone worker
// process (the crawler), neither of which has a request-scoped user session to bind to.
function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set to upload assets to Supabase Storage"
    );
  }
  return createClient(url, key, { auth: { persistSession: false }, global: { fetch: fetchWithTimeout } });
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "-").slice(-120);
}

export type UploadedAsset = { url: string; path: string };

// The one shared upload path for crawled assets (lib/crawl/download-images.ts) and the
// manual logo/hero-image fix on the Review Extraction screen (AssetDropzone) — see the
// Kondo rebuild plan's Architecture decisions. Two upload call sites writing to two
// different places (one Supabase, one local disk) is exactly how the "images 404 for
// prospects" bug would reappear, so both must go through this function.
export async function uploadAssetToStorage(
  clientId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadedAsset> {
  const path = `clients/${clientId}/${randomUUID()}-${sanitizeFilename(filename)}`;
  const supabase = storageClient();

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed for ${filename}: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Assets are append-only everywhere except here — the only place that should ever remove
// a client's Storage objects is permanently deleting the client (trash purge), since
// already-published Concept HTML has asset URLs baked in permanently and a re-analysis
// must never risk breaking a link already sent to a prospect. See lib/actions/trash.ts.
export async function deleteClientAssetsFromStorage(clientId: string): Promise<void> {
  const supabase = storageClient();
  const prefix = `clients/${clientId}`;

  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(prefix);
  if (listError) {
    throw new Error(`Failed to list Storage objects for client ${clientId}: ${listError.message}`);
  }
  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${prefix}/${f.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    throw new Error(`Failed to delete Storage objects for client ${clientId}: ${error.message}`);
  }
}
