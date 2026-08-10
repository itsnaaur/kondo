"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { AssetDropzone } from "@/components/AssetDropzone";
import {
  updateContentRecord,
  approveContentRecord,
  removeContentImage,
  replaceContentImage,
  updateImageRole,
} from "@/lib/actions/content";
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
  FieldFlags,
} from "@/lib/content/types";

const CARD_CLASS = "rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-4";
const LABEL_CLASS = "mb-1 flex items-center gap-2 text-sm font-medium text-neutral-300";
const INPUT_CLASS =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-yellow-400";

type ImageWithUrl = ContentImage & { url: string | null };

const REASSIGNABLE_ROLES = new Set<ContentImage["role"]>(["gallery", "partner-logo"]);

// Shared between the main Logo & images grid and the Partner logos card below — same
// remove/replace/reclassify actions apply in both places, and duplicating this per-card
// JSX would be exactly the kind of drift that lets one of the two get an edit the other
// doesn't.
function ImageCard({ clientId, img }: { clientId: string; img: ImageWithUrl }) {
  return (
    <div className="space-y-2 rounded-lg border border-neutral-800 p-3">
      {img.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.role} className="aspect-video w-full rounded object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded bg-neutral-900 text-xs text-neutral-600">
          No preview
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span className="capitalize">{img.role.replace("-", " ")}</span>
        <ConfidenceBadge flagged={img.flagged} flagReason={img.flagReason} />
      </div>
      {/* AI-classified from alt/surrounding text only, not vision (see
          lib/content/structure-and-rewrite.ts) — display-only for now, no template reads
          this yet. "unknown" is the common, correct answer, so it renders quietly rather
          than as a warning. */}
      {(img.caption || (img.subject && img.subject !== "unknown")) && (
        <div className="space-y-0.5 text-xs">
          {img.caption && <p className="text-neutral-400">&ldquo;{img.caption}&rdquo;</p>}
          {img.subject && img.subject !== "unknown" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-0.5 text-neutral-500">
              {img.subject}
              {img.suitableAsHero ? " · hero-suitable" : ""}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <form action={removeContentImage.bind(null, clientId, img.assetId)}>
          <button type="submit" className="text-xs text-neutral-500 hover:text-red-400">
            Remove
          </button>
        </form>
        {REASSIGNABLE_ROLES.has(img.role) && (
          <form action={updateImageRole.bind(null, clientId, img.assetId)}>
            <select
              name="role"
              defaultValue={img.role}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 outline-none focus:border-yellow-400"
            >
              <option value="gallery">Gallery</option>
              <option value="partner-logo">Partner logo</option>
            </select>
          </form>
        )}
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
  );
}

// ---------- ArrayCard: the one implementation behind every flagged-row section ----------
//
// Services/testimonials/stats/faqs/differentiators/process/serviceAreas/hours/offers/
// credentials all share the identical mechanics — add a row, remove a row, resubmit the
// full array as parallel form fields, show a confidence badge — and used to be nine (soon
// ten) near-identical hand-written sections. What genuinely differs between them is only
// which fields a row has and how those fields lay out (one field per line, or two side by
// side) — that's what `fieldRows` describes, not something worth a generic renderer
// papering over. A section that doesn't fit this shape (brand colours: always exactly
// three fixed roles, no add/remove) correctly stays its own hand-written block below.

type ArrayCardRow = {
  id: string;
  confidence?: string;
  flagged?: boolean;
  flagReason?: string;
  [dataKey: string]: unknown;
};

type ArrayCardField = {
  name: string; // form field name this value round-trips through
  dataKey: string; // property on the row holding this field's value
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  className?: string; // e.g. a narrow width for a stat's value or an offer's price
};

function ArrayCard({
  title,
  helpText,
  idFieldName,
  fieldRows,
  addLabel,
  initialRows,
}: {
  title: string;
  helpText?: string;
  idFieldName: string;
  fieldRows: ArrayCardField[][]; // each inner array renders as one side-by-side row of fields
  addLabel: string;
  initialRows: ArrayCardRow[];
}) {
  const [rows, setRows] = useState<(ArrayCardRow & { key: string })[]>(() =>
    initialRows.map((r, i) => ({ ...r, key: `${idFieldName}-${i}` }))
  );

  const addRow = () => {
    const blank: ArrayCardRow & { key: string } = {
      id: "",
      confidence: "high",
      flagged: false,
      key: `${idFieldName}-new-${rows.length}-${Date.now()}`,
    };
    for (const group of fieldRows) for (const f of group) blank[f.dataKey] = "";
    setRows((rs) => [...rs, blank]);
  };

  return (
    <section className={CARD_CLASS}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</h3>
      {helpText && <p className="mb-3 text-xs text-neutral-500">{helpText}</p>}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex gap-2">
            <input type="hidden" name={idFieldName} value={row.id} />
            <div className="flex-1 space-y-2">
              {fieldRows.map((group, gi) => (
                <div key={gi} className="flex gap-2">
                  {group.map((f) =>
                    f.multiline ? (
                      <textarea
                        key={f.name}
                        name={f.name}
                        defaultValue={(row[f.dataKey] as string) ?? ""}
                        placeholder={f.placeholder}
                        rows={f.rows ?? 2}
                        className={`${INPUT_CLASS}${f.className ? ` ${f.className}` : ""}`}
                      />
                    ) : (
                      <input
                        key={f.name}
                        name={f.name}
                        defaultValue={(row[f.dataKey] as string) ?? ""}
                        placeholder={f.placeholder}
                        className={`${INPUT_CLASS}${f.className ? ` ${f.className}` : ""}`}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end gap-2">
              <ConfidenceBadge
                confidence={row.confidence as "low" | "medium" | "high" | undefined}
                flagged={row.flagged}
                flagReason={row.flagReason}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
        >
          + {addLabel}
        </button>
      </div>
    </section>
  );
}

// Field-row definitions — one per section, describing only what's genuinely different
// between them: field names, placeholders, and single-line vs stacked layout.
const SERVICE_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "serviceName", dataKey: "name", placeholder: "Service name" }],
  [{ name: "serviceDescription", dataKey: "description", placeholder: "Description", multiline: true, rows: 2 }],
];
const TESTIMONIAL_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "testimonialQuote", dataKey: "quote", placeholder: "Quote", multiline: true, rows: 2 }],
  [
    { name: "testimonialAuthor", dataKey: "author", placeholder: "Author" },
    { name: "testimonialRole", dataKey: "role", placeholder: "Role (optional)" },
  ],
];
const STAT_FIELD_ROWS: ArrayCardField[][] = [
  [
    { name: "statValue", dataKey: "value", placeholder: "25+", className: "max-w-[8rem]" },
    { name: "statLabel", dataKey: "label", placeholder: "Years in business" },
  ],
];
const DIFFERENTIATOR_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "differentiatorTitle", dataKey: "title", placeholder: "Title" }],
  [{ name: "differentiatorDescription", dataKey: "description", placeholder: "Description", multiline: true, rows: 2 }],
];
const PROCESS_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "processTitle", dataKey: "title", placeholder: "Step title" }],
  [{ name: "processDescription", dataKey: "description", placeholder: "Description", multiline: true, rows: 2 }],
];
const FAQ_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "faqQuestion", dataKey: "question", placeholder: "Question" }],
  [{ name: "faqAnswer", dataKey: "answer", placeholder: "Answer", multiline: true, rows: 2 }],
];
const OFFER_FIELD_ROWS: ArrayCardField[][] = [
  [
    { name: "offerPrice", dataKey: "price", placeholder: "$199", className: "max-w-[8rem]" },
    { name: "offerName", dataKey: "name", placeholder: "New patient check-up" },
  ],
];
const CREDENTIAL_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "credentialLabel", dataKey: "label", placeholder: "AHPRA registered" }],
];
const HOURS_FIELD_ROWS: ArrayCardField[][] = [
  [
    { name: "hoursDays", dataKey: "days", placeholder: "Mon–Fri", className: "max-w-[10rem]" },
    { name: "hoursHours", dataKey: "hours", placeholder: "8:00am–5:00pm" },
  ],
];
const SERVICE_AREA_FIELD_ROWS: ArrayCardField[][] = [
  [{ name: "serviceAreaName", dataKey: "name", placeholder: "Gold Coast" }],
];

type ContentReviewFormProps = {
  clientId: string;
  businessName: string | null;
  tagline: string | null;
  aboutCopy: string | null;
  ctaLabel: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  services: ContentService[];
  testimonials: ContentTestimonial[];
  stats: ContentStat[];
  faqs: ContentFaq[];
  differentiators: ContentDifferentiator[];
  process: ContentProcessStep[];
  serviceAreas: ContentServiceArea[];
  hours: ContentHours[];
  offers: ContentOffer[];
  credentials: ContentCredential[];
  brandColors: ContentColor[];
  images: ImageWithUrl[];
  fieldFlags: FieldFlags;
};

export function ContentReviewForm({
  clientId,
  businessName,
  tagline,
  aboutCopy,
  ctaLabel,
  contactEmail,
  contactPhone,
  contactAddress,
  services,
  testimonials,
  stats,
  faqs,
  differentiators,
  process,
  serviceAreas,
  hours,
  offers,
  credentials,
  brandColors,
  images,
  fieldFlags,
}: ContentReviewFormProps) {
  const colorByRole = (role: ContentColor["role"]) => brandColors.find((c) => c.role === role);
  const mainImages = images.filter((img) => img.role !== "partner-logo");
  const partnerLogoImages = images.filter((img) => img.role === "partner-logo");

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

        <ArrayCard
          title="Services"
          idFieldName="serviceId"
          fieldRows={SERVICE_FIELD_ROWS}
          addLabel="Add service"
          initialRows={services}
        />

        {/* Stats first among the flagged-by-default sections — a wrong number in a
            prospect-facing mockup costs more credibility than any other extraction here, so
            it gets reviewed before anything else new. No auto-clear-on-edit exemption: like
            every other field, a human editing a row unflags it — the AI-side "always
            flagged" default (structure-and-rewrite.ts) only applies before a human has
            looked. */}
        <ArrayCard
          title="Stats"
          idFieldName="statId"
          fieldRows={STAT_FIELD_ROWS}
          addLabel="Add stat"
          initialRows={stats}
        />

        {/* Second extraction expansion (serviceAreas/hours/offers/credentials/ctaLabel),
            ordered by the same risk logic as stats above: a wrong price is the worst thing
            on this page, so offers leads; ctaLabel is the lowest-stakes of the five (worst
            case it's just generic instead of theirs) so it trails. All four arrays are
            forced flagged: true regardless of AI confidence (structure-and-rewrite.ts) —
            unproven-against-real-data fields get a human's eyes before they ship, same as
            stats. */}
        <ArrayCard
          title="Offers"
          helpText="Priced offers/promotions — only ones with an actual price stated."
          idFieldName="offerId"
          fieldRows={OFFER_FIELD_ROWS}
          addLabel="Add offer"
          initialRows={offers}
        />
        <ArrayCard
          title="Credentials"
          helpText="Licenses, registrations, certifications explicitly stated on the site."
          idFieldName="credentialId"
          fieldRows={CREDENTIAL_FIELD_ROWS}
          addLabel="Add credential"
          initialRows={credentials}
        />
        <ArrayCard
          title="Hours"
          helpText="Opening hours / availability, as stated."
          idFieldName="hoursId"
          fieldRows={HOURS_FIELD_ROWS}
          addLabel="Add hours"
          initialRows={hours}
        />
        <ArrayCard
          title="Service areas"
          helpText="Suburbs/regions the business says it serves."
          idFieldName="serviceAreaId"
          fieldRows={SERVICE_AREA_FIELD_ROWS}
          addLabel="Add area"
          initialRows={serviceAreas}
        />
        <section className={CARD_CLASS}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Call to action</h3>
          <p className="mb-3 text-xs text-neutral-500">
            The site&rsquo;s own button label, in their words — used instead of a generic
            &quot;Get in touch&quot; when present.
          </p>
          <label className={LABEL_CLASS}>
            CTA label <ConfidenceBadge {...fieldFlags.ctaLabel} />
          </label>
          <input name="ctaLabel" defaultValue={ctaLabel ?? ""} placeholder="Book an appointment" className={INPUT_CLASS} />
        </section>

        <ArrayCard
          title="Differentiators"
          helpText={'"Why choose us" points — distinct from services.'}
          idFieldName="differentiatorId"
          fieldRows={DIFFERENTIATOR_FIELD_ROWS}
          addLabel="Add differentiator"
          initialRows={differentiators}
        />

        <ArrayCard
          title="Process"
          helpText={'"How it works" steps. Not every site has these — empty is normal.'}
          idFieldName="processId"
          fieldRows={PROCESS_FIELD_ROWS}
          addLabel="Add step"
          initialRows={process}
        />

        <ArrayCard
          title="Testimonials"
          idFieldName="testimonialId"
          fieldRows={TESTIMONIAL_FIELD_ROWS}
          addLabel="Add testimonial"
          initialRows={testimonials}
        />

        <ArrayCard
          title="FAQs"
          idFieldName="faqId"
          fieldRows={FAQ_FIELD_ROWS}
          addLabel="Add FAQ"
          initialRows={faqs}
        />

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
            confirmLabel="Approve & continue"
            variant="primary"
            pendingLabel="Approving..."
            className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
          >
            Approve & continue
          </ConfirmSubmitButton>
        </div>
      </form>

      <section className={CARD_CLASS}>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Logo &amp; images</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {mainImages.map((img) => (
            <ImageCard key={img.assetId} clientId={clientId} img={img} />
          ))}
          {mainImages.length === 0 && <p className="text-sm text-neutral-500">No images found on the crawled site.</p>}
        </div>
      </section>

      <section className={CARD_CLASS}>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Partner logos</h3>
        <p className="mb-3 text-xs text-neutral-500">
          Health-fund, insurer, or accreditation logos — shown as a trust strip, not the main photo gallery.
          Move an image here (or back) using the dropdown on its card if it was bucketed wrong.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {partnerLogoImages.map((img) => (
            <ImageCard key={img.assetId} clientId={clientId} img={img} />
          ))}
          {partnerLogoImages.length === 0 && (
            <p className="text-sm text-neutral-500">None detected.</p>
          )}
        </div>
      </section>
    </div>
  );
}
