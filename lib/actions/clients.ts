"use server";

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clientDir, clientAssetsDir } from "@/lib/storage";
import { AssetType, ProjectIntent } from "@/app/generated/prisma/client";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

const ASSET_FIELDS: Array<{ field: string; type: (typeof AssetType)[keyof typeof AssetType] }> = [
  { field: "logoFiles", type: AssetType.LOGO },
  { field: "brandGuideFiles", type: AssetType.BRAND_GUIDE },
  { field: "caseStudyFiles", type: AssetType.CASE_STUDY },
  { field: "otherFiles", type: AssetType.OTHER },
  { field: "projectArchiveFiles", type: AssetType.PROJECT_ARCHIVE },
];

const VALID_INTENTS = new Set(Object.values(ProjectIntent));

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const siteUrl = String(formData.get("siteUrl") ?? "").trim();
  const briefText = String(formData.get("briefText") ?? "").trim();
  const intentInput = String(formData.get("intent") ?? "");

  if (!name || !siteUrl) {
    throw new Error("Client name and site URL are required");
  }
  if (!VALID_INTENTS.has(intentInput as (typeof ProjectIntent)[keyof typeof ProjectIntent])) {
    throw new Error("Invalid project intent");
  }
  const intent = intentInput as (typeof ProjectIntent)[keyof typeof ProjectIntent];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const client = await prisma.client.create({
    data: { name, siteUrl, intent, briefText: briefText || null, createdByUserId: user?.id },
  });

  await mkdir(clientDir(client.id), { recursive: true });

  const referenceUrls = formData.getAll("referenceUrl").map((v) => String(v).trim());
  const referenceNotes = formData.getAll("referenceNote").map((v) => String(v).trim());
  const references = referenceUrls
    .map((url, i) => ({ url, note: referenceNotes[i] || null }))
    .filter((r) => r.url.length > 0);

  if (references.length > 0) {
    await prisma.reference.createMany({
      data: references.map((r) => ({ clientId: client.id, url: r.url, note: r.note })),
    });
  }

  for (const { field, type } of ASSET_FIELDS) {
    const files = formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) continue;

    const typeDir = clientAssetsDir(client.id, type);
    await mkdir(typeDir, { recursive: true });

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storedName = `${randomUUID()}-${safeName}`;
      const storagePath = path.join(typeDir, storedName);
      await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));

      await prisma.asset.create({
        data: {
          clientId: client.id,
          type,
          filename: file.name,
          storagePath: path.relative(process.cwd(), storagePath),
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        },
      });
    }
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}`);
}
