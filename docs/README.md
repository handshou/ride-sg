# ride-sg Documentation

Welcome to the ride-sg documentation! This directory contains comprehensive guides for understanding and working with the cross-border navigation system.

## 📚 Available Guides

### 🗺️ [Cross-Border Navigation System](./cross-border-navigation.md)
**Complete technical documentation** covering the entire cross-border navigation architecture.

**Topics covered:**
- Architecture overview
- City-based data segregation
- Automatic city detection
- Cross-border navigation logic
- User features (landing page, toggle button, GPS switching)
- Data flow diagrams
- API reference
- Testing guide
- Performance considerations
- Troubleshooting

**Best for:** Developers who want to understand how the system works end-to-end.

---

### 🚀 [Quick Reference Guide](./city-toggle-quick-reference.md)
**Fast lookup reference** for common tasks and debugging.

**Topics covered:**
- TL;DR summary
- Visual layout diagrams
- Component props reference
- Animation specifications
- Database query examples
- City detection bounds
- Common tasks cookbook
- Debugging tips
- Testing checklist
- CSS classes reference

**Best for:** Developers who need quick answers or are debugging specific issues.

---

### 🔄 [Migration Guide](./migration-guide.md)
**Step-by-step instructions** for migrating existing locations to include the `city` field.

**Topics covered:**
- Quick start guide
- How the migration works
- Preview mode (dry run)
- Running the migration
- Verification steps
- Advanced usage
- Rollback procedures
- Troubleshooting
- Production deployment
- Performance metrics

**Best for:** Anyone who needs to add the `city` field to existing database locations.

---

## 🎯 Quick Navigation

### I want to...

**...understand how cross-border navigation works**
→ Read [Cross-Border Navigation System](./cross-border-navigation.md)

**...migrate existing data to include city field**
→ Follow [Migration Guide](./migration-guide.md)

**...quickly look up how to do something**
→ Check [Quick Reference Guide](./city-toggle-quick-reference.md)

**...understand city detection**
→ See [Cross-Border Navigation System - City Detection](./cross-border-navigation.md#2-automatic-city-detection)

**...add a new city**
→ See [Quick Reference Guide - Add New City Page](./city-toggle-quick-reference.md#add-new-city-page)

**...debug toggle button not showing**
→ See [Quick Reference Guide - Debugging](./city-toggle-quick-reference.md#debugging)

**...customize animation duration**
→ See [Quick Reference Guide - Animation Specs](./city-toggle-quick-reference.md#animation-specs)

**...test the migration before applying it**
→ See [Migration Guide - Step 1: Preview](./migration-guide.md#step-1-preview-the-migration)

---

## 🏗️ System Architecture

```
User's Device
    ↓
┌─────────────────────────────────────────────┐
│  Next.js App (Client)                       │
│  ├── /singapore → SingaporeMapExplorer      │
│  ├── /jakarta → JakartaMapExplorer          │
│  └── CityToggleButton (bottom right)        │
└─────────────────────────────────────────────┘
    ↓                             ↓
┌──────────────────┐     ┌──────────────────┐
│  Mapbox API      │     │  Convex Database │
│  - Geocoding     │     │  - Locations     │
│  - Reverse Geo   │     │  - City filtering│
│  - Map rendering │     │  - Reactive      │
└──────────────────┘     └──────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Services (Effect.ts)                       │
│  ├── CrossBorderNavigationService           │
│  │   ├── detectCrossBorder()                │
│  │   ├── executeFlyTo()                     │
│  │   └── updateUrlWithoutNavigation()       │
│  └── MapNavigationService                   │
│      └── flyTo()                            │
└─────────────────────────────────────────────┘
```

---

## 🎨 Key Features

### 1. City Toggle Button 🇸🇬🇮🇩
- Bottom right corner flag emoji
- Click to switch cities
- 3.5s dramatic animation
- Updates URL with router.push()

### 2. Automatic City Detection 🌍
- Uses coordinate bounds
- Detects Singapore (1.16-1.47, 103.6-104.0)
- Detects Jakarta (-6.4 to -6.1, 106.68-107.0)
- Defaults to Singapore for unknown

### 3. Smart Navigation 🛫
- **Local:** 2.5s animation within same city
- **Cross-border:** 6.5s animation between cities
- **URL update:** Only for cross-border
- **Fallback:** Unknown locations treated as local

### 4. City-Filtered Data 🗃️
- Singapore page shows only Singapore locations
- Jakarta page shows only Jakarta locations
- Random button cycles through current city only
- All queries optimized with indexes

---

## 📖 Code References

### Key Files

| File | Purpose | Line |
|------|---------|------|
| `convex/schema.ts` | Database schema | 22 |
| `convex/locations.ts` | City-filtered queries | 42, 88, 110 |
| `convex/migrations.ts` | Migration scripts | All |
| `src/lib/utils/detect-location.ts` | City detection utility | 8 |
| `src/lib/services/cross-border-navigation-service.ts` | Cross-border logic | 165 |
| `src/components/city-toggle-button.tsx` | Toggle component | All |
| `src/components/singapore-map-explorer.tsx` | Singapore page | 112, 800 |
| `src/components/jakarta-map-explorer.tsx` | Jakarta page | 93, 717 |
| `src/app/page.tsx` | Root redirect | 9 |

### Important Functions

```typescript
// City detection
detectCityFromCoords(lat, lng, token): Promise<DetectedCity>

// Cross-border check
detectCrossBorder(coords, currentCity, token): Effect<{ detectedCity, isCrossBorder }>

// Navigation
executeFlyTo(map, coords, duration, isCrossBorder, isMobile): Effect<void>

// URL update
updateUrlWithoutNavigation(targetCity): Effect<void>

// Queries
getRandomizableLocations({ city }): Location[]
searchLocations({ query, city }): Location[]
getAllLocations({ city }): Location[]

// Mutations
saveLocation({ ...location, city }): LocationId
updateLocation({ id, ...updates, city }): LocationId

// Migrations
previewLocationCitiesMigration(): MigrationPreview
migrateLocationCities(): MigrationResult
rollbackLocationCities(): RollbackResult
```

---

## 🧪 Testing

### Manual Testing Checklist

```bash
# 1. Root page redirect
Visit /
→ Should redirect to /singapore automatically

# 2. City toggle
Click 🇮🇩 flag on /singapore
→ Should animate 3.5s to Jakarta
→ URL should become /jakarta
→ Browser back button should work

# 3. GPS location
Click "Locate Me" on /singapore
→ If in Singapore: 2.5s animation, stays on /singapore
→ If in Jakarta: 6.5s animation, switches to /jakarta

# 4. Random navigation
Click random button on /singapore
→ Should only show Singapore locations
→ Should not include Jakarta locations

# 5. Search cross-border
Search "Marina Bay Sands" on /jakarta page
→ Should fly to Singapore with 6.5s animation
→ URL should update to /singapore

# 6. Data migration
npx convex run migrations:previewLocationCitiesMigration
→ Should show preview of changes
→ Should detect cities correctly

npx convex run migrations:migrateLocationCities
→ Should update all locations
→ Should report statistics
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution | Reference |
|-------|----------|-----------|
| Toggle button not showing | Check `isMapReady` and map instance | [Quick Ref - Debugging](./city-toggle-quick-reference.md#verify-toggle-button-rendering) |
| Cross-border not triggering | Verify city detection works | [Cross-Border - Troubleshooting](./cross-border-navigation.md#issue-cross-border-animation-not-triggering) |
| Locations showing in wrong city | Run migration again | [Migration Guide - Troubleshooting](./migration-guide.md#issue-some-locations-marked-wrong-city) |
| Migration shows 0 locations | Check database has locations | [Migration Guide - Troubleshooting](./migration-guide.md#issue-migration-shows-0-locations) |
| "Function not found" error | Run `npx convex dev --once` | [Migration Guide - Troubleshooting](./migration-guide.md#issue-migration-fails-with-function-not-found) |

---

## 📊 Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| City detection | <100ms | Uses coordinate bounds (no API) |
| Local flyTo | 2.5s | Within same city |
| Cross-border flyTo | 6.5s | Between cities |
| City toggle flyTo | 3.5s | Manual switch |
| Migration speed | ~10 loc/sec | Depends on Convex plan |
| Query performance | <50ms | Uses indexes |

---

## 🚀 Deployment

### Initial Deployment
```bash
# 1. Deploy schema
npx convex deploy

# 2. Preview migration
npx convex run migrations:previewLocationCitiesMigration --prod

# 3. Run migration
npx convex run migrations:migrateLocationCities --prod

# 4. Verify
# Check Convex dashboard → Data → locations → city column
```

### Updates
```bash
# Update functions
npx convex deploy

# Update types
npx convex codegen

# Type check
pnpm run type-check

# Lint
pnpm biome check --write
```

---

## 🤝 Contributing

When making changes to the cross-border system:

1. **Update documentation** if behavior changes
2. **Run tests** (`pnpm test`)
3. **Type check** (`pnpm run type-check`)
4. **Lint** (`pnpm biome check --write`)
5. **Test migration** on dev deployment first
6. **Update this README** if adding new features

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-26 | Initial cross-border navigation system |
| 1.1.0 | 2025-01-26 | Added city toggle button |
| 1.2.0 | 2025-01-26 | Added automated migration scripts |

---

## 📞 Support

For questions or issues:
- Check the troubleshooting sections in each guide
- Review code references
- Check Convex logs in dashboard
- Open an issue on GitHub

---

## 🔗 External Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Effect.ts Documentation](https://effect.website/)
- [Next.js Documentation](https://nextjs.org/docs)
