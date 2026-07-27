"use server";

import path from "path";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ClientStatus, AssetType, ProjectIntent, Prisma } from "@/app/generated/prisma/client";
import { clientGeneratedDir, clientVisualShotsDir } from "@/lib/storage";
import { buildGenerationPromptText, type GeneratedFile } from "@/lib/generation/prompt";
import { buildWordPressThemePromptText } from "@/lib/generation/wp-theme-prompt";
import { generateSite, type LogoImage, type ContentImage } from "@/lib/generation/generate";
import { proposeDesignSpec, type DesignDirectionInput, type ImageAttachment } from "@/lib/generation/design-direction";
import { isValidDesignSpecShape, type DesignSpec } from "@/lib/generation/design-spec-types";
import { captureSiteVisualShots } from "@/lib/crawl/visual-shots";
import { analyzeVisualRead } from "@/lib/generation/visual-read";
import { synthesizeInterpretedBrief, type BriefSynthesisInput } from "@/lib/generation/brief-synthesis";
import {
  isValidInterpretedBriefBundle,
  isValidInterpretedBriefShape,
  type InterpretedBriefBundle,
} from "@/lib/generation/interpreted-brief-types";
import type { VisualRead } from "@/lib/generation/visual-read-types";
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

  if (client.designSpecApprovedAt) {
    // A direction has already been approved — reuse it rather than re-deciding it. This is
    // what keeps a refinement looking like the same site instead of a new company each time.
    const fallbackStatus =
      client.generations.length > 0 ? ClientStatus.READY_FOR_REVIEW : ClientStatus.AUDIT_READY;
    await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.GENERATING } });
    runGenerationInBackground(clientId, client.auditReport.id, userPrompt || null, fallbackStatus);
  } else if (client.interpretedBriefApprovedAt) {
    // The brief has already been interpreted and approved (e.g. the design spec was
    // rejected and is being redecided) — skip straight to Call 1.
    await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.DESIGNING } });
    runDesignDirectionInBackground(clientId, userPrompt || null);
  } else {
    // True first generation — interpret the brief first.
    await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.INTERPRETING } });
    runInterpretationInBackground(clientId, userPrompt || null);
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function regenerateInterpretedBrief(clientId: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: { interpretedBriefApprovedAt: null, status: ClientStatus.INTERPRETING },
  });
  runInterpretationInBackground(clientId, null);

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function approveInterpretedBrief(clientId: string, formData: FormData) {
  const raw = String(formData.get("brief") ?? "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That interpreted brief isn't valid JSON — fix it and resubmit.");
  }
  if (!isValidInterpretedBriefShape(parsed)) {
    throw new Error("That interpreted brief is missing required fields — fix it and resubmit.");
  }

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const existingBundle = client.interpretedBrief;
  if (!isValidInterpretedBriefBundle(existingBundle)) {
    throw new Error("No interpretation bundle found for this client — regenerate it first.");
  }

  const updatedBundle: InterpretedBriefBundle = { ...existingBundle, interpretedBrief: parsed };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      interpretedBrief: updatedBundle as unknown as Prisma.InputJsonValue,
      interpretedBriefApprovedAt: new Date(),
      status: ClientStatus.DESIGNING,
    },
  });

  runDesignDirectionInBackground(clientId, null);

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function regenerateDesignSpec(clientId: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: { designSpecApprovedAt: null, status: ClientStatus.DESIGNING },
  });
  runDesignDirectionInBackground(clientId, null);

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

export async function approveDesignSpec(clientId: string, formData: FormData) {
  const raw = String(formData.get("spec") ?? "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That design spec isn't valid JSON — fix it and resubmit.");
  }
  if (!isValidDesignSpecShape(parsed)) {
    throw new Error("That design spec is missing required fields — fix it and resubmit.");
  }

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: { auditReport: true },
  });
  if (!client.auditReport) {
    throw new Error("No audit report found for this client");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      designSpec: parsed as unknown as Prisma.InputJsonValue,
      designSpecApprovedAt: new Date(),
      status: ClientStatus.GENERATING,
    },
  });

  // The approved spec already encodes whatever the original request asked for — Call 2
  // just builds it, it doesn't need the free-text prompt again.
  runGenerationInBackground(clientId, client.auditReport.id, null, ClientStatus.DESIGN_REVIEW);

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}`);
}

async function readImageBase64(absPathOrStoragePath: string): Promise<string> {
  return (await readFile(absPathOrStoragePath)).toString("base64");
}

async function runInterpretationInBackground(clientId: string, userPrompt: string | null) {
  try {
    const [client, audit, assets, references] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      prisma.auditReport.findUniqueOrThrow({ where: { clientId } }),
      prisma.asset.findMany({ where: { clientId } }),
      prisma.reference.findMany({ where: { clientId } }),
    ]);

    const shotsDir = clientVisualShotsDir(clientId);
    const brandTone = audit.brandTone as BrandToneAudit | null;

    // The existing site — same URL for both intents (WORDPRESS_TRANSFER clients still
    // have a live siteUrl on record; if it isn't reachable, this whole job fails and
    // falls back to AUDIT_READY, same as any other Call 0 failure).
    const existingShots = await captureSiteVisualShots(client.siteUrl, shotsDir, "existing");
    if (!existingShots) {
      throw new Error(`Could not capture screenshots of the existing site (${client.siteUrl})`);
    }

    const businessContext = `${client.name}${brandTone ? ` — ${brandTone.summary}` : ""}`;

    const existingSiteRead: VisualRead = await analyzeVisualRead(
      "EXISTING_SITE",
      client.siteUrl,
      businessContext,
      existingShots,
      {
        desktop: await readImageBase64(existingShots.desktopPath),
        mobile: await readImageBase64(existingShots.mobilePath),
        hero: await readImageBase64(existingShots.heroPath),
        section: await readImageBase64(existingShots.sectionPath),
      }
    );

    const referenceReads: VisualRead[] = [];
    // Tracked explicitly rather than just logged — a design built on two of three
    // client-supplied references, with nothing surfacing that the third was dropped, is
    // a quality failure that only shows up three weeks later as "this doesn't look like
    // what we asked for." Any failure here forces BRIEF_REVIEW below, regardless of what
    // Call 0B decides, and is shown prominently in the review UI.
    const failedReferenceUrls: string[] = [];
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      try {
        const shots = await captureSiteVisualShots(ref.url, shotsDir, `reference-${i}`);
        if (!shots) {
          failedReferenceUrls.push(ref.url);
          continue;
        }
        const read = await analyzeVisualRead(
          "REFERENCE_SITE",
          ref.url,
          `${businessContext} — reference site note from client: ${ref.note ?? "none"}`,
          shots,
          {
            desktop: await readImageBase64(shots.desktopPath),
            mobile: await readImageBase64(shots.mobilePath),
            hero: await readImageBase64(shots.heroPath),
            section: await readImageBase64(shots.sectionPath),
          }
        );
        referenceReads.push(read);
      } catch (err) {
        console.error(`[interpretation] failed to read reference site ${ref.url}:`, err);
        failedReferenceUrls.push(ref.url);
      }
    }

    const contentSample = audit.contentSample ?? "";
    const technical = audit.technical as TechnicalAudit | null;
    const contentInventory = audit.contentInventory as ContentInventoryEntry[] | null;
    const synthesisInput: BriefSynthesisInput = {
      rawBriefText: client.briefText,
      businessName: client.name,
      industry: brandTone?.summary ?? "Unknown — infer from content and brief.",
      extractedPositioning: brandTone?.summary ?? "",
      targetCustomer: brandTone?.personality.join(", ") ?? "Unknown — infer from content and brief.",
      statedGoal: client.briefText ?? "Not explicitly stated — infer from the brief and the existing-site failures.",
      existingSiteRead,
      pageCount: technical?.pagesCrawled ?? 0,
      pageTypes: contentInventory?.map((p) => p.title || p.url) ?? [],
      wordCount: Math.round(contentSample.length / 5),
      heaviestPageSummary: "Not tracked per-page — aggregate content sample used for the volume estimate above.",
      referenceReads,
      assetManifest: assets.map((a) => ({ filename: a.filename, type: a.type })),
      lockedColours: null,
      lockedFonts: null,
      lockedMarks: null,
      hardConstraints:
        client.intent === ProjectIntent.WORDPRESS_TRANSFER
          ? "Output will be a WordPress theme."
          : "Output will be a standalone static site.",
    };

    const interpretedBrief = await synthesizeInterpretedBrief(synthesisInput);

    const bundle: InterpretedBriefBundle = {
      existingSiteRead,
      referenceReads,
      interpretedBrief,
      failedReferenceUrls,
    };

    const needsReview =
      interpretedBrief.conflicts.length > 0 ||
      interpretedBrief.confidence.level === "low" ||
      failedReferenceUrls.length > 0;

    if (needsReview) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          interpretedBrief: bundle as unknown as Prisma.InputJsonValue,
          interpretedBriefApprovedAt: null,
          status: ClientStatus.BRIEF_REVIEW,
        },
      });
    } else {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          interpretedBrief: bundle as unknown as Prisma.InputJsonValue,
          interpretedBriefApprovedAt: new Date(),
          status: ClientStatus.DESIGNING,
        },
      });
      // Clean interpretation — chain straight into Call 1 with no visible pause.
      runDesignDirectionInBackground(clientId, userPrompt);
    }
  } catch (err) {
    console.error(`[interpretation] failed for client ${clientId}:`, err);
    await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.AUDIT_READY } });
  }
}

async function runDesignDirectionInBackground(clientId: string, userPrompt: string | null) {
  try {
    const [client, assets] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      prisma.asset.findMany({ where: { clientId } }),
    ]);

    if (!isValidInterpretedBriefBundle(client.interpretedBrief)) {
      throw new Error("No approved interpreted brief found for this client");
    }
    const bundle = client.interpretedBrief;

    const logoAssets = assets.filter(
      (a) => a.type === AssetType.LOGO && IMAGE_MIME_TYPES.has(a.mimeType)
    );
    const logoImages: ImageAttachment[] = await Promise.all(
      logoAssets.map(async (a) => ({
        mediaType: a.mimeType as ImageAttachment["mediaType"],
        data: await readImageBase64(path.join(process.cwd(), a.storagePath)),
      }))
    );

    let homepageScreenshot: ImageAttachment | null = null;
    if (bundle.existingSiteRead) {
      // Re-capture is avoided: reuse nothing extra here — the existing-site screenshot
      // Call 1 sees is the same homepage image, re-read from the visual-shots dir if
      // still present; if the directory was cleaned up, Call 1 simply proceeds without it
      // (it still has the full existingSiteRead diagnosis as text).
      const shotsDir = clientVisualShotsDir(clientId);
      try {
        const data = await readImageBase64(path.join(shotsDir, "existing-desktop.png"));
        homepageScreenshot = { mediaType: "image/png", data };
      } catch {
        homepageScreenshot = null;
      }
    }

    const directionInput: DesignDirectionInput = {
      clientName: client.name,
      userPrompt,
      intent: client.intent,
      interpretedBrief: bundle.interpretedBrief,
      existingSiteRead: bundle.existingSiteRead,
      referenceReads: bundle.referenceReads,
      assetList: assets.map((a) => ({ filename: a.filename, type: a.type })),
    };

    const spec: DesignSpec = await proposeDesignSpec(directionInput, homepageScreenshot, logoImages);

    await prisma.client.update({
      where: { id: clientId },
      data: {
        designSpec: spec as unknown as Prisma.InputJsonValue,
        designSpecApprovedAt: null,
        status: ClientStatus.DESIGN_REVIEW,
      },
    });
  } catch (err) {
    console.error(`[design-direction] failed for client ${clientId}:`, err);
    await prisma.client.update({ where: { id: clientId }, data: { status: ClientStatus.AUDIT_READY } });
  }
}

async function runGenerationInBackground(
  clientId: string,
  auditReportId: string,
  userPrompt: string | null,
  fallbackStatus: (typeof ClientStatus)[keyof typeof ClientStatus]
) {
  try {
    const [client, audit, assets, priorGeneration] = await Promise.all([
      prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
      prisma.auditReport.findUniqueOrThrow({ where: { id: auditReportId } }),
      prisma.asset.findMany({ where: { clientId } }),
      prisma.generation.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!client.designSpec || !isValidDesignSpecShape(client.designSpec)) {
      throw new Error("No approved design spec found for this client");
    }
    const designSpec = client.designSpec as unknown as DesignSpec;

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

    const references = await prisma.reference.findMany({ where: { clientId } });

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
      designSpec,
    };

    const isWordPressTransfer = client.intent === ProjectIntent.WORDPRESS_TRANSFER;
    const promptText = isWordPressTransfer
      ? buildWordPressThemePromptText(promptInput)
      : buildGenerationPromptText(promptInput);

    const result = await generateSite(promptText, logoImages, contentImages);

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
