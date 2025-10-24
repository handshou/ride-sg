# E2E Tests: Mapbox WebGL Rendering Fix

## The Problem

When running Playwright e2e tests, the Mapbox map wasn't rendering - instead, tests would see a "wall of text" (raw HTML/CSS) and timeout waiting for map elements.

### Screenshot Example
Instead of a rendered map, Percy captured raw HTML/CSS text, making visual regression testing useless.

## Root Cause

**WebGL is not enabled by default in headless browsers.** Mapbox GL JS requires WebGL to render the map. Without WebGL, the JavaScript canvas rendering fails silently, and you only see the fallback HTML.

### What Was NOT the Problem

- ✅ **Environment variables were fine** - Next.js automatically loads `.env.local` when the dev server starts
- ✅ **Mapbox token was present** - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` from `.env.local` was available
- ✅ **Percy token was present** - `PERCY_TOKEN` from `.env.local` was available

## The Solution

Enable WebGL in Playwright's browser launch options for each browser engine:

### Chromium
```typescript
launchOptions: {
  args: [
    "--use-gl=swiftshader",      // Use software rendering
    "--enable-webgl",             // Enable WebGL
    "--enable-accelerated-2d-canvas", // Enable canvas acceleration
  ],
}
```

### Firefox
```typescript
launchOptions: {
  firefoxUserPrefs: {
    "webgl.force-enabled": true,
  },
}
```

### WebKit
WebKit (Safari) has WebGL enabled by default, no changes needed.

## Updated Configuration

See `playwright.config.ts` for the complete configuration. Key changes:

1. **Added WebGL flags** to Chromium and Firefox browser configs
2. **Removed redundant `webServer.env`** - Next.js handles `.env.local` automatically
3. **Added clarifying comments** about environment variable loading

## How to Verify

### Run e2e tests without Percy:
```bash
pnpm test:e2e
```

The map should now render properly, and tests should find map elements.

### Run visual tests with Percy:
```bash
# Ensure PERCY_TOKEN is in .env.local
pnpm test:visual
```

Percy should now capture rendered maps instead of raw HTML.

## Percy Snapshots

With WebGL enabled, Percy will capture:
- ✅ Rendered Mapbox map tiles
- ✅ Map controls and overlays
- ✅ Search UI and results
- ✅ Convex badges and indicators

## CI/CD Considerations

For GitHub Actions or other CI environments:
1. Ensure `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set as a secret
2. Ensure `PERCY_TOKEN` is set as a secret
3. WebGL flags will work in CI headless environments

## References

- [Mapbox GL JS WebGL Requirements](https://docs.mapbox.com/mapbox-gl-js/guides/install/#webgl-support)
- [Playwright Browser Launch Options](https://playwright.dev/docs/api/class-browsertype#browser-type-launch)
- [Percy Playwright Integration](https://www.browserstack.com/docs/percy/integrate/playwright)

