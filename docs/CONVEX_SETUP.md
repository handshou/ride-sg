# Setting Up Convex for Ride-SG

This guide will help you set up Convex so search results are saved to the database.

## Quick Setup (5 minutes)

### Step 1: Initialize Convex

```bash
# Make sure you're in the project directory
cd /Users/h/g/cursor-hack/ride-sg/main

# Initialize Convex (this will create .env.local with your deployment URL)
npx convex dev
```

When you run `npx convex dev`, it will:
1. Ask you to sign up/login to Convex (free account)
2. Create a new Convex project
3. Generate `_generated` files
4. Create `.env.local` with your `NEXT_PUBLIC_CONVEX_URL`

### Step 2: Verify .env.local was created

Check that `.env.local` exists and contains:
```bash
cat .env.local
```

You should see:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Step 3: Add your API keys

Copy `.env.example` to `.env.local` (or add to existing):
```bash
# Add your API keys to .env.local
echo "MAPBOX_ACCESS_TOKEN=your_mapbox_token_here" >> .env.local
echo "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here" >> .env.local
echo "EXA_API_KEY=your_exa_api_key_here" >> .env.local
```

### Step 4: Run the app

In one terminal, keep Convex running:
```bash
npx convex dev
```

In another terminal, start Next.js:
```bash
pnpm run dev
```

### Step 5: Test the search

1. Open http://localhost:3000
2. Search for "marina" or any Singapore landmark
3. Results will be saved to Convex!
4. Search again - results will come from Convex cache (faster!)

## Verify It's Working

Check the logs when you search:

**Before Convex setup:**
```
❌ "Convex not configured, skipping database save"
❌ "Mock save location"
```

**After Convex setup:**
```
✅ "Saving location to Convex: Marina Bay Sands"
✅ "Successfully saved location to Convex: Marina Bay Sands"
```

## View Your Data

Open the Convex dashboard:
```bash
npx convex dashboard
```

Or visit: https://dashboard.convex.dev

You'll see your `locations` table with all saved search results!

## Troubleshooting

### "Cannot find module './_generated/server'"

Run: `npx convex dev` to generate the files

### "Convex client not available"

Make sure `NEXT_PUBLIC_CONVEX_URL` is in `.env.local` and restart the dev server

### Environment variables not loading

1. Make sure `.env.local` exists (not `.env`)
2. Restart your Next.js dev server
3. Check the file contains `NEXT_PUBLIC_CONVEX_URL=...`

## Where to Get API Keys

- **Mapbox**: https://account.mapbox.com/access-tokens/
- **Exa AI**: https://exa.ai/
- **Convex**: Automatically created when you run `npx convex dev`

## Production Deployment

See `DEPLOYMENT.md` for deploying to Vercel with Convex.
