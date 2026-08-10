import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/lib/labels";
import { startAnalysis } from "@/lib/actions/analysis";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ContentReviewForm } from "@/components/ContentReviewForm";
import { ConceptHistoryList } from "@/components/ConceptHistoryList";
import type { ContentImage, FieldFlags } from "@/lib/content/types";

export default async function ClientWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      createdBy: true,
      contentRecord: { include: { reviewedBy: true } },
      assets: true,
      concepts: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
    },
  });

  if (!client) notFound();

  const { contentRecord } = client;
  const isAnalyzing = client.status === "ANALYZING";
  const analysisFailed = client.status === "ANALYSIS_FAILED";
  const isApproved = !!contentRecord?.reviewedAt;

  const images: (ContentImage & { url: string | null })[] = contentRecord
    ? ((contentRecord.images as unknown as ContentImage[] | null) ?? []).map((img) => ({
        ...img,
        url: client.assets.find((a) => a.id === img.assetId)?.url ?? null,
      }))
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">{client.name}</h1>
          <a
            href={client.siteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-neutral-500 hover:text-neutral-300 hover:underline"
          >
            {client.siteUrl}
          </a>
          <p className="mt-1 text-xs text-neutral-600">
            Added {client.createdAt.toLocaleDateString()}
            {client.createdBy?.email ? ` by ${client.createdBy.email}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
          {STATUS_LABEL[client.status] ?? client.status}
        </span>
      </div>

      {isAnalyzing && <AnalysisProgress clientId={client.id} />}

      {!isAnalyzing && !contentRecord && (
        <div className="rounded-xl border border-dashed border-neutral-800 px-6 py-12 text-center">
          {analysisFailed && (
            <p className="mb-4 text-sm text-red-400">
              The last analysis attempt failed — check the site URL is reachable and try again.
            </p>
          )}
          <p className="mb-4 text-sm text-neutral-400">
            Fetch this site&apos;s content, logo, and brand colours to get started.
          </p>
          <form action={startAnalysis.bind(null, client.id)}>
            <SubmitButton
              pendingLabel="Starting..."
              className="rounded-lg bg-yellow-400 px-6 py-3 font-medium text-neutral-900 transition hover:bg-yellow-300"
            >
              {analysisFailed ? "Retry analysis" : "Analyse Site"}
            </SubmitButton>
          </form>
        </div>
      )}

      {!isAnalyzing && contentRecord && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
            <p className="text-sm text-neutral-400">
              {analysisFailed
                ? "The last re-analysis failed — showing content from the last successful run."
                : isApproved
                  ? `Content approved${contentRecord.reviewedBy?.email ? ` by ${contentRecord.reviewedBy.email}` : ""} on ${contentRecord.reviewedAt!.toLocaleDateString()}.`
                  : "Review the extracted content below, then approve it to unlock Choose Template."}
            </p>
            <form action={startAnalysis.bind(null, client.id)}>
              <ConfirmSubmitButton
                confirmText="This re-crawls the site and replaces the current content record, including any edits you've made. Published concepts are unaffected."
                confirmLabel="Re-analyse site"
                variant="neutral"
                pendingLabel="Starting..."
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900"
              >
                Re-analyse site
              </ConfirmSubmitButton>
            </form>
          </div>

          {contentRecord.possibleExtractionCollapse && (
            <div className="rounded-lg border border-red-700/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              This extraction came back with almost nothing outside of services — testimonials, stats,
              FAQs, differentiators, and similar sections are empty despite a substantial amount of
              source text. That pattern has previously meant the extraction fell over, not that the
              site genuinely has none of this content. Worth checking the live site before approving,
              or trying Re-analyse Site.
            </div>
          )}

          {contentRecord.pagesAnalyzed < contentRecord.crawlPagesCount && (
            <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              Only {contentRecord.pagesAnalyzed} of {contentRecord.crawlPagesCount} crawled pages were
              actually read to produce this content — the rest were crawled but never analysed. Service
              or page detail that only lives on a page that wasn&apos;t read may be thin or missing below
              — worth a quick check against the live site before approving.
            </div>
          )}

          {isApproved ? (
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-6 py-5">
              <div>
                <p className="font-medium text-neutral-100">{contentRecord.businessName || client.name}</p>
                <p className="text-sm text-neutral-400">{contentRecord.tagline}</p>
              </div>
              <Link
                href={`/clients/${client.id}/templates`}
                className="rounded-lg bg-yellow-400 px-5 py-2.5 font-medium text-neutral-900 transition hover:bg-yellow-300"
              >
                Choose Template
              </Link>
            </div>
          ) : (
            <ContentReviewForm
              clientId={client.id}
              businessName={contentRecord.businessName}
              tagline={contentRecord.tagline}
              aboutCopy={contentRecord.aboutCopy}
              ctaLabel={contentRecord.ctaLabel}
              contactEmail={contentRecord.contactEmail}
              contactPhone={contentRecord.contactPhone}
              contactAddress={contentRecord.contactAddress}
              services={(contentRecord.services as never) ?? []}
              testimonials={(contentRecord.testimonials as never) ?? []}
              stats={(contentRecord.stats as never) ?? []}
              faqs={(contentRecord.faqs as never) ?? []}
              differentiators={(contentRecord.differentiators as never) ?? []}
              process={(contentRecord.process as never) ?? []}
              serviceAreas={(contentRecord.serviceAreas as never) ?? []}
              hours={(contentRecord.hours as never) ?? []}
              offers={(contentRecord.offers as never) ?? []}
              credentials={(contentRecord.credentials as never) ?? []}
              brandColors={(contentRecord.brandColors as never) ?? []}
              images={images}
              fieldFlags={((contentRecord.fieldFlags as unknown as FieldFlags | null) ?? {}) as FieldFlags}
            />
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Concept history</h2>
        {!isApproved && client.concepts.length > 0 && (
          <p className="mb-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-400">
            New extraction ready for review. Existing concepts below are unaffected.
          </p>
        )}
        <ConceptHistoryList
          clientId={client.id}
          concepts={client.concepts.map((c) => ({
            id: c.id,
            templateKey: c.templateKey,
            createdAt: c.createdAt,
            createdByEmail: c.createdBy?.email ?? null,
            publishSlug: c.publishSlug,
            publishStatus: c.publishStatus,
          }))}
        />
      </section>
    </main>
  );
}
