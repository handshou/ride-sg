# Security Fix: API Keys Server-Side Only

## Problem

Previously, the EXA API key was exposed to the client via `NEXT_PUBLIC_EXA_API_KEY`, which is a **security vulnerability**. Client-side environment variables are visible in the browser, allowing anyone to steal and abuse your API keys.

## Solution

Moved all API-dependent operations to **Next.js Server Actions**, keeping sensitive API keys secure on the server.

## Changes Made

### 1. Created Server Action (`src/lib/actions/search-actions.ts`)

```typescript
"use server";

export async function searchLandmarksAction(query: string) {
  // Runs on server, keeps API keys secure
  const results = await Effect.runPromise(runCoordinatedSearch(query));
  return { results };
}
```

### 2. Updated Config Service (`src/lib/services/config-service.ts`)

```typescript
// ❌ BEFORE (exposed to client)
export const exaApiKeyConfig = Effect.sync(
  () => process.env.NEXT_PUBLIC_EXA_API_KEY || process.env.EXA_API_KEY || "",
);

// ✅ AFTER (server-side only)
export const exaApiKeyConfig = Config.string("EXA_API_KEY").pipe(
  Config.withDefault(""),
  Config.withDescription(
    "Exa API key for semantic search - server-side only, never expose to client",
  ),
);
```

### 3. Updated Client Hook (`src/hooks/use-search-state.ts`)

```typescript
// ❌ BEFORE (direct Effect call, needed client-side API keys)
const results = await Effect.runPromise(runCoordinatedSearch(query));

// ✅ AFTER (server action, API keys stay secure)
const { results, error } = await searchLandmarksAction(query);
```

### 4. Updated Environment Variables

**`.env.local`:**
```bash
# ✅ Correct (server-side only)
EXA_API_KEY=4eacba4c-c298-4883-9d85-9ed7d54fec64

# ❌ Removed (was exposed to client)
# NEXT_PUBLIC_EXA_API_KEY=...
```

## Security Best Practices

### ✅ DO:
- Use **server actions** for API calls requiring secrets
- Keep API keys in **server-side environment variables** (no `NEXT_PUBLIC_` prefix)
- Use `"use server"` directive for server-only code
- Expose only **public configuration** with `NEXT_PUBLIC_` prefix (e.g., deployment URLs)

### ❌ DON'T:
- Expose API keys with `NEXT_PUBLIC_` prefix
- Make API calls from client components with sensitive keys
- Store secrets in client-side code or browser storage
- Commit `.env*` files to version control (except `.env.example`)

## Environment Variable Rules

| Variable | Type | Purpose | Exposed to Browser? |
|----------|------|---------|---------------------|
| `EXA_API_KEY` | Secret | Exa API authentication | ❌ No (server-only) |
| `MAPBOX_ACCESS_TOKEN` | Secret | Server-side geocoding | ❌ No (server-only) |
| `CONVEX_DEPLOYMENT` | Config | Convex deployment ID | ❌ No (server-only) |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Public | Client-side map display | ✅ Yes (public token) |
| `NEXT_PUBLIC_CONVEX_URL` | Public | Convex client connection | ✅ Yes (public URL) |

## How It Works Now

1. **User types search query** → Client component
2. **Client calls `searchLandmarksAction()`** → Server action (secure)
3. **Server action runs search** → Uses `EXA_API_KEY` (server-side only)
4. **Server geocodes results** → Uses `MAPBOX_ACCESS_TOKEN` (server-side only)
5. **Server saves to Convex** → Uses `CONVEX_DEPLOYMENT` (server-side only)
6. **Server returns results** → Client displays (no API keys exposed)

## Testing

All checks pass:
```bash
pnpm run check-all
✅ Lint: passed
✅ Type-check: passed  
✅ Tests: 31 passed
✅ Build: successful
```

## Deployment Notes

For Vercel/production:
- Set `EXA_API_KEY` as a **secret environment variable** (not public)
- Set `MAPBOX_ACCESS_TOKEN` as a **secret environment variable**
- Set `CONVEX_DEPLOYMENT` as a **secret environment variable**
- Only `NEXT_PUBLIC_*` variables should be visible in browser
- Use Vercel's environment variable settings to mark secrets as "Secret" type

## References

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

