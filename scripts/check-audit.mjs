#!/usr/bin/env node
// Gate on `npm audit`, but don't let CI go permanently red over findings that have no
// available fix. `npm audit fix --force` for this repo's current findings would either
// downgrade next to 9.3.3 (pre-App-Router, would break the entire app) or bump eslint to
// a major version eslint-config-next's own bundled plugins don't yet support (--omit=dev
// below already drops that whole chain correctly, since it's real devDependency-only
// tooling never shipped to production).
//
// The remaining three findings (next, postcss, sharp) are all the same root cause:
// postcss/sharp bundled INSIDE next@16.2.12 itself (node_modules/next/node_modules/*),
// used only by Next's built-in image optimizer. Verified before accepting this:
//   - the app's own direct `sharp` dependency (used for crawled-image processing) is
//     already on a patched version, well above the vulnerable range;
//   - the app's only next/image usage anywhere renders one static local asset
//     (public/kondo-logo.png) — no crawled or uploaded image is ever routed through
//     Next's bundled, vulnerable copy.
// Re-run `npm audit --omit=dev --audit-level=high` (no wrapper) after any Next upgrade —
// if it passes clean, remove this file and the workflow step's use of it.
import { execSync } from "node:child_process";

const ACCEPTED = new Set(["next", "postcss", "sharp"]);

function runAudit() {
  try {
    execSync("npm audit --omit=dev --audit-level=high --json", { encoding: "utf8" });
    return { clean: true, report: null };
  } catch (err) {
    // npm audit exits non-zero both when it finds vulnerabilities (expected, has JSON on
    // stdout) and on a genuine execution failure (network, registry down, etc. — stdout
    // may not be valid JSON). Distinguish by attempting to parse.
    const stdout = err.stdout?.toString() ?? "";
    try {
      return { clean: false, report: JSON.parse(stdout) };
    } catch {
      console.error("npm audit failed to run (not a vulnerability report):");
      console.error(err.stdout?.toString() || err.message);
      process.exit(1);
    }
  }
}

const { clean, report } = runAudit();
if (clean) {
  console.log("npm audit: no high/critical findings outside devDependencies.");
  process.exit(0);
}

const vulnerabilities = report.vulnerabilities ?? {};
const unexpected = [];

for (const [pkg, info] of Object.entries(vulnerabilities)) {
  const nodes = info.nodes ?? [];
  const confinedToNextBundle = nodes.every(
    (p) => p === "node_modules/next" || p.startsWith("node_modules/next/node_modules/")
  );
  if (!ACCEPTED.has(pkg) || !confinedToNextBundle) {
    unexpected.push({ pkg, nodes, severity: info.severity });
  }
}

if (unexpected.length > 0) {
  console.error("npm audit found findings outside the accepted, documented set:");
  console.error(JSON.stringify(unexpected, null, 2));
  console.error(
    "\nIf this is a genuinely new finding, fix it or, if it's another confirmed " +
      "no-fix-available case, add it to ACCEPTED in scripts/check-audit.mjs with the same " +
      "kind of written justification as the existing entries — don't just widen the set silently."
  );
  process.exit(1);
}

console.log(
  `npm audit: ${Object.keys(vulnerabilities).length} finding(s), all within the documented, ` +
    "accepted next@16.2.12-bundled postcss/sharp issue (see comment at the top of this file)."
);
process.exit(0);
