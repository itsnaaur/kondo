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
  ContentStat,
  ContentFaq,
  ContentDifferentiator,
  ContentProcessStep,
  ContentServiceArea,
  ContentHours,
  ContentOffer,
  ContentCredential,
  ConfidenceLevel,
  FieldFlags,
} from "@/lib/content/types";

function optionalText(schema: typeof shortTextSchema, value: FormDataEntryValue | null): string | null {
  const parsed = schema.safeParse(value ?? "");
  const text = parsed.success ? parsed.data : "";
  return text.length > 0 ? text : null;
}

type FlaggedRow = { id: string; confidence: ConfidenceLevel; flagged: boolean; flagReason?: string };

type ArrayFieldConfig<T> = {
  formName: string; // form field name this column round-trips through
  dataKey: Extract<keyof T, string>;
  schema: typeof shortTextSchema | typeof mediumTextSchema;
  // Excluded from the "does this row have anything worth keeping" check, and normalized to
  // undefined rather than "" when blank (matches how the original testimonial-role handling
  // worked) — for fields like a testimonial's role where absence isn't itself a reason to
  // drop the row.
  optional?: boolean;
};

// Every flagged-row section (services/testimonials/stats/faqs/differentiators/process/
// serviceAreas/hours/offers/credentials) rebuilds from its resubmitted parallel-array form
// fields the identical way: the full array is the source of truth on every submit, so a row
// not re-included is simply gone; a row whose id matches an existing one keeps its prior
// confidence/flag unless its text actually changed (a human just fixed it, so it's unflagged
// and treated as high confidence); a row with no matching id is new and unflagged/high
// confidence from the start. This one function replaced what used to be a near-identical
// rebuildX copy per section, differing only in field names and which schema validates which
// column — the ContentReviewForm side of this same duplication is ArrayCard.
function rebuildArraySection<T extends FlaggedRow>(
  formData: FormData,
  idFieldName: string,
  fields: ArrayFieldConfig<T>[],
  existing: T[]
): T[] {
  const ids = formData.getAll(idFieldName).map(String);
  const columns = fields.map((f) => formData.getAll(f.formName).map(String));
  const existingById = new Map(existing.map((e) => [e.id, e]));
  const count = Math.max(0, ...columns.map((c) => c.length));

  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const values: Record<string, string | undefined> = {};
    let hasRequiredContent = false;

    fields.forEach((def, f) => {
      const raw = columns[f][i] ?? "";
      if (def.optional) {
        values[def.dataKey] = optionalText(def.schema, raw) ?? undefined;
      } else {
        const parsed = def.schema.safeParse(raw);
        const text = parsed.success ? parsed.data : "";
        values[def.dataKey] = text;
        if (text) hasRequiredContent = true;
      }
    });
    if (!hasRequiredContent) continue;

    const id = ids[i] || randomUUID();
    const prior = existingById.get(id);
    const changed = !prior || fields.some((def) => (prior as Record<string, unknown>)[def.dataKey] !== values[def.dataKey]);

    const row = {
      id,
      ...values,
      confidence: changed ? "high" : prior!.confidence,
      flagged: changed ? false : prior!.flagged,
      ...(!changed && prior!.flagReason !== undefined ? { flagReason: prior!.flagReason } : {}),
    } as unknown as Record<string, unknown>;

    for (const def of fields) {
      if (def.optional && row[def.dataKey] === undefined) delete row[def.dataKey];
    }

    result.push(row as unknown as T);
  }
  return result;
}

const SERVICE_FIELDS: ArrayFieldConfig<ContentService>[] = [
  { formName: "serviceName", dataKey: "name", schema: shortTextSchema },
  { formName: "serviceDescription", dataKey: "description", schema: mediumTextSchema },
];
const TESTIMONIAL_FIELDS: ArrayFieldConfig<ContentTestimonial>[] = [
  { formName: "testimonialQuote", dataKey: "quote", schema: mediumTextSchema },
  { formName: "testimonialAuthor", dataKey: "author", schema: shortTextSchema },
  { formName: "testimonialRole", dataKey: "role", schema: shortTextSchema, optional: true },
];
const STAT_FIELDS: ArrayFieldConfig<ContentStat>[] = [
  { formName: "statValue", dataKey: "value", schema: shortTextSchema },
  { formName: "statLabel", dataKey: "label", schema: shortTextSchema },
];
const FAQ_FIELDS: ArrayFieldConfig<ContentFaq>[] = [
  { formName: "faqQuestion", dataKey: "question", schema: shortTextSchema },
  { formName: "faqAnswer", dataKey: "answer", schema: mediumTextSchema },
];
const DIFFERENTIATOR_FIELDS: ArrayFieldConfig<ContentDifferentiator>[] = [
  { formName: "differentiatorTitle", dataKey: "title", schema: shortTextSchema },
  { formName: "differentiatorDescription", dataKey: "description", schema: mediumTextSchema },
];
const PROCESS_FIELDS: ArrayFieldConfig<ContentProcessStep>[] = [
  { formName: "processTitle", dataKey: "title", schema: shortTextSchema },
  { formName: "processDescription", dataKey: "description", schema: mediumTextSchema },
];
const SERVICE_AREA_FIELDS: ArrayFieldConfig<ContentServiceArea>[] = [
  { formName: "serviceAreaName", dataKey: "name", schema: shortTextSchema },
];
const HOURS_FIELDS: ArrayFieldConfig<ContentHours>[] = [
  { formName: "hoursDays", dataKey: "days", schema: shortTextSchema },
  { formName: "hoursHours", dataKey: "hours", schema: shortTextSchema },
];
const OFFER_FIELDS: ArrayFieldConfig<ContentOffer>[] = [
  { formName: "offerName", dataKey: "name", schema: shortTextSchema },
  { formName: "offerPrice", dataKey: "price", schema: shortTextSchema },
];
const CREDENTIAL_FIELDS: ArrayFieldConfig<ContentCredential>[] = [
  { formName: "credentialLabel", dataKey: "label", schema: shortTextSchema },
];

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
  const existingStats = (record.stats as unknown as ContentStat[] | null) ?? [];
  const existingFaqs = (record.faqs as unknown as ContentFaq[] | null) ?? [];
  const existingDifferentiators = (record.differentiators as unknown as ContentDifferentiator[] | null) ?? [];
  const existingProcess = (record.process as unknown as ContentProcessStep[] | null) ?? [];
  const existingServiceAreas = (record.serviceAreas as unknown as ContentServiceArea[] | null) ?? [];
  const existingHours = (record.hours as unknown as ContentHours[] | null) ?? [];
  const existingOffers = (record.offers as unknown as ContentOffer[] | null) ?? [];
  const existingCredentials = (record.credentials as unknown as ContentCredential[] | null) ?? [];
  const existingColors = (record.brandColors as unknown as ContentColor[] | null) ?? [];
  const existingFlags = (record.fieldFlags as unknown as FieldFlags | null) ?? {};

  const businessName = optionalText(shortTextSchema, formData.get("businessName"));
  const tagline = optionalText(shortTextSchema, formData.get("tagline"));
  const aboutCopy = optionalText(longTextSchema, formData.get("aboutCopy"));
  const ctaLabel = optionalText(shortTextSchema, formData.get("ctaLabel"));
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
  clearIfChanged("ctaLabel", record.ctaLabel, ctaLabel);

  const services = rebuildArraySection(formData, "serviceId", SERVICE_FIELDS, existingServices);
  const testimonials = rebuildArraySection(formData, "testimonialId", TESTIMONIAL_FIELDS, existingTestimonials);
  const stats = rebuildArraySection(formData, "statId", STAT_FIELDS, existingStats);
  const faqs = rebuildArraySection(formData, "faqId", FAQ_FIELDS, existingFaqs);
  const differentiators = rebuildArraySection(formData, "differentiatorId", DIFFERENTIATOR_FIELDS, existingDifferentiators);
  const process = rebuildArraySection(formData, "processId", PROCESS_FIELDS, existingProcess);
  const serviceAreas = rebuildArraySection(formData, "serviceAreaId", SERVICE_AREA_FIELDS, existingServiceAreas);
  const hours = rebuildArraySection(formData, "hoursId", HOURS_FIELDS, existingHours);
  const offers = rebuildArraySection(formData, "offerId", OFFER_FIELDS, existingOffers);
  const credentials = rebuildArraySection(formData, "credentialId", CREDENTIAL_FIELDS, existingCredentials);
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
      ctaLabel,
      contactEmail,
      contactPhone,
      contactAddress,
      services: services as unknown as Prisma.InputJsonValue,
      testimonials: testimonials as unknown as Prisma.InputJsonValue,
      stats: stats as unknown as Prisma.InputJsonValue,
      faqs: faqs as unknown as Prisma.InputJsonValue,
      differentiators: differentiators as unknown as Prisma.InputJsonValue,
      process: process as unknown as Prisma.InputJsonValue,
      serviceAreas: serviceAreas as unknown as Prisma.InputJsonValue,
      hours: hours as unknown as Prisma.InputJsonValue,
      offers: offers as unknown as Prisma.InputJsonValue,
      credentials: credentials as unknown as Prisma.InputJsonValue,
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
