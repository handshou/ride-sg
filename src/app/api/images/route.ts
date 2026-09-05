import { Effect, Schema } from "effect";
import { type NextRequest, NextResponse } from "next/server";
import { CapturedImageOrientationSchema } from "@/lib/repositories/captured-image-repository";
import { runServerEffectAsync } from "@/lib/server-runtime";
import { CapturedImageService } from "@/lib/services/captured-image-service";

/**
 * Largest upload accepted, in bytes. Phone captures are usually under 3 MB.
 * Kept under the 4.5 MB request body limit of Vercel serverless functions.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const OptionalNumberField = Schema.optional(Schema.NumberFromString);

/** Multipart form fields sent by the camera capture component. */
const UploadFieldsSchema = Schema.Struct({
  width: Schema.NumberFromString,
  height: Schema.NumberFromString,
  orientation: CapturedImageOrientationSchema,
  capturedAt: Schema.NumberFromString,
  latitude: OptionalNumberField,
  longitude: OptionalNumberField,
  cameraGpsLatitude: OptionalNumberField,
  cameraGpsLongitude: OptionalNumberField,
  deviceHeading: OptionalNumberField,
  cameraFov: OptionalNumberField,
});

/** Lists captured images, newest first. */
export async function GET() {
  try {
    const images = await runServerEffectAsync(
      Effect.flatMap(CapturedImageService, (service) => service.listImages()),
    );
    return NextResponse.json({ images });
  } catch (error) {
    console.error("Captured image list request failed", error);
    return NextResponse.json(
      { error: "Failed to load captured images" },
      { status: 500 },
    );
  }
}

/** Stores an uploaded image and its metadata. Expects multipart/form-data. */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Image upload requires multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Image upload requires a 'file' field" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes` },
      { status: 413 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Uploaded file must be an image" },
      { status: 415 },
    );
  }

  const rawFields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value !== "") rawFields[key] = value;
  }
  const fieldsResult =
    Schema.decodeUnknownEither(UploadFieldsSchema)(rawFields);
  if (fieldsResult._tag === "Left") {
    return NextResponse.json(
      { error: "Image upload metadata is invalid" },
      { status: 400 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = await runServerEffectAsync(
      Effect.flatMap(CapturedImageService, (service) =>
        service.uploadImage(file.type, bytes, fieldsResult.right),
      ),
    );
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Captured image upload failed", error);
    return NextResponse.json(
      { error: "Failed to store captured image" },
      { status: 500 },
    );
  }
}
