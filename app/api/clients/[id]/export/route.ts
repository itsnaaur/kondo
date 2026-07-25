import { NextResponse } from "next/server";
import path from "path";
import { mkdir, readFile, stat } from "fs/promises";
import AdmZip from "adm-zip";
import { prisma } from "@/lib/prisma";
import { clientExportDir } from "@/lib/storage";

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const generation = await prisma.generation.findFirst({
    where: { clientId: id, outputDir: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!generation?.outputDir) {
    return NextResponse.json({ error: "No generation available to export" }, { status: 404 });
  }

  const isWordPressTransfer = client.intent === "WORDPRESS_TRANSFER";
  const slug = slugify(client.name);

  const exportDir = clientExportDir(id);
  await mkdir(exportDir, { recursive: true });
  const zipPathAbs = path.join(exportDir, `${generation.id}.zip`);

  const alreadyBuilt = await stat(zipPathAbs).then(() => true).catch(() => false);

  if (!alreadyBuilt) {
    const zip = new AdmZip();
    const outputDirAbs = path.join(process.cwd(), generation.outputDir);
    // WordPress's "Upload Theme" uploader expects the zip to contain a single folder
    // (matching the theme) rather than loose files at the zip root.
    zip.addLocalFolder(outputDirAbs, isWordPressTransfer ? slug : undefined);
    zip.writeZip(zipPathAbs);

    await prisma.generation.update({
      where: { id: generation.id },
      data: { zipPath: path.relative(process.cwd(), zipPathAbs) },
    });
  }

  const data = await readFile(zipPathAbs);
  const filename = `${slug}-${isWordPressTransfer ? "theme" : "facelift"}.zip`;

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
