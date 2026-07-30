// Templates are built via plain string interpolation, not JSX (react-dom/server can't be
// imported anywhere in Next 16's Server Component/Route Handler/Server Action module
// graph — confirmed live: Turbopack rejects the build even through a "use server" action
// reference). That means escaping is now this file's job, not React's — every piece of
// crawled-site or AI-produced text interpolated into a template must go through this
// before it reaches the HTML string, since the /p/[slug] route serves the result to an
// unauthenticated prospect with no other sanitization layer in between.
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
