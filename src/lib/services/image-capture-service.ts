import { Context, Effect, Layer } from "effect";

export interface CapturedImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  timestamp: number;
}

export interface ImageCaptureService {
  captureFromStream(
    stream: MediaStream,
    quality?: number,
  ): Effect.Effect<CapturedImage, ImageCaptureError, never>;
  resizeImage(
    dataUrl: string,
    maxWidth: number,
    maxHeight: number,
  ): Effect.Effect<string, ImageCaptureError, never>;
}

export class ImageCaptureError {
  constructor(
    public readonly code: string,
    public readonly message: string,
  ) {}
}

export class ImageCaptureServiceImpl implements ImageCaptureService {
  captureFromStream(
    stream: MediaStream,
    quality = 0.95,
  ): Effect.Effect<CapturedImage, ImageCaptureError, never> {
    return Effect.tryPromise({
      try: () => this.capture(stream, quality),
      catch: (error) => {
        if (error instanceof ImageCaptureError) {
          return error;
        }
        return new ImageCaptureError(
          "CAPTURE_FAILED",
          `Failed to capture image: ${error}`,
        );
      },
    });
  }

  resizeImage(
    dataUrl: string,
    maxWidth: number,
    maxHeight: number,
  ): Effect.Effect<string, ImageCaptureError, never> {
    return Effect.tryPromise({
      try: () => this.resize(dataUrl, maxWidth, maxHeight),
      catch: (error) => {
        if (error instanceof ImageCaptureError) {
          return error;
        }
        return new ImageCaptureError(
          "RESIZE_FAILED",
          `Failed to resize image: ${error}`,
        );
      },
    });
  }

  private async capture(
    stream: MediaStream,
    quality: number,
  ): Promise<CapturedImage> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new ImageCaptureError("NO_VIDEO_TRACK", "No video track found");
    }

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    // Wait for video to be ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video
          .play()
          .then(() => resolve())
          .catch(reject);
      };
      video.onerror = () =>
        reject(
          new ImageCaptureError("VIDEO_ERROR", "Failed to load video stream"),
        );
    });

    // Get video dimensions
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
      throw new ImageCaptureError(
        "INVALID_DIMENSIONS",
        "Video has invalid dimensions",
      );
    }

    // Create canvas and capture frame
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new ImageCaptureError(
        "CANVAS_ERROR",
        "Failed to get canvas context",
      );
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Convert to blob and data URL
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else
            reject(
              new ImageCaptureError(
                "BLOB_CONVERSION_FAILED",
                "Failed to convert canvas to blob",
              ),
            );
        },
        "image/jpeg",
        quality,
      );
    });

    // Clean up
    video.pause();
    video.srcObject = null;

    return {
      dataUrl,
      blob,
      width,
      height,
      timestamp: Date.now(),
    };
  }

  private async resize(
    dataUrl: string,
    maxWidth: number,
    maxHeight: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(
            new ImageCaptureError(
              "CANVAS_ERROR",
              "Failed to get canvas context",
            ),
          );
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => {
        reject(
          new ImageCaptureError("IMAGE_LOAD_ERROR", "Failed to load image"),
        );
      };
      img.src = dataUrl;
    });
  }
}

export const ImageCaptureServiceTag = Context.GenericTag<ImageCaptureService>(
  "ImageCaptureService",
);

export const ImageCaptureServiceLive = Layer.succeed(
  ImageCaptureServiceTag,
  new ImageCaptureServiceImpl(),
).pipe(Layer.tap(() => Effect.logDebug("📸 ImageCaptureService initialized")));
