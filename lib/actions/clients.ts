"use server";

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientDir, clientAssetsDir } from "@/lib/storage";
import { AssetType } from "@/app/generated/prisma/client";

const ASSET_FIELDS: Array<{ field: string; type: (typeof AssetType)[keyof typeof AssetType] }> = [
  { field: "logoFiles", type: AssetType.LOGO },
  { field: "brandGuideFiles", type: AssetType.BRAND_GUIDE },
  { field: "caseStudyFiles", type: AssetType.CASE_STUDY },
  { field: "otherFiles", type: AssetType.OTHER },
];

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const siteUrl = String(formData.get("siteUrl") ?? "").trim();
  const briefText = String(formData.get("briefText") ?? "").trim();

  if (!name || !siteUrl) {
    throw new Error("Client name and site URL are required");
  }

  const client = await prisma.client.create({
    data: { name, siteUrl, briefText: briefText || null },
  });

  await mkdir(clientDir(client.id), { recursive: true });

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

  redirect(`/clients/${client.id}`);
}
