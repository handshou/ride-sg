"use client";

import { Schema } from "effect";
import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/client-logger";
import {
  type CapturedImageRecord,
  CapturedImageRecordSchema,
  type CreateCapturedImageInput,
} from "@/lib/repositories/captured-image-repository";

const CapturedImagesResponseSchema = Schema.Struct({
  images: Schema.Array(CapturedImageRecordSchema),
});

const CapturedImageResponseSchema = Schema.Struct({
  image: CapturedImageRecordSchema,
});

/** Browser event emitted after captured image data changes. */
export const CAPTURED_IMAGES_CHANGED_EVENT = "ride-sg:captured-images-changed";

/** Notifies image hooks to refresh after an upload, analysis, or delete. */
export function notifyCapturedImagesChanged(): void {
  window.dispatchEvent(new Event(CAPTURED_IMAGES_CHANGED_EVENT));
}

/** Metadata sent with an upload. The server assigns id, blob, and URL. */
export type UploadCapturedImageFields = Omit<
  CreateCapturedImageInput,
  "blobId"
>;

/** Uploads image bytes plus metadata through the images API. */
export async function uploadCapturedImage(
  file: Blob,
  fields: UploadCapturedImageFields,
): Promise<CapturedImageRecord> {
  const formData = new FormData();
  formData.append("file", file, "capture");
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Image upload returned HTTP ${response.status}`);
  }

  const payload = Schema.decodeUnknownSync(CapturedImageResponseSchema)(
    await response.json(),
  );
  notifyCapturedImagesChanged();
  return payload.image;
}

/** Deletes a captured image through the images API. */
export async function deleteCapturedImage(id: string): Promise<void> {
  const response = await fetch(`/api/images/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Image delete returned HTTP ${response.status}`);
  }
  notifyCapturedImagesChanged();
}

/**
 * Loads captured images without exposing a database client to React.
 *
 * Refreshes on the change event and on a slow poll so analysis results
 * finished by server actions show up without a reload.
 */
export function useCapturedImages():
  | ReadonlyArray<CapturedImageRecord>
  | undefined {
  const [images, setImages] = useState<
    ReadonlyArray<CapturedImageRecord> | undefined
  >(undefined);

  const refreshImages = useCallback(async () => {
    try {
      const response = await fetch("/api/images");
      if (!response.ok) {
        throw new Error(`Image list returned HTTP ${response.status}`);
      }
      const payload = Schema.decodeUnknownSync(CapturedImagesResponseSchema)(
        await response.json(),
      );
      setImages(payload.images);
    } catch (error) {
      logger.error("Captured image refresh failed", error);
      setImages((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refreshImages();

    const refresh = () => void refreshImages();
    window.addEventListener(CAPTURED_IMAGES_CHANGED_EVENT, refresh);
    const pollingInterval = window.setInterval(refresh, 30_000);

    return () => {
      window.removeEventListener(CAPTURED_IMAGES_CHANGED_EVENT, refresh);
      window.clearInterval(pollingInterval);
    };
  }, [refreshImages]);

  return images;
}
