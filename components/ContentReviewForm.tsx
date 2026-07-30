"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { AssetDropzone } from "@/components/AssetDropzone";
import { updateContentRecord, approveContentRecord, removeContentImage, replaceContentImage } from "@/lib/actions/content";
import type { ContentColor, ContentImage, ContentService, ContentTestimonial, FieldFlags } from "@/lib/content/types";

const CARD_CLASS = "rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-4";
const LABEL_CLASS = "mb-1 flex items-center gap-2 text-sm font-medium text-neutral-300";
const INPUT_CLASS =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400";

type ImageWithUrl = ContentImage & { url: string | null };

type ContentReviewFormProps = {
  clientId: string;
  businessName: string | null;
  tagline: string | null;
  aboutCopy: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  services: ContentService[];
  testimonials: ContentTestimonial[];
  brandColors: ContentColor[];
  images: ImageWithUrl[];
  fieldFlags: FieldFlags;
};

export function ContentReviewForm({
  clientId,
  businessName,
  tagline,
  aboutCopy,
  contactEmail,
  contactPhone,
  contactAddress,
  services,
  testimonials,
  brandColors,
  images,
  fieldFlags,
}: ContentReviewFormProps) {
  const [serviceRows, setServiceRows] = useState(services.map((s, i) => ({ ...s, key: `s-${i}` })));
  const [testimonialRows, setTestimonialRows] = useState(
    testimonials.map((t, i) => ({ ...t, key: `t-${i}` }))
  );

  const colorByRole = (role: ContentColor["role"]) => brandColors.find((c) => c.role === role);

  return (
    <div className="space-y-6">
      <form className="space-y-6">
        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Business</h3>
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>
                Business name <ConfidenceBadge {...fieldFlags.businessName} />
              </label>
              <input name="businessName" defaultValue={businessName ?? ""} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Tagline <ConfidenceBadge {...fieldFlags.tagline} />
              </label>
              <input name="tagline" defaultValue={tagline ?? ""} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                About <ConfidenceBadge {...fieldFlags.aboutCopy} />
              </label>
              <textarea name="aboutCopy" rows={4} defaultValue={aboutCopy ?? ""} className={INPUT_CLASS} />
            </div>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Services</h3>
          <div className="space-y-3">
            {serviceRows.map((row) => (
              <div key={row.key} className="flex gap-2">
                <input type="hidden" name="serviceId" value={row.id} />
                <div className="flex-1 space-y-2">
                  <input
                    name="serviceName"
                    defaultValue={row.name}
                    placeholder="Service name"
                    className={INPUT_CLASS}
                  />
                  <textarea
                    name="serviceDescription"
                    defaultValue={row.description}
                    placeholder="Description"
                    rows={2}
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ConfidenceBadge confidence={row.confidence} flagged={row.flagged} flagReason={row.flagReason} />
                  <button
                    type="button"
                    onClick={() => setServiceRows((rows) => rows.filter((r) => r.key !== row.key))}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setServiceRows((rows) => [
                  ...rows,
                  { id: "", name: "", description: "", confidence: "high", flagged: false, key: `s-new-${rows.length}-${Date.now()}` },
                ])
              }
              className="rounded-lg border border-dashed border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
            >
              + Add service
            </button>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Testimonials</h3>
          <div className="space-y-3">
            {testimonialRows.map((row) => (
              <div key={row.key} className="flex gap-2">
                <input type="hidden" name="testimonialId" value={row.id} />
                <div className="flex-1 space-y-2">
                  <textarea
                    name="testimonialQuote"
                    defaultValue={row.quote}
                    placeholder="Quote"
                    rows={2}
                    className={INPUT_CLASS}
                  />
                  <div className="flex gap-2">
                    <input name="testimonialAuthor" defaultValue={row.author} placeholder="Author" className={INPUT_CLASS} />
                    <input name="testimonialRole" defaultValue={row.role ?? ""} placeholder="Role (optional)" className={INPUT_CLASS} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ConfidenceBadge confidence={row.confidence} flagged={row.flagged} flagReason={row.flagReason} />
                  <button
                    type="button"
                    onClick={() => setTestimonialRows((rows) => rows.filter((r) => r.key !== row.key))}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setTestimonialRows((rows) => [
                  ...rows,
                  { id: "", quote: "", author: "", confidence: "high", flagged: false, key: `t-new-${rows.length}-${Date.now()}` },
                ])
              }
              className="rounded-lg border border-dashed border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
            >
              + Add testimonial
            </button>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Contact</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>
                Email <ConfidenceBadge {...fieldFlags.contactEmail} />
              </label>
              <input name="contactEmail" defaultValue={contactEmail ?? ""} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Phone <ConfidenceBadge {...fieldFlags.contactPhone} />
              </label>
              <input name="contactPhone" defaultValue={contactPhone ?? ""} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>
                Address <ConfidenceBadge {...fieldFlags.contactAddress} />
              </label>
              <input name="contactAddress" defaultValue={contactAddress ?? ""} className={INPUT_CLASS} />
            </div>
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Brand colours</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["primary", "secondary", "accent"] as const).map((role) => {
              const color = colorByRole(role);
              return (
                <div key={role}>
                  <label className={LABEL_CLASS}>
                    {role[0].toUpperCase() + role.slice(1)} <ConfidenceBadge confidence={color?.confidence} flagged={color?.flagged} />
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" name={`color_${role}`} defaultValue={color?.hex ?? "#6b7280"} className="h-9 w-12 rounded border border-neutral-700 bg-neutral-900" />
                    <span className="text-sm text-neutral-400">{color?.hex ?? "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <SubmitButton
            formAction={updateContentRecord.bind(null, clientId)}
            pendingLabel="Saving..."
            className="rounded-lg border border-neutral-700 px-5 py-2.5 font-medium text-neutral-200 transition hover:bg-neutral-900"
          >
            Save changes
          </SubmitButton>
          <ConfirmSubmitButton
            formAction={approveContentRecord.bind(null, clientId)}
            confirmText="Approve this content? It will unlock Choose Template — make sure everything looks right first."
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
          >
            Approve & continue
          </ConfirmSubmitButton>
        </div>
      </form>

      <section className={CARD_CLASS}>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Logo &amp; images</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.assetId} className="space-y-2 rounded-lg border border-neutral-800 p-3">
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.role} className="aspect-video w-full rounded object-cover" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded bg-neutral-900 text-xs text-neutral-600">
                  No preview
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="capitalize">{img.role}</span>
                <ConfidenceBadge flagged={img.flagged} flagReason={img.flagReason} />
              </div>
              <div className="flex items-center gap-2">
                <form action={removeContentImage.bind(null, clientId, img.assetId)}>
                  <button type="submit" className="text-xs text-neutral-500 hover:text-red-400">
                    Remove
                  </button>
                </form>
              </div>
              {img.flagged && (
                // No encType here — React sets it automatically for a function `action`
                // (a Server Action) and warns/overrides if you specify one yourself. It
                // correctly detects the file input below and submits as multipart/form-data.
                <form action={replaceContentImage.bind(null, clientId)} className="space-y-1">
                  <input type="hidden" name="assetId" value={img.assetId} />
                  <AssetDropzone label="Replace with a better image" name="file" multiple={false} />
                  <SubmitButton
                    pendingLabel="Uploading..."
                    className="w-full rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
                  >
                    Upload replacement
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
          {images.length === 0 && <p className="text-sm text-neutral-500">No images found on the crawled site.</p>}
        </div>
      </section>
    </div>
  );
}
