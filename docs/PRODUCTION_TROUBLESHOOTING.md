# Production Troubleshooting Guide

This guide helps you diagnose and fix common issues when your app works locally but fails in production (Vercel).

## Quick Checklist

Run through this checklist first:

- [ ] All environment variables are set in Vercel
- [ ] Build command is correct: `npx convex deploy && pnpm run build`
- [ ] Convex production deployment is successful
- [ ] API keys are valid and not expired
- [ ] No rate limits reached on external APIs

## Required Environment Variables in Vercel

Navigate to **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Critical Variables (Required)

| Variable | Where to Get It | Used For |
|----------|----------------|----------|
| `CONVEX_DEPLOY_KEY` | [Convex Dashboard](https://dashboard.convex.dev) → Settings → Generate Production Deploy Key | Convex deployment during build |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | [Mapbox Account](https://account.mapbox.com/access-tokens/) | Client-side map rendering |
| `MAPBOX_ACCESS_TOKEN` | [Mapbox Account](https://account.mapbox.com/access-tokens/) (same as above) | Server-side geocoding |

### Optional Variables (Feature-Specific)

| Variable | Where to Get It | Used For | Default |
|----------|----------------|----------|---------|
| `EXA_API_KEY` | [Exa.ai](https://exa.ai) → API Keys | Semantic search functionality | Empty (mock data) |
| `LTA_ACCOUNT_KEY` | [LTA DataMall](https://datamall.lta.gov.sg/) | Singapore bicycle parking data | Default key provided |

**Important:** Set variables for **Production**, **Preview**, and **Development** environments in Vercel.

## Common Production Issues

### 1. Map Not Loading

**Symptoms:**
- Blank map area
- Console error: "Invalid access token"
- Map style fails to load

**Diagnosis:**
```bash
# Check browser console for:
"Error: An API access token is required"
"Error: Bad token"
```

**Solution:**
1. Verify `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set in Vercel
2. Ensure token is **valid** and **not restricted** to localhost
3. Check token has required scopes:
   - `styles:read`
   - `fonts:read`
   - `sprites:read`
4. Redeploy after setting the variable

### 2. Search Functionality Not Working

**Symptoms:**
- Search returns no results
- "Mock data" appears in console logs
- Exa search skipped even with valid API key

**Diagnosis:**
```bash
# Check server logs in Vercel for:
"EXA_API_KEY not configured, using mock data"
"Found X results in Convex, skipping Exa search" # OLD: Sequential search
"Parallel search results: X from Convex, Y from Exa" # NEW: Parallel search
```

**Solution:**
1. Get an Exa API key from [exa.ai](https://exa.ai)
2. Add `EXA_API_KEY` to Vercel environment variables
3. Ensure `MAPBOX_ACCESS_TOKEN` is also set (required for geocoding Exa results)
4. Redeploy

**Note:** Without Exa API key, the app will use mock data for testing.

**Recent Fix (2025-10-19):**
The search strategy was changed from sequential (Convex → Exa) to parallel (Convex + Exa simultaneously). This ensures:
- Comprehensive results from both cached and fresh data
- No more skipping Exa when Convex has low-quality matches
- Results are deduplicated by title similarity (70%) and coordinate proximity (100m)
- Users manually save preferred results (no automatic saving)

### 3. Convex Database Not Connected

**Symptoms:**
- "Convex not configured" warnings
- Search results don't persist
- No caching of results

**Diagnosis:**
```bash
# Check console/logs for:
"Convex not configured, using mock database results"
"NEXT_PUBLIC_CONVEX_URL not configured"
```

**Solution:**
1. Verify `CONVEX_DEPLOY_KEY` is set in Vercel
2. Ensure build command is: `npx convex deploy && pnpm run build`
3. Check Convex deployment succeeded in build logs:
   ```bash
   ✓ Convex deployed successfully
   ```
4. Verify `NEXT_PUBLIC_CONVEX_URL` was automatically set by Convex
5. Redeploy if needed

### 4. Bicycle Parking Data Not Showing

**Symptoms:**
- No green dots on map
- Empty bicycle parking panel

**Diagnosis:**
```bash
# Check for:
"LTA_ACCOUNT_KEY not configured"
"Failed to fetch bicycle parking"
```

**Solution:**
1. If using custom LTA API key, add `LTA_ACCOUNT_KEY` to Vercel
2. Check LTA API rate limits (default key has limits)
3. Verify Singapore coordinates are being used
4. Check network tab for 403/429 errors from LTA API

### 5. Build Fails with Convex Import Errors

**Symptoms:**
```bash
Error: Cannot find module './convex/_generated/server'
Error: Cannot find module './convex/_generated/api'
```

**Diagnosis:**
The Convex deployment is failing or running concurrently with Next.js build.

**Solution:**
1. **Check Build Command in Vercel:**
   - Go to: **Settings → Build & Development Settings**
   - Should be: `npx convex deploy && pnpm run build`
   - NOT: `npx convex deploy --cmd 'pnpm run build'`

2. **Check Build Logs:**
   - Look for Convex deployment success message
   - Verify `_generated` files were created
   - Ensure no Convex schema errors

3. **Verify CONVEX_DEPLOY_KEY:**
   - Must be set in environment variables
   - Must be valid production key
   - Generate new key if expired

### 6. App Works in Preview but Not Production

**Symptoms:**
- Preview deployments work fine
- Production deployment fails or has issues

**Diagnosis:**
Different environment variables between Preview and Production.

**Solution:**
1. **Check Environment Variable Scopes in Vercel:**
   - Each variable should be set for: Production, Preview, Development
   - Click "Add Another" to set for all environments

2. **Common Mistakes:**
   - Only setting variables for "Production"
   - Using different API keys for different environments
   - Forgetting to set variables after adding new features

### 7. Noisy Console Logs in Production

**Symptoms:**
- Browser console filled with debug logs
- `[BicycleParkingOverlay] ...` messages everywhere
- Effect logs appearing in client-side

**Diagnosis:**
Production builds should have minimal client-side logging. Check browser console for:
```
[BicycleParkingOverlay] Effect triggered with 249 parking locations
[BicycleParkingOverlay] Setting up layers initially
timestamp=... level=INFO fiber=... message="..."
```

**Solution:**
All debug logging is now gated behind `NODE_ENV === "development"`:
- Development: Full verbose logging for debugging
- Production: Only critical errors logged to console
- Server logs (Effect logs) remain in Vercel logs

**Recent Fix (2025-10-19):**
Client-side console logs are now conditionally shown only in development mode. Production builds have clean browser consoles while server logs remain available in Vercel for debugging.

### 8. Dark/Light Theme Issues in Production

**Symptoms:**
- Theme doesn't switch properly
- Styles look broken in dark mode
- Flash of incorrect theme on load

**Diagnosis:**
Usually related to Tailwind CSS purging or theme provider setup.

**Solution:**
1. Verify theme provider is in root layout
2. Check Tailwind config includes all component paths
3. Clear Vercel cache and rebuild:
   - **Settings → General → Clear Cache**
4. Verify no CSS conflicts in production build

### 9. API Rate Limiting in Production

**Symptoms:**
- Features work initially then stop
- 429 errors in network tab
- "Too many requests" errors

**Diagnosis:**
```bash
# Check for HTTP 429 responses in:
- Mapbox API
- Exa API
- LTA DataMall API
```

**Solution:**
1. **Mapbox:**
   - Check usage at [Mapbox Account](https://account.mapbox.com/)
   - Upgrade plan if needed
   - Consider caching static map images

2. **Exa:**
   - Monitor API usage in Exa dashboard
   - Implement request caching (already done via Convex)
   - Upgrade plan if needed

3. **LTA DataMall:**
   - Default key has strict rate limits
   - Request your own API key for production
   - Implement aggressive caching (already done via Convex)

## Debugging Tools

### 1. Check Vercel Build Logs
```bash
# In Vercel Dashboard:
1. Go to Deployments
2. Click on failed/latest deployment
3. Check "Building" logs
4. Look for:
   - Convex deployment status
   - Environment variable warnings
   - Build errors
```

### 2. Check Vercel Function Logs
```bash
# In Vercel Dashboard:
1. Go to Deployments → Functions
2. Check real-time logs
3. Look for:
   - API errors
   - Missing environment variables
   - Runtime errors
```

### 3. Test API Keys Locally
```bash
# Test each API key in your terminal:

# Mapbox
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Singapore.json?access_token=YOUR_TOKEN"

# Exa (if you have a key)
curl -X POST "https://api.exa.ai/search" \
  -H "x-api-key: YOUR_EXA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

# LTA DataMall
curl "https://datamall2.mytransport.sg/ltaodataservice/BicycleParkingv2?Lat=1.3521&Long=103.8198" \
  -H "AccountKey: YOUR_LTA_KEY"
```

### 4. Compare Local vs Production Environment
```bash
# Check what's different:

# Local environment variables (.env.local):
cat .env.local

# Production (in Vercel Dashboard):
Settings → Environment Variables
```

## Vercel-Specific Configuration

### Correct Build Settings

**Framework Preset:** Next.js

**Build Command:**
```bash
npx convex deploy && pnpm run build
```

**Install Command:**
```bash
pnpm install
```

**Output Directory:** `.next` (default)

**Node Version:** 20.x (recommended)

### Turbopack in Production

The app uses Turbopack for faster builds:
```json
"build": "next build --turbopack"
```

This is supported in Next.js 15+ and works in Vercel.

## Step-by-Step Production Deployment

### First-Time Deployment

1. **Prepare Convex:**
   ```bash
   # Login to Convex
   npx convex login
   
   # Deploy Convex first to get production URL
   npx convex deploy --prod
   ```

2. **Get Deploy Key:**
   - Go to [Convex Dashboard](https://dashboard.convex.dev)
   - Navigate to project Settings
   - Click "Generate Production Deploy Key"
   - Copy the key

3. **Configure Vercel:**
   - Import your repository to Vercel
   - Set build command: `npx convex deploy && pnpm run build`
   - Add environment variables (see Required Variables above)
   - Deploy

4. **Verify Deployment:**
   - Check build logs for successful Convex deployment
   - Test map loading
   - Test search functionality
   - Test bicycle parking data

### Redeployment After Changes

```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys
# Monitor: https://vercel.com/your-project/deployments
```

## Emergency Fixes

### If Everything is Broken

1. **Rollback in Vercel:**
   - Go to Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Check Recent Changes:**
   ```bash
   git log --oneline -10
   ```

3. **Test Locally:**
   ```bash
   # Use production environment variables
   pnpm run build
   pnpm start
   ```

### If Build is Stuck/Failing

1. **Cancel Current Build:**
   - Go to deployment in Vercel
   - Click "Cancel Deployment"

2. **Clear Vercel Cache:**
   - Settings → General → Clear Cache
   - Redeploy

3. **Check Convex Status:**
   - Visit [Convex Dashboard](https://dashboard.convex.dev)
   - Verify your production deployment is healthy
   - Check for schema errors

## Getting Help

### 1. Check These First
- [ ] Read this troubleshooting guide
- [ ] Check Vercel build/function logs
- [ ] Verify all environment variables
- [ ] Test API keys manually
- [ ] Compare local vs production setup

### 2. Gather Debug Information
```bash
# Information to include when asking for help:
1. Vercel build logs (full output)
2. Browser console errors (with network tab)
3. Environment variables list (without values!)
4. Steps to reproduce
5. What works locally
6. What fails in production
```

### 3. Support Channels
- **Convex Issues:** [Convex Discord](https://convex.dev/community)
- **Vercel Issues:** [Vercel Support](https://vercel.com/support)
- **Mapbox Issues:** [Mapbox Support](https://support.mapbox.com/)
- **This Project:** GitHub Issues

## Monitoring Production

### Key Metrics to Watch

1. **Vercel Analytics:**
   - Response times
   - Error rates
   - Bandwidth usage

2. **Mapbox Usage:**
   - Map loads
   - Geocoding requests
   - API rate limits

3. **Convex Metrics:**
   - Query performance
   - Storage usage
   - Function errors

4. **User Experience:**
   - Map load time
   - Search response time
   - Bicycle parking data fetch time

### Set Up Alerts

1. **Vercel:**
   - Enable error notifications
   - Set up budget alerts

2. **Mapbox:**
   - Set usage alerts at 80% of limit
   - Monitor rate limit errors

3. **Convex:**
   - Enable error notifications
   - Monitor query performance

## Checklist Before Asking for Help

- [ ] Verified all environment variables are set
- [ ] Checked Vercel build logs
- [ ] Tested API keys manually
- [ ] Compared local vs production setup
- [ ] Cleared cache and redeployed
- [ ] Checked browser console for errors
- [ ] Verified Convex deployment is successful
- [ ] Confirmed production URL is accessible
- [ ] Checked for rate limiting issues
- [ ] Reviewed recent code changes

## Common Mistakes to Avoid

1. ❌ **Forgetting to set environment variables for all environments** (Production, Preview, Development)
2. ❌ **Using localhost-restricted API keys** in production
3. ❌ **Wrong build command** (concurrent instead of sequential Convex deploy)
4. ❌ **Committing `.env.local`** to Git (security risk)
5. ❌ **Not updating Convex schema** before deploying
6. ❌ **Using development Convex URL** in production
7. ❌ **Forgetting to redeploy** after changing environment variables
8. ❌ **Not testing in Preview** before promoting to Production

## Success Indicators

Your production deployment is working correctly when:

- ✅ Build completes successfully
- ✅ Convex deployment shows success in logs
- ✅ Map loads with satellite-streets view
- ✅ Search returns results (from Convex or Exa)
- ✅ Bicycle parking markers appear on map
- ✅ Theme switching works (light/dark)
- ✅ No console errors in browser
- ✅ API responses are fast (<2s)
- ✅ Toast notifications appear at bottom-center
- ✅ All interactive features work (clicks, hovers, flyTo)

---

**Last Updated:** 2025-10-19

For the most up-to-date deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

