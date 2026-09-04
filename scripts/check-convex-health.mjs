const convexDeploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexDeploymentUrl) {
  console.error(
    "Convex health check failed: NEXT_PUBLIC_CONVEX_URL is not configured",
  );
  process.exit(1);
}

let convexHealthUrl;
try {
  convexHealthUrl = new URL("/version", convexDeploymentUrl);
} catch {
  console.error(
    "Convex health check failed: NEXT_PUBLIC_CONVEX_URL is not a valid URL",
  );
  process.exit(1);
}

const requestController = new AbortController();
const requestTimeout = setTimeout(() => requestController.abort(), 5_000);
const requestStartedAt = performance.now();

try {
  const response = await fetch(convexHealthUrl, {
    signal: requestController.signal,
  });
  const durationMs = Math.round(performance.now() - requestStartedAt);

  if (!response.ok) {
    console.error(
      `Convex health check failed: /version returned HTTP ${response.status} in ${durationMs}ms`,
    );
    process.exit(1);
  }

  const deploymentKind = ["127.0.0.1", "localhost", "::1"].includes(
    convexHealthUrl.hostname,
  )
    ? "local"
    : "remote";
  console.log(
    `Convex health check passed: ${deploymentKind} deployment responded in ${durationMs}ms`,
  );
} catch (error) {
  const causeCode =
    error &&
    typeof error === "object" &&
    "cause" in error &&
    error.cause &&
    typeof error.cause === "object" &&
    "code" in error.cause
      ? String(error.cause.code)
      : undefined;
  const reason =
    causeCode ?? (error instanceof Error ? error.name : "unknown error");

  console.error(`Convex health check failed: ${reason}`);
  process.exit(1);
} finally {
  clearTimeout(requestTimeout);
}
