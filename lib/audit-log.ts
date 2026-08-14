import { prisma } from "@/lib/prisma";

export type AuditEvent =
  | "LOGIN"
  | "CLIENT_CREATED"
  | "CLIENT_TRASHED"
  | "CLIENT_DELETED"
  | "ANALYSIS_STARTED"
  | "ANALYSIS_FAILED"
  | "CONTENT_UPDATED"
  | "CONTENT_APPROVED"
  | "CONCEPT_GENERATED"
  | "CONCEPT_SECTION_EDITED"
  | "CONCEPT_PUBLISHED"
  | "CONCEPT_UNPUBLISHED"
  | "EXPORT_DOWNLOADED";

// Deliberately fire-and-log, not fire-and-throw: a logging failure should never break
// the actual action a user is trying to take. Never pass prompt text, generated HTML,
// or crawled content in metadata — logs are the least-protected place data lives (see
// the AuditLog model comment); metadata is for short, structured facts like a job id or
// a client status transition.
export async function logAuditEvent(
  event: AuditEvent,
  args: { userId?: string | null; clientId?: string | null; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event,
        userId: args.userId ?? null,
        clientId: args.clientId ?? null,
        metadata: args.metadata ? (args.metadata as never) : undefined,
      },
    });
  } catch (err) {
    console.error(`[audit-log] failed to record ${event}:`, err);
  }
}
