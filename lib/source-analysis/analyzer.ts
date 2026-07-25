import path from "path";
import { readFile, readdir, mkdir } from "fs/promises";
import AdmZip from "adm-zip";
import { tallyTop } from "@/lib/audit-common";

const TEXT_FILE_EXT = /\.(html?|css|scss|less)$/i;
const HTML_EXT = /\.html?$/i;
const CSS_EXT = /\.(css|scss|less)$/i;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "vendor", ".vercel"]);

const ANIMATION_DEP_HINTS: Record<string, string> = {
  gsap: "GSAP",
  aos: "AOS (animate on scroll)",
  "wow.js": "WOW.js",
  scrollmagic: "ScrollMagic",
  "animate.css": "Animate.css",
  "framer-motion": "Framer Motion",
};

const FRAMEWORK_DEP_HINTS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  "@angular/core": "Angular",
  svelte: "Svelte",
  gatsby: "Gatsby",
};

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractColorsAndFonts(text: string) {
  const colors = text.match(/#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) ?? [];
  const fonts: string[] = [];
  const fontRegex = /font-family\s*:\s*([^;]+);/gi;
  let m;
  while ((m = fontRegex.exec(text))) {
    fonts.push(m[1].trim());
  }
  return { colors, fonts };
}

export async function analyzeProjectArchive(archivePath: string, extractDir: string) {
  await mkdir(extractDir, { recursive: true });
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(extractDir, true);

  const files = await walk(extractDir);

  const allColors: string[] = [];
  const allFonts: string[] = [];
  const contentInventory: Array<{ url: string; title: string }> = [];
  const textSamples: string[] = [];
  const animationLibs = new Set<string>();
  const frameworks = new Set<string>();
  let formsDetected = false;

  for (const file of files) {
    const rel = path.relative(extractDir, file);

    if (path.basename(file) === "package.json") {
      try {
        const pkg = JSON.parse(await readFile(file, "utf-8"));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const dep of Object.keys(deps)) {
          if (ANIMATION_DEP_HINTS[dep]) animationLibs.add(ANIMATION_DEP_HINTS[dep]);
          if (FRAMEWORK_DEP_HINTS[dep]) frameworks.add(FRAMEWORK_DEP_HINTS[dep]);
        }
      } catch {
        // malformed or non-JSON package.json — skip
      }
      continue;
    }

    if (!TEXT_FILE_EXT.test(file)) continue;
    const content = await readFile(file, "utf-8").catch(() => "");

    if (HTML_EXT.test(file)) {
      const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
      contentInventory.push({ url: rel, title: titleMatch?.[1]?.trim() || rel });
      if (/<form[\s>]/i.test(content)) formsDetected = true;
      if (textSamples.length < 3) textSamples.push(stripHtmlToText(content));
    }

    if (HTML_EXT.test(file) || CSS_EXT.test(file)) {
      const { colors, fonts } = extractColorsAndFonts(content);
      allColors.push(...colors);
      allFonts.push(...fonts);
    }
  }

  const platform =
    frameworks.size > 0 ? [...frameworks].join(", ") : "Static HTML/CSS (no framework detected)";

  return {
    technical: {
      platform,
      pageBuilders: [] as string[],
      formsDetected,
      pagesCrawled: contentInventory.length,
      crawlTruncated: false,
    },
    visualDesign: {
      colorPalette: tallyTop(allColors, 6),
      backgroundPalette: [] as Array<{ value: string; count: number }>,
      typography: tallyTop(allFonts, 5),
    },
    motionInteraction: {
      animationLibraries: [...animationLibs],
      scrollRevealDetected: animationLibs.size > 0,
    },
    contentInventory,
    contentSample: textSamples.join("\n\n").slice(0, 6000),
  };
}
