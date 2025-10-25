# City Field Migration Guide

## Overview

This guide explains how to migrate existing locations in your Convex database to include the new `city` field using the automated migration scripts.

## Migration Scripts

The migration system provides three Convex actions:

1. **`previewLocationCitiesMigration`** - Dry run to preview changes
2. **`migrateLocationCities`** - Apply the migration
3. **`rollbackLocationCities`** - Undo the migration (emergency use only)

## Quick Start

### Step 1: Preview the Migration

Before making any changes, run the preview to see what will be updated:

**Via Convex Dashboard:**
1. Open [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Click **Functions** tab
4. Find `migrations:previewLocationCitiesMigration`
5. Click **Run** (no arguments needed)

**Via CLI:**
```bash
npx convex run migrations:previewLocationCitiesMigration
```

**Expected Output:**
```
🔍 Preview: Location city migration (dry run)
📊 Found 13 total locations

✏️  UPDATE: Gelora Bung Karno → jakarta [-6.227304, 106.79832]
✏️  UPDATE: PLQ 1 → singapore [1.317784, 103.893965]
...

📈 Preview Summary:
   Total locations: 13
   ✏️  Would update: 13
      🇸🇬 Singapore: 9
      🇮🇩 Jakarta: 4
   ⏭️  Would skip: 0

💡 To apply these changes, run: migrations:migrateLocationCities
```

### Step 2: Run the Migration

Once you've reviewed the preview and confirmed the changes look correct:

**Via Convex Dashboard:**
1. Open [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Click **Functions** tab
4. Find `migrations:migrateLocationCities`
5. Click **Run**

**Via CLI:**
```bash
npx convex run migrations:migrateLocationCities
```

**Expected Output:**
```
🚀 Starting location city migration...
📊 Found 13 total locations

✅ Updated Gelora Bung Karno → jakarta [-6.227304, 106.79832]
✅ Updated PLQ 1 → singapore [1.317784, 103.893965]
...

📈 Migration Summary:
   Total locations: 13
   ✅ Updated: 13
      🇸🇬 Singapore: 9
      🇮🇩 Jakarta: 4
   ⏭️  Skipped (already migrated): 0
   ❌ Errors: 0

✨ Migration complete!
```

### Step 3: Verify the Migration

Check the data using Convex MCP or dashboard:

```typescript
// Via Convex MCP
const locations = await ctx.runQuery(api.locations.getAllLocations, {
  city: "singapore"
});

// Should now return only Singapore locations
```

## How It Works

### City Detection Algorithm

The migration uses **geographic coordinate bounds** to detect cities:

```typescript
// Singapore bounds
latitude: 1.16 to 1.47
longitude: 103.6 to 104.0

// Jakarta bounds
latitude: -6.4 to -6.1
longitude: 106.68 to 107.0

// Unknown locations → default to "singapore"
```

### Migration Process

```
For each location in database:
  1. Check if `city` field already exists
     → If yes, skip (already migrated)

  2. Detect city from coordinates
     → Use geographic bounds check

  3. Update location with city field
     → Patch the document

  4. Log result
     → Track statistics
```

## Migration Features

### ✅ Idempotent

The migration is **safe to run multiple times**:
- Skips locations that already have a `city` field
- Won't overwrite existing values
- Perfect for incremental migrations

### 📊 Statistics Tracking

The migration tracks and returns:
- Total locations processed
- Updated count
- Singapore count
- Jakarta count
- Skipped count (already migrated)
- Errors (with details)

### 🔄 Resumable

If the migration fails partway through:
1. Some locations will have the `city` field
2. Others won't
3. Simply re-run the migration
4. It will skip the already-migrated ones and continue

## Advanced Usage

### Running Migration from Code

```typescript
import { api } from "../convex/_generated/api";

// Preview first
const preview = await client.action(
  api.migrations.previewLocationCitiesMigration,
  {}
);

console.log(`Will update ${preview.wouldUpdate} locations`);
console.log(`Singapore: ${preview.singaporeCount}`);
console.log(`Jakarta: ${preview.jakartaCount}`);

// If preview looks good, run migration
const result = await client.action(
  api.migrations.migrateLocationCities,
  {}
);

if (result.success) {
  console.log(`✅ Migrated ${result.updated} locations`);
} else {
  console.error(`❌ ${result.errors.length} errors occurred`);
  console.error(result.errors);
}
```

### Filtering by Migration Status

To find locations that still need migration:

```typescript
// Via Convex dashboard data explorer
// Filter: city = undefined

// Via query (all locations without city)
const unmigrated = await ctx.db
  .query("locations")
  .filter((q) => q.eq(q.field("city"), undefined))
  .collect();
```

## Rollback (Emergency Only)

⚠️ **WARNING:** Only use this if you need to completely undo the migration.

```bash
npx convex run migrations:rollbackLocationCities
```

**This will:**
- Remove the `city` field from ALL locations
- Cannot be undone without re-running the migration
- Should only be used in emergency scenarios

## Troubleshooting

### Issue: Migration shows 0 locations

**Cause:** No locations in database
**Solution:** Add some locations first, then run migration

### Issue: Preview shows different city than expected

**Cause:** Location coordinates are outside known bounds
**Solution:**
1. Check coordinates are correct
2. If valid, update bounds in `convex/migrations.ts:detectCityFromBounds`
3. Redeploy: `npx convex dev --once`

### Issue: Migration fails with "Function not found"

**Cause:** Migration functions not deployed
**Solution:**
```bash
npx convex dev --once
# Wait for "Convex functions ready!"
# Then try again
```

### Issue: Some locations marked wrong city

**Cause:** Coordinates at edge of bounds or incorrect
**Solution:**
1. Verify coordinates with: [https://www.latlong.net/](https://www.latlong.net/)
2. Manually fix incorrect locations:
   ```bash
   npx convex run locations:updateLocation '{
     "id": "j57...",
     "city": "singapore",
     ... other fields
   }'
   ```

### Issue: Migration stuck/timed out

**Cause:** Too many locations (>1000)
**Solution:** Modify migration to process in batches:

```typescript
// In convex/migrations.ts
const BATCH_SIZE = 100;
const locations = allLocations.slice(0, BATCH_SIZE);
// Process locations...
```

## Testing

### Unit Test Migration Logic

```typescript
import { detectCityFromBounds } from "../convex/migrations";

// Singapore coordinates
expect(detectCityFromBounds(1.3521, 103.8198)).toBe("singapore");

// Jakarta coordinates
expect(detectCityFromBounds(-6.2088, 106.8456)).toBe("jakarta");

// Unknown coordinates (defaults to singapore)
expect(detectCityFromBounds(0, 0)).toBe("singapore");
```

### Manual Verification

After migration, verify in Convex dashboard:

1. Go to **Data** tab
2. Click **locations** table
3. Check that `city` column exists
4. Spot-check a few Singapore locations
5. Spot-check a few Jakarta locations

## Migration Checklist

- [ ] Backup database (export via dashboard)
- [ ] Review coordinate bounds in migration code
- [ ] Run preview migration
- [ ] Verify preview results look correct
- [ ] Run actual migration
- [ ] Check migration summary (no errors)
- [ ] Verify data in dashboard
- [ ] Test queries with city filter
- [ ] Test cross-border navigation in app
- [ ] Confirm random button only shows city-specific locations

## Production Deployment

### Pre-Migration Steps

1. **Backup your data**
   ```bash
   # Via Convex dashboard:
   # Data → Export → Download JSON
   ```

2. **Deploy migration functions**
   ```bash
   npx convex deploy
   ```

3. **Run preview in production**
   ```bash
   npx convex run migrations:previewLocationCitiesMigration --prod
   ```

4. **Review preview carefully**

### Migration Steps

1. **Schedule maintenance window** (optional, migration is non-disruptive)

2. **Run migration**
   ```bash
   npx convex run migrations:migrateLocationCities --prod
   ```

3. **Monitor logs** in Convex dashboard

4. **Verify results** in production dashboard

### Post-Migration Steps

1. **Make city field required** (optional, after confirming all data migrated)
   ```typescript
   // In convex/schema.ts, change from:
   city: v.optional(v.union(v.literal("singapore"), v.literal("jakarta")))

   // To:
   city: v.union(v.literal("singapore"), v.literal("jakarta"))
   ```

2. **Deploy updated schema**
   ```bash
   npx convex deploy
   ```

## Performance

### Migration Speed

- **~10 locations/second** (depends on Convex plan)
- **100 locations** → ~10 seconds
- **1000 locations** → ~100 seconds

### Impact on Live App

- **Zero downtime** - migration runs as background action
- **No user disruption** - queries continue working
- **Optional field** - app works with or without city field during migration

## Code Reference

### Migration Files

- **Main migration:** `convex/migrations.ts`
- **Schema:** `convex/schema.ts:22`
- **Queries:** `convex/locations.ts:42,88,110`
- **Detection utility:** City detection uses coordinate bounds (no external API calls)

### Helper Functions

```typescript
// Detect city from coordinates (convex/migrations.ts:10)
function detectCityFromBounds(
  latitude: number,
  longitude: number,
): "singapore" | "jakarta"

// Update single location (convex/migrations.ts:40)
export const updateLocationCity = internalMutation({...})

// Preview migration (convex/migrations.ts:137)
export const previewLocationCitiesMigration = action({...})

// Run migration (convex/migrations.ts:65)
export const migrateLocationCities = action({...})

// Rollback migration (convex/migrations.ts:234)
export const rollbackLocationCities = action({...})
```

## FAQ

**Q: Will this break my app?**
A: No. The `city` field is optional during migration, and queries work with or without it.

**Q: How long does it take?**
A: ~1 second per 10 locations. Most migrations complete in under a minute.

**Q: Can I run it multiple times?**
A: Yes! The migration is idempotent and skips already-migrated locations.

**Q: What if coordinates are wrong?**
A: The migration uses geographic bounds, so incorrect coordinates will be detected as "unknown" and default to Singapore. You can manually fix these afterwards.

**Q: Do I need to stop my app?**
A: No. The migration runs in the background and doesn't affect live queries.

**Q: What if the migration fails?**
A: Check the error logs, fix the issue, and re-run. Already-migrated locations will be skipped.

**Q: Can I customize the city detection?**
A: Yes! Edit `detectCityFromBounds` in `convex/migrations.ts` to adjust bounds or add more cities.

## Support

For issues or questions:
- Check logs in Convex dashboard
- Review this guide's troubleshooting section
- Check the main [cross-border navigation docs](./cross-border-navigation.md)
