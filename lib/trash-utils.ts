export const TRASH_RETENTION_DAYS = 30;

export function daysUntilPurge(deletedAt: Date): number {
  const purgeAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((purgeAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
