"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { logAuditEvent } from "@/lib/audit-log";
import { uploadAssetToStorage } from "@/lib/storage/upload-asset";
import { AssetType } from "@/app/generated/prisma/client";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  shortTextSchema,
  mediumTextSchema,
  longTextSchema,
  contactFieldSchema,
  hexColorSchema,
} from "@/lib/validation/text-limits";
import type {
  ContentColor,
  ContentImage,
  ContentService,
  ContentTestimonial,
  FieldFlags,
} from "@/lib/content/types";

function optionalText(schema: typeof shortTextSchema, value: FormDataEntryValue | null): string | null {
  const parsed = schema.safeParse(value ?? "");
  const text = parsed.success ? parsed.data : "";
  return text.length > 0 ? text : null;
}

// Rebuilds services/testimonials from the resubmitted parallel-array form fields — the
// full array is the source of truth on every submit, so a row the user didn't re-include
// is simply gone (that's what "delete what's junk" is). A row whose id matches an
// existing one keeps its prior confidence unless its text actually changed, in which case
// a human just fixed it, so it's unflagged and treated as high confidence; a row with no
// matching id is new (the user added it) and is unflagged/high confidence from the start.
function rebuildServices(formData: FormData, existing: ContentService[]): ContentService[] {
  const ids = formData.getAll("serviceId").map(String);
  const names = formData.getAll("serviceName").map(String);
  const descriptions = formData.getAll("serviceDescription").map(String);
  const existingById = new Map(existing.map((s) => [s.id, s]));

  const result: ContentService[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = shortTextSchema.safeParse(names[i]).success ? shortTextSchema.parse(names[i]) : "";
    const description = mediumTextSchema.safeParse(descriptions[i] ?? "").success
      ? mediumTextSchema.parse(descriptions[i] ?? "")
      : "";
    if (!name && !description) continue;

    const id = ids[i] || randomUUID();
    const prior = existingById.get(id);
    const changed = !prior || prior.name !== name || prior.description !== description;

    result.push({
      id,
      name,
      description,
      confidence: changed ? "high" : prior.confidence,
      flagged: changed ? false : prior.flagged,
      ...(changed ? {} : { flagReason: prior.flagReason }),
    });
  }
  return result;
}

function rebuildTestimonials(formData: FormData, existing: ContentTestimonial[]): ContentTestimonial[] {
  const ids = formData.getAll("testimonialId").map(String);
  const quotes = formData.getAll("testimonialQuote").map(String);
  const authors = formData.getAll("testimonialAuthor").map(String);
  const roles = formData.getAll("testimonialRole").map(String);
  const existingById = new Map(existing.map((t) => [t.id, t]));

  const result: ContentTestimonial[] = [];
  for (let i = 0; i < quotes.length; i++) {
    const quote = mediumTextSchema.safeParse(quotes[i]).success ? mediumTextSchema.parse(quotes[i]) : "";
    const author = shortTextSchema.safeParse(authors[i] ?? "").success ? shortTextSchema.parse(authors[i] ?? "") : "";
    const role = optionalText(shortTextSchema, roles[i] ?? "") ?? undefined;
    if (!quote && !author) continue;

    const id = ids[i] || randomUUID();
    const prior = existingById.get(id);
    const changed = !prior || prior.quote !== quote || prior.author !== author || prior.role !== role;

    result.push({
      id,
      quote,
      author,
      ...(role ? { role } : {}),
      confidence: changed ? "high" : prior.confidence,
      flagged: changed ? false : prior.flagged,
      ...(changed ? {} : { flagReason: prior.flagReason }),
    });
  }
  return result;
}

function rebuildColors(formData: FormData, existing: ContentColor[]): ContentColor[] {
  const roles: ContentColor["role"][] = ["primary", "secondary", "accent"];
  const result: ContentColor[] = [];

  for (const role of roles) {
    const prior = existing.find((c) => c.role === role);
    const raw = String(formData.get(`color_${role}`) ?? prior?.hex ?? "");
    const check = hexColorSchema.safeParse(raw);
    if (!check.success) {
      if (prior) result.push(prior);
      continue;
    }

    const changed = !prior || prior.hex.toLowerCase() !== check.data.toLowerCase();
    result.push({
      hex: check.data,
      role,
      confidence: changed ? "high" : prior.confidence,
      flagged: changed ? false : prior.flagged,
    });
  }
  return result;
}

async function applyContentUpdate(clientId: string, formData: FormData) {
  const record = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });

  const existingServices = (record.services as unknown as ContentService[] | null) ?? [];
  const existingTestimonials = (record.testimonials as unknown as ContentTestimonial[] | null) ?? [];
  const existingColors = (record.brandColors as unknown as ContentColor[] | null) ?? [];
  const existingFlags = (record.fieldFlags as unknown as FieldFlags | null) ?? {};

  const businessName = optionalText(shortTextSchema, formData.get("businessName"));
  const tagline = optionalText(shortTextSchema, formData.get("tagline"));
  const aboutCopy = optionalText(longTextSchema, formData.get("aboutCopy"));
  const contactEmail = optionalText(contactFieldSchema, formData.get("contactEmail"));
  const contactPhone = optionalText(contactFieldSchema, formData.get("contactPhone"));
  const contactAddress = optionalText(contactFieldSchema, formData.get("contactAddress"));

  const fieldFlags: FieldFlags = { ...existingFlags };
  const clearIfChanged = (key: keyof FieldFlags, before: string | null, after: string | null) => {
    if (before !== after) delete fieldFlags[key];
  };
  clearIfChanged("businessName", record.businessName, businessName);
  clearIfChanged("tagline", record.tagline, tagline);
  clearIfChanged("aboutCopy", record.aboutCopy, aboutCopy);
  clearIfChanged("contactAddress", record.contactAddress, contactAddress);
  clearIfChanged("contactEmail", record.contactEmail, contactEmail);
  clearIfChanged("contactPhone", record.contactPhone, contactPhone);

  const services = rebuildServices(formData, existingServices);
  const testimonials = rebuildTestimonials(formData, existingTestimonials);
  const brandColors = rebuildColors(formData, existingColors);

  // Images aren't edited as text here — removal and the flagged-image replacement
  // (AssetDropzone) go through their own array/action, see below and
  // removeContentImage/replaceContentImage.

  await prisma.contentRecord.update({
    where: { clientId },
    data: {
      businessName,
      tagline,
      aboutCopy,
      contactEmail,
      contactPhone,
      contactAddress,
      services: services as unknown as Prisma.InputJsonValue,
      testimonials: testimonials as unknown as Prisma.InputJsonValue,
      brandColors: brandColors as unknown as Prisma.InputJsonValue,
      fieldFlags: fieldFlags as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateContentRecord(clientId: string, formData: FormData) {
  const user = await requireUser();
  await applyContentUpdate(clientId, formData);
  await logAuditEvent("CONTENT_UPDATED", { userId: user.id, clientId });
  revalidatePath(`/clients/${clientId}`);
}

// The gate the rest of the flow actually checks (contentRecord.reviewedAt != null) — not
// Client.status, which only ever reflects the Analyse Site job. Ships whatever is in the
// form at the moment of approval, so this also saves any last edits.
export async function approveContentRecord(clientId: string, formData: FormData) {
  const user = await requireUser();
  await applyContentUpdate(clientId, formData);
  await prisma.contentRecord.update({
    where: { clientId },
    data: { reviewedAt: new Date(), reviewedByUserId: user.id },
  });
  await logAuditEvent("CONTENT_APPROVED", { userId: user.id, clientId });
  revalidatePath(`/clients/${clientId}`);
}

// Human "delete what's junk" for an image, without needing a full form resubmission —
// just drops the entry from ContentRecord.images. Doesn't touch the underlying Asset row
// (append-only, same as everywhere else).
export async function removeContentImage(clientId: string, assetId: string) {
  await requireUser();
  const record = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });
  const images = (record.images as unknown as ContentImage[] | null) ?? [];
  const next = images.filter((img) => img.assetId !== assetId);
  const data: Prisma.ContentRecordUpdateInput = { images: next as unknown as Prisma.InputJsonValue };
  if (record.logoAssetId === assetId) data.logoAsset = { disconnect: true };

  await prisma.contentRecord.update({ where: { clientId }, data });
  revalidatePath(`/clients/${clientId}`);
}

const REASSIGNABLE_ROLES = new Set(["gallery", "partner-logo"]);

// The escape hatch for lib/content/classify-partner-logos.ts getting it wrong in either
// direction — a reviewer moving an image between the two peer buckets it could plausibly
// belong to. Deliberately doesn't allow reassigning to/from "logo"/"hero": those are
// singular, structurally different roles (repointing a hero needs the old one un-set,
// promoting something to logo needs ContentRecord.logoAssetId updated too), not a same-
// shape swap the way gallery/partner-logo are.
export async function updateImageRole(clientId: string, assetId: string, formData: FormData) {
  await requireUser();
  const role = String(formData.get("role") ?? "");
  if (!REASSIGNABLE_ROLES.has(role)) throw new Error("Invalid image role");

  const record = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });
  const images = (record.images as unknown as ContentImage[] | null) ?? [];
  const next = images.map((img) =>
    img.assetId === assetId && REASSIGNABLE_ROLES.has(img.role)
      ? { ...img, role: role as ContentImage["role"], flagged: false, flagReason: undefined }
      : img
  );

  await prisma.contentRecord.update({
    where: { clientId },
    data: { images: next as unknown as Prisma.InputJsonValue },
  });
  revalidatePath(`/clients/${clientId}`);
}

// The AssetDropzone escape hatch for a flagged (low-resolution, or simply wrong) logo or
// hero image — uploads the replacement to Supabase Storage via the same shared path the
// crawler uses, then repoints the ContentRecord entry at the new Asset and clears the
// flag. The old Asset row is left alone (append-only).
export async function replaceContentImage(clientId: string, formData: FormData) {
  await requireUser();

  const oldAssetId = String(formData.get("assetId") ?? "");
  const file = formData.get("file");
  if (!oldAssetId || !(file instanceof File) || file.size === 0) {
    throw new Error("A replacement image file is required");
  }

  const record = await prisma.contentRecord.findUniqueOrThrow({ where: { clientId } });
  const images = (record.images as unknown as ContentImage[] | null) ?? [];
  const target = images.find((img) => img.assetId === oldAssetId);
  if (!target) throw new Error("That image is no longer part of this content record");

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadAssetToStorage(clientId, buffer, file.name, file.type || "application/octet-stream");
  const asset = await prisma.asset.create({
    data: {
      clientId,
      type: target.role === "logo" ? AssetType.LOGO : AssetType.IMAGE,
      filename: file.name,
      url: uploaded.url,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
    },
  });

  const nextImages = images.map((img) =>
    img.assetId === oldAssetId
      ? { ...img, assetId: asset.id, flagged: false, flagReason: undefined }
      : img
  );

  const data: Prisma.ContentRecordUpdateInput = { images: nextImages as unknown as Prisma.InputJsonValue };
  if (target.role === "logo") data.logoAsset = { connect: { id: asset.id } };

  await prisma.contentRecord.update({ where: { clientId }, data });
  revalidatePath(`/clients/${clientId}`);
}
