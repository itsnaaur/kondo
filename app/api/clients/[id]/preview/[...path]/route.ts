import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: pathSegments } = await params;

  const generation = await prisma.generation.findFirst({
    where: { clientId: id, outputDir: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!generation?.outputDir) {
    return NextResponse.json({ error: "No generation available" }, { status: 404 });
  }

  const relPath = pathSegments.length > 0 ? pathSegments.join("/") : "index.html";
  const outputDirAbs = path.join(process.cwd(), generation.outputDir);
  const filePath = path.join(outputDirAbs, relPath);

  // Prevent escaping this generation's own output directory via a crafted path.
  if (!filePath.startsWith(outputDirAbs)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
