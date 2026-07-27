"use server";

import path from "path";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ClientStatus, AssetType, ProjectIntent } from "@/app/generated/prisma/client";
import { clientGeneratedDir, clientReferenceScreenshotsDir } from "@/lib/storage";
import { buildGenerationPromptText, type GeneratedFile } from "@/lib/generation/prompt";
import { buildWordPressThemePromptText } from "@/lib/generation/wp-theme-prompt";
import {
  generateSite,
  type LogoImage,
  type ReferenceImage,
  type ContentImage,
} from "@/lib/generation/generate";
import { screenshotReferenceSites } from "@/lib/crawl/reference-screenshot";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  TechnicalAudit,
  VisualDesignAudit,
  MotionInteractionAudit,
  BrandToneAudit,
  ContentInventoryEntry,
} from "@/lib/audit-types";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function startGeneration(clientId: string, formData: FormData) {
  const userPrompt = String(formData.get("prompt") ?? "").trim();

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      auditReport: true,
      // Only a generation that actually finished (has files written) counts —
      // a stub row left behind by a prior failed attempt should not count as "has a version to fall back to".
      generations: { where: { outputDir: { not: null } }, select: { id: true }, take: 1 },
    },
  });

  if (!client.auditReport) {
    throw new Error("Run the audit before generating");
  }

  const fallbackStatus =
    client.generations.length > 0 ? ClientStatus.READY_FOR_REVIEW : ClientStatus.AUDIT_READY;

  await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.GENERATING } });

  runGenerationInBackground(clientId, client.auditReport.id, userPrompt || null, fallbackStatus);

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

async function runGenerationInBackground(
  clientId: string,
  auditReportId: string,
  userPrompt: string | null,
  fallbackStatus: (typeof ClientStatus)[keyof typeof ClientStatus]
) {
  try {
    const [client, audit, assets, references, priorGeneration] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      prisma.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }),
      prisma.asset.findMany({ where: { clientId } }),
      prisma.reference.findMany({ where: { clientId } }),
      prisma.generation.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
    ]);

    let priorFiles: GeneratedFile[] | null = null;
    if (priorGeneration?.outputDir) {
      priorFiles = await readGeneratedFiles(path.join(process.cwd(), priorGeneration.outputDir));
    }

    const logoAssets = assets.filter(
      (a) => a.type === AssetType.LOGO && IMAGE_MIME_TYPES.has(a.mimeType)
    );
    const logoImages: LogoImage[] = await Promise.all(
      logoAssets.map(async (a) => ({
        mediaType: a.mimeType as LogoImage["mediaType"],
        data: (await readFile(path.join(process.cwd(), a.storagePath))).toString("base64"),
      }))
    );

    const contentImageAssets = assets.filter(
      (a) => a.type === AssetType.IMAGE && IMAGE_MIME_TYPES.has(a.mimeType)
    );
    const contentImages: ContentImage[] = await Promise.all(
      contentImageAssets.map(async (a) => ({
        filename: a.filename,
        mediaType: a.mimeType as ContentImage["mediaType"],
        data: (await readFile(path.join(process.cwd(), a.storagePath))).toString("base64"),
      }))
    );

    // Reference sites are just a URL + note to the model otherwise — it can't actually
    // see what the site looks like without a screenshot attached.
    let referenceImages: ReferenceImage[] = [];
    try {
      const referenceScreenshots = await screenshotReferenceSites(
        references.map((r) => r.url),
        clientReferenceScreenshotsDir(clientId)
      );
      referenceImages = (
        await Promise.all(
          references.map(async (ref): Promise<ReferenceImage | null> => {
            const shot = referenceScreenshots.find((s) => s.url === ref.url);
            if (!shot?.screenshotPath) return null;
            const data = (await readFile(shot.screenshotPath)).toString("base64");
            return { url: ref.url, note: ref.note, mediaType: "image/png", data };
          })
        )
      ).filter((img): img is ReferenceImage => img !== null);
    } catch (err) {
      console.error(`[generation] failed to screenshot reference sites for ${clientId}, continuing:`, err);
    }

    const promptInput = {
      clientName: client.name,
      briefText: client.briefText,
      references: references.map((r) => ({ url: r.url, note: r.note })),
      technical: audit.technical as TechnicalAudit | null,
      visualDesign: audit.visualDesign as VisualDesignAudit | null,
      motionInteraction: audit.motionInteraction as MotionInteractionAudit | null,
      brandTone: audit.brandTone as BrandToneAudit | null,
      contentInventory: audit.contentInventory as ContentInventoryEntry[] | null,
      reviewNotes: audit.reviewNotes,
      assetList: assets.map((a) => ({ filename: a.filename, type: a.type })),
      priorFiles,
      userPrompt,
    };

    const isWordPressTransfer = client.intent === ProjectIntent.WORDPRESS_TRANSFER;
    const promptText = isWordPressTransfer
      ? buildWordPressThemePromptText(promptInput)
      : buildGenerationPromptText(promptInput);

    const result = await generateSite(promptText, logoImages, referenceImages, contentImages);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const generation = await prisma.generation.create({
      data: { clientId, auditReportId, status: "COMPLETE", generatedByUserId: user?.id },
    });

    const outputDirAbs = path.join(clientGeneratedDir(clientId), generation.id);
    await mkdir(outputDirAbs, { recursive: true });

    // Copy logo + content image assets into the output so the generated HTML can reference them.
    const assetsToCopy = [...logoAssets, ...contentImageAssets];
    if (assetsToCopy.length > 0) {
      const assetsSubdir = path.join(outputDirAbs, "assets");
      await mkdir(assetsSubdir, { recursive: true });
      for (const a of assetsToCopy) {
        const src = path.join(process.cwd(), a.storagePath);
        await writeFile(path.join(assetsSubdir, a.filename), await readFile(src));
      }
    }

    for (const file of result.files) {
      const filePath = path.join(outputDirAbs, file.path);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, "utf-8");
    }

    const outputDirRel = path.relative(process.cwd(), outputDirAbs);
    await prisma.generation.update({
      where: { id: generation.id },
      data: { outputDir: outputDirRel },
    });

    await prisma.generationMessage.createMany({
      data: [
        {
          clientId,
          role: "user",
          content:
            userPrompt ||
            (priorFiles
              ? "Refine the current design."
              : isWordPressTransfer
                ? "Generate the initial WordPress theme."
                : "Generate the initial facelift."),
          generationId: generation.id,
        },
        { clientId, role: "assistant", content: result.summary, generationId: generation.id },
      ],
    });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: ClientStatus.READY_FOR_REVIEW },
    });
  } catch (err) {
    console.error(`[generation] failed for client ${clientId}:`, err);
    await prisma.client.update({ where: { id: clientId }, data: { status: fallbackStatus } });
  }
}

async function readGeneratedFiles(dirAbs: string): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const rel = path.relative(dirAbs, full).replace(/\\/g, "/");
        const content = await readFile(full, "utf-8").catch(() => null);
        if (content !== null) files.push({ path: rel, content });
      }
    }
  }

  await walk(dirAbs);
  return files;
}
