"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { checkUrlIsSafe } from "@/lib/security/ssrf";
import { requireUser } from "@/lib/auth/require-user";
import { clientNameSchema, siteUrlInputSchema } from "@/lib/validation/text-limits";
import { logAuditEvent } from "@/lib/audit-log";

export type CreateClientState = { error: string } | null;

// Add Client: just a name and a URL. Everything else — analysis, content, templates,
// concepts — happens later in the Client Workspace, not at creation time.
//
// Returns a state object rather than throwing on a validation/SSRF failure — this is by
// far the most common way to trip this action (a typo'd URL, a URL the SSRF blocklist
// correctly rejects), so it's wired to useActionState (app/(app)/clients/new/page.tsx)
// for an inline message next to the field instead of the full-page error boundary. A
// genuinely unexpected failure (requireUser(), the database write itself) still throws
// and falls through to app/(app)/error.tsx as before.
export async function createClient(_prevState: CreateClientState, formData: FormData): Promise<CreateClientState> {
  const user = await requireUser();

  const nameCheck = clientNameSchema.safeParse(formData.get("name"));
  if (!nameCheck.success) {
    return { error: "Client name is required and must be under 200 characters" };
  }
  const name = nameCheck.data;

  const siteUrlCandidate = siteUrlInputSchema.safeParse(formData.get("siteUrl"));
  if (!siteUrlCandidate.success) {
    return { error: "Site URL is required and must be under 2000 characters" };
  }
  const siteUrl = siteUrlCandidate.data;

  // Reject obviously-unsafe URLs at the point of input, before they ever reach the
  // crawler. Re-checked again at actual fetch time (DNS can change between now and
  // then), but failing fast here gives an immediate, clear error instead of a job that
  // silently fails deep in the pipeline.
  const siteUrlCheck = await checkUrlIsSafe(siteUrl);
  if (!siteUrlCheck.safe) {
    return { error: `Site URL is not allowed: ${siteUrlCheck.reason}` };
  }

  const client = await prisma.client.create({
    data: { name, siteUrl, createdByUserId: user.id },
  });

  // added_by/date_added cost nothing to store and answer "who's already contacted this
  // business" later — createdByUserId/createdAt are captured by the schema default and
  // the field above, not anything extra this action needs to do.
  await logAuditEvent("CLIENT_CREATED", { userId: user.id, clientId: client.id, metadata: { name } });

  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}`);
}
