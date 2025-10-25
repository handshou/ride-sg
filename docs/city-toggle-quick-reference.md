# City Toggle - Quick Reference Guide

## TL;DR

- Root `/` redirects to `/singapore`
- Each city page shows only its own locations (filtered by `city` field)
- Click flag emoji (🇸🇬/🇮🇩) in bottom right to switch cities
- GPS "Locate Me" auto-switches to correct city if cross-border
- New locations auto-detect city when saved

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│  [HowTo] [Style] [3D] [Random] [LocateMe] [Camera] │ ← Top left controls
│                                                     │
│                                                     │
│                    MAP VIEW                         │
│                                                     │
│                                                     │
│                                            [🇮🇩]   │ ← City toggle (bottom right)
└─────────────────────────────────────────────────────┘
```

## Component Props

### CityToggleButton

```typescript
interface CityToggleButtonProps {
  currentCity: "singapore" | "jakarta";  // Which city page we're on
  mapInstance: mapboxgl.Map | null;      // Map for flyTo
  isMobile: boolean;                      // Responsive zoom
}
```

**Usage:**
```tsx
{isMapReady && mapInstanceRef.current && (
  <CityToggleButton
    currentCity="singapore"
    mapInstance={mapInstanceRef.current}
    isMobile={isMobile}
  />
)}
```

## Animation Specs

| Action | Duration | Curve | Zoom (Desktop) | Zoom (Mobile) |
|--------|----------|-------|----------------|---------------|
| City Toggle | 3500ms | 1.8 | 12 | 9 |
| Cross-border GPS | 6500ms | 1.8 | 16 | 15 |
| Local GPS | 2500ms | 1.6 | 16 | 15 |

## State Flow

### Toggle Flow
```
User clicks flag emoji
    ↓
Set isTransitioning = true
    ↓
map.flyTo(targetCity.center, 3500ms)
    ↓
Wait for animation complete
    ↓
router.push(`/${targetCity}`)
    ↓
Set isTransitioning = false
```

### GPS Cross-Border Flow
```
User clicks Locate Me
    ↓
Get device coordinates
    ↓
Detect city via Mapbox
    ↓
If currentCity !== detectedCity:
  ├─ FlyTo with 6500ms animation
  └─ Update URL to correct city
Else:
  └─ FlyTo with 2500ms animation
```

## Database Query Examples

### Get Singapore Locations Only
```typescript
const locations = useQuery(api.locations.getRandomizableLocations, {
  city: "singapore"
});
```

### Get Jakarta Locations Only
```typescript
const locations = useQuery(api.locations.getRandomizableLocations, {
  city: "jakarta"
});
```

### Get All Locations (Both Cities)
```typescript
const locations = useQuery(api.locations.getRandomizableLocations, {
  // No city parameter = all locations
});
```

## City Detection

### Coordinate Bounds

```typescript
Singapore: {
  latitude: 1.16 to 1.47
  longitude: 103.6 to 104.0
}

Jakarta: {
  latitude: -6.4 to -6.1
  longitude: 106.68 to 107.0
}

Unknown: {
  // Anything outside above bounds
  // Defaults to "singapore"
}
```

### Detection Method

```typescript
// Uses Mapbox Reverse Geocoding API
const response = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,country`
);

// Checks response features for:
// - place_name includes "singapore" or "jakarta"
// - text includes city name
// - properties.short_code === "sg"
// - Falls back to coordinate bounds check
```

## Common Tasks

### Add New City Page

1. **Create route:** `src/app/[newcity]/page.tsx`
2. **Create explorer:** `src/components/newcity-map-explorer.tsx`
3. **Update schema:** Add `"newcity"` to union in `convex/schema.ts`
4. **Update detection:** Add bounds in `src/lib/utils/detect-location.ts`
5. **Update toggle:** Add to `CITY_CENTERS` and `CITY_FLAGS` in `city-toggle-button.tsx`

### Change Default Landing City

```typescript
// src/app/page.tsx
useEffect(() => {
  router.replace("/jakarta"); // Change to Jakarta
}, [router]);
```

### Customize Toggle Button Position

```typescript
// src/components/city-toggle-button.tsx
className="fixed bottom-4 right-4 z-10"
//             ↑        ↑      ↑
//          vertical horizontal z-index
```

### Disable Auto-Redirect on Root

```typescript
// Remove from src/app/page.tsx
// Show original city selection page instead
```

## Debugging

### Check Current City Detection

```typescript
// In browser console
const coords = { latitude: 1.3521, longitude: 103.8198 };
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?access_token=${token}`)
  .then(r => r.json())
  .then(data => console.log(data.features));
```

### Check Convex Data

```typescript
// In Convex dashboard, run query:
ctx.db.query("locations")
  .filter(q => q.eq(q.field("city"), "singapore"))
  .collect()
```

### Verify Toggle Button Rendering

```typescript
// In component
console.log({
  isMapReady,
  hasMapInstance: !!mapInstanceRef.current,
  shouldRenderToggle: isMapReady && !!mapInstanceRef.current
});
```

## Performance Tips

### Lazy Load City Data

```typescript
// Only fetch locations when tab is active
const locations = useQuery(
  isActive ? api.locations.getRandomizableLocations : skipToken,
  { city: "singapore" }
);
```

### Debounce Toggle Clicks

```typescript
const [lastToggle, setLastToggle] = useState(0);

const handleToggle = () => {
  if (Date.now() - lastToggle < 4000) return; // Min 4s between toggles
  setLastToggle(Date.now());
  // ... toggle logic
};
```

### Prefetch Target City Data

```typescript
// When hovering over toggle button
onMouseEnter={() => {
  router.prefetch(`/${targetCity}`);
}}
```

## Testing Checklist

### Basic Functionality
- [ ] Toggle button appears in bottom right
- [ ] Shows correct flag emoji (opposite city)
- [ ] Click triggers animation
- [ ] URL updates after animation
- [ ] Browser back button works
- [ ] Mobile responsive (smaller button)

### Cross-Border Navigation
- [ ] GPS in Singapore → stays on `/singapore` (2.5s)
- [ ] GPS in Jakarta from `/singapore` → switches to `/jakarta` (6.5s)
- [ ] Search Singapore location from `/jakarta` → cross-border
- [ ] Search Jakarta location from `/singapore` → cross-border

### Data Filtering
- [ ] Singapore page shows only Singapore locations
- [ ] Jakarta page shows only Jakarta locations
- [ ] New saves auto-detect correct city
- [ ] Random button cycles through current city only

### Edge Cases
- [ ] Toggle during existing animation
- [ ] Toggle with no internet connection
- [ ] Toggle with invalid map instance
- [ ] GPS with location services disabled
- [ ] Unknown location detection defaults to Singapore

## CSS Classes Reference

### Toggle Button Styling

```css
.city-toggle-button {
  /* Position */
  position: fixed;
  bottom: 1rem;      /* 16px */
  right: 1rem;       /* 16px */
  z-index: 10;

  /* Appearance */
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Size */
  font-size: 1.5rem;   /* Desktop: 24px */
  padding: 0.75rem 1rem;

  /* Mobile */
  @media (max-width: 640px) {
    font-size: 1.875rem; /* Mobile: 30px */
  }
}
```

## Environment Variables

Required for city detection:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

## Related Documentation

- [Cross-Border Navigation System](./cross-border-navigation.md) - Full technical documentation
- [Convex Schema Guide](../convex/schema.ts) - Database structure
- [Map Navigation Service](../src/lib/services/map-navigation-service.ts) - FlyTo implementations
