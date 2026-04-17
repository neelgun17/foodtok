import { NextRequest, NextResponse } from "next/server";
import { extractSpotFromImages } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("images").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }
    if (files.length > 4) {
      return NextResponse.json({ error: "Max 4 images" }, { status: 400 });
    }

    const MAX_BYTES = 8 * 1024 * 1024;
    const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ error: `Image too large (max 8MB): ${f.name}` }, { status: 413 });
      }
      if (f.type && !ALLOWED.has(f.type)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${f.type}. Use JPEG, PNG, WebP, or GIF.` },
          { status: 415 },
        );
      }
    }

    const images = await Promise.all(
      files.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const mediaType = ALLOWED.has(file.type) ? file.type : "image/jpeg";
        return { mediaType, base64: buf.toString("base64") };
      }),
    );

    const extracted = await extractSpotFromImages(images);
    return NextResponse.json(extracted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("extract error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
