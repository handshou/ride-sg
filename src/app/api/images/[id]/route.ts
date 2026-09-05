import { Effect } from "effect";
import { NextResponse } from "next/server";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { CapturedImageService } from "@/lib/services/captured-image-service";

type RouteContext = { params: Promise<{ id: string }> };

/** Returns one captured image's metadata. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const image = await runServerEffectAsync(
      Effect.flatMap(CapturedImageService, (service) => service.getImage(id)),
    );
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    return NextResponse.json({ image });
  } catch (error) {
    console.error("Captured image lookup failed", error);
    return NextResponse.json(
      { error: "Failed to load captured image" },
      { status: 500 },
    );
  }
}

/** Deletes a captured image and its stored bytes. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    await runServerEffectAsync(
      Effect.flatMap(CapturedImageService, (service) =>
        service.deleteImage(id),
      ),
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Captured image delete failed", error);
    return NextResponse.json(
      { error: "Failed to delete captured image" },
      { status: 500 },
    );
  }
}
