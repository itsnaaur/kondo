import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next's core-web-vitals bundles only 6 jsx-a11y rules (alt-text,
  // aria-props/proptypes, aria-unsupported-elements, role-has-required-aria-props,
  // role-supports-aria-props) — the full plugin ships 34. This adds the other 28
  // (label-has-associated-control, click-events-have-key-events, no-autofocus, and
  // friends) on top rather than replacing anything above. Only the `rules` object, not
  // the whole flatConfigs.recommended — that also carries its own `plugins: { "jsx-a11y":
  // ... }` registration, and flat config errors ("Cannot redefine plugin") if the same
  // plugin key is registered twice, which nextVitals above already does.
  { rules: jsxA11y.flatConfigs.recommended.rules },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
