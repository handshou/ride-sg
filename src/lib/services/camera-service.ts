import { Context, Effect, Layer } from "effect";

export type CameraOrientation = "portrait" | "landscape";

export interface CameraStreamOptions {
  orientation?: CameraOrientation;
  facingMode?: "user" | "environment";
}

export interface CameraService {
  startStream(
    options?: CameraStreamOptions,
  ): Effect.Effect<MediaStream, CameraError, never>;
  stopStream(stream: MediaStream): Effect.Effect<void, never, never>;
}

export class CameraError {
  constructor(
    public readonly code: string,
    public readonly message: string,
  ) {}
}

export class CameraServiceImpl implements CameraService {
  startStream(
    options: CameraStreamOptions = {
      orientation: "portrait", // Default to portrait mode
      facingMode: "environment",
    },
  ): Effect.Effect<MediaStream, CameraError, never> {
    return Effect.tryPromise({
      try: () => this.getMediaStream(options),
      catch: (error) => {
        if (error instanceof CameraError) {
          return error;
        }
        return new CameraError("UNKNOWN_ERROR", `Unknown error: ${error}`);
      },
    });
  }

  stopStream(stream: MediaStream): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    });
  }

  private async getMediaStream(
    options: CameraStreamOptions,
  ): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new CameraError(
        "NOT_SUPPORTED",
        "Camera access is not supported by this browser",
      );
    }

    const orientation = options.orientation || "portrait";
    const facingMode = options.facingMode || "environment";

    // Portrait: 1080x1920 (9:16 aspect ratio)
    // Landscape: 1920x1080 (16:9 aspect ratio)
    // Use ideal constraints for better mobile compatibility
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode,
        width: { ideal: orientation === "portrait" ? 1080 : 1920 },
        height: { ideal: orientation === "portrait" ? 1920 : 1080 },
      },
      audio: false,
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      // If the first attempt fails, try with simpler constraints
      console.warn(
        "Failed with ideal constraints, trying basic constraints",
        error,
      );
      let finalError = error;
      try {
        const basicConstraints: MediaStreamConstraints = {
          video: { facingMode },
          audio: false,
        };
        return await navigator.mediaDevices.getUserMedia(basicConstraints);
      } catch (fallbackError) {
        finalError = fallbackError;
      }
      if (finalError instanceof Error) {
        // Handle specific DOMException errors
        if (finalError.name === "NotAllowedError") {
          throw new CameraError(
            "PERMISSION_DENIED",
            "Camera access was denied by user",
          );
        }
        if (finalError.name === "NotFoundError") {
          throw new CameraError(
            "NOT_FOUND",
            "No camera device found on this device",
          );
        }
        if (finalError.name === "NotReadableError") {
          throw new CameraError(
            "NOT_READABLE",
            "Camera is already in use by another application",
          );
        }
        if (finalError.name === "OverconstrainedError") {
          throw new CameraError(
            "OVERCONSTRAINED",
            "Camera constraints could not be satisfied",
          );
        }
        throw new CameraError("MEDIA_ERROR", finalError.message);
      }
      throw new CameraError("UNKNOWN_ERROR", "Failed to access camera");
    }
  }
}

export const CameraServiceTag =
  Context.GenericTag<CameraService>("CameraService");

export const CameraServiceLive = Layer.succeed(
  CameraServiceTag,
  new CameraServiceImpl(),
).pipe(Layer.tap(() => Effect.logDebug("📷 CameraService initialized")));
