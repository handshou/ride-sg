import { Effect } from "effect";
import { NextResponse } from "next/server";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { CapturedImageService } from "@/lib/services/captured-image-service";

type RouteContext = { params: Promise<{ id: string }> };

/** Serves the raw bytes of a captured image. Bytes never change, so cache hard. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const blob = await runServerEffectAsync(
      Effect.flatMap(CapturedImageService, (service) =>
        service.getImageBlob(id),
      ),
    );
    if (!blob) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    return new NextResponse(Buffer.from(blob.bytes), {
      status: 200,
      headers: {
        "Content-Type": blob.contentType,
        "Content-Length": String(blob.bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Captured image blob request failed", error);
    return NextResponse.json(
      { error: "Failed to load image bytes" },
      { status: 500 },
    );
  }
}
