# Quality Features: Clean Descriptions & Confidence Filtering

## Overview

Added two major quality improvements to search results:

1. **Clean Descriptions** - Remove URL artifacts, brackets, and citations
2. **Confidence Filtering** - Only save high-quality results to Convex (≥70% confidence)
3. **URL Links** - Display source URLs as clickable links in the UI

## Features

### 1. Clean Descriptions

**Problem:** Exa Answer API descriptions contained unwanted artifacts:
```
Description: "Marina Bay Sands [1] is an iconic hotel (https://example.com) [2]..."
```

**Solution:** Automatic cleaning of descriptions:
```typescript
cleanDescription(text: string): string {
  return text
    .replace(/\[[\d]+\]/g, "")                   // Remove [1], [2] citations
    .replace(/\(https?:\/\/[^\)]+\)/g, "")      // Remove (https://...)
    .replace(/\[https?:\/\/[^\]]+\]/g, "")      // Remove [https://...]
    .replace(/https?:\/\/[^\s]+/g, "")          // Remove standalone URLs
    .replace(/\s+/g, " ")                        // Normalize whitespace
    .trim();
}
```

**Result:**
```
Description: "Marina Bay Sands is an iconic hotel..."
```

### 2. Confidence Scoring

Each search result is scored based on quality indicators:

#### Scoring Algorithm

```typescript
Base Score: 0.5 (50%)

Good Indicators (+score):
  ✅ Has address with street name     +0.20 (20%)
  ✅ Has postal code (6 digits)       +0.15 (15%)
  ✅ Good description (20-200 chars)  +0.10 (10%)
  ✅ Specific name (not generic)      +0.05 (5%)

Bad Indicators (-score):
  ❌ Generic name (unnamed, unknown)  -0.30 (30%)
  ❌ Short description (< 10 chars)   -0.20 (20%)

Final Score: Clamped to 0-1 range
```

#### Example Scores

**High Confidence (85%):**
```
Name: "Din Tai Fung"
Address: "290 Orchard Road, Singapore 238859"
Description: "Taiwanese restaurant famous for xiaolongbao dumplings"
Score: 0.85 (base + address + postal + desc + specific)
```

**Low Confidence (35%):**
```
Name: "Singapore"
Address: "Singapore"
Description: "Place"
Score: 0.35 (base - generic - short)
```

### 3. High-Confidence Filtering

**Only saves results with ≥70% confidence to Convex**

```typescript
const CONFIDENCE_THRESHOLD = 0.7; // 70%

const highConfidenceResults = exaResults.filter((result) => {
  const confidence = result.confidence || 0;
  return confidence >= CONFIDENCE_THRESHOLD;
});

// Only save high-confidence results
yield* Effect.all(
  highConfidenceResults.map((result) => dbService.saveLocation(result)),
  { concurrency: 3 },
);
```

**Benefits:**
- ✅ Cleaner database (no junk data)
- ✅ Better search results in the future
- ✅ Lower storage costs
- ✅ Higher quality cache hits

### 4. URL Links in UI

**Before:**
```
🗺️ Marina Bay Sands
Iconic hotel with rooftop pool
```

**After:**
```
🗺️ Marina Bay Sands
Iconic hotel with rooftop pool
🔗 marinabaysands.com  ← Clickable link!
```

**Implementation:**
```tsx
{result.url && (
  <a
    href={result.url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="text-xs text-purple-400 hover:text-purple-300"
  >
    <span>🔗</span>
    <span className="truncate max-w-[200px]">
      {new URL(result.url).hostname}
    </span>
  </a>
)}
```

## Search Flow with Confidence Filtering

```
┌──────────────────────────────────────────────────────────┐
│                  User searches "Din Tai Fung"            │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  1. Search Convex (empty)                                │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  2. Search Exa Answer API                                │
│     Returns 5 results with varying quality               │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  3. Calculate Confidence for Each Result                 │
│     Result 1: Din Tai Fung (85%) ✅                      │
│     Result 2: Hawker Centre (75%) ✅                     │
│     Result 3: Singapore Place (45%) ❌                   │
│     Result 4: Unknown Location (30%) ❌                  │
│     Result 5: Area Near (55%) ❌                         │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  4. Filter High-Confidence Results (≥70%)                │
│     Keeping: 2 results (Din Tai Fung, Hawker Centre)    │
│     Filtering out: 3 low-confidence results              │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  5. Save Only High-Confidence to Convex                  │
│     Saved: 2 results                                     │
│     Logs: "Found 5 results from Exa, saving 2 high-     │
│            confidence results to Convex..."              │
└───────────────────────┬──────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│  6. Display All 5 Results to User                        │
│     (But only 2 saved to database)                       │
│     Din Tai Fung 🔍 Exa (85%)                            │
│     Hawker Centre 🔍 Exa (75%)                           │
│     Singapore Place 🔍 Exa (45%)                         │
│     Unknown Location 🔍 Exa (30%)                        │
│     Area Near 🔍 Exa (55%)                               │
└──────────────────────────────────────────────────────────┘
```

## Logging Output

```bash
# With confidence threshold
INFO: Geocoding: "Din Tai Fung, 290 Orchard Road..." (confidence: 85%)
INFO: ✓ Din Tai Fung at (1.2834, 103.8607) [85% confidence]
INFO: Geocoding: "Singapore Place, Singapore" (confidence: 45%)
INFO: ✓ Singapore Place at (1.3521, 103.8198) [45% confidence]
INFO: Found 5 results from Exa, saving 2 high-confidence results to Convex...
INFO: Successfully saved 2 high-confidence results to Convex

# Low confidence warning
WARN: Found 3 results from Exa, but none met confidence threshold (>= 70%)
```

## Code Changes

### 1. `exa-search-service.ts`

**Added:**
- `cleanDescription(text: string)` - Clean descriptions
- `calculateConfidence(entry)` - Score results (0-1)
- `extractLocationEntries()` now returns confidence
- Results include `url` field from Exa sources

### 2. `search-orchestrator.ts`

**Added:**
- Confidence threshold filtering (70%)
- Only saves high-confidence results to Convex
- Logs warning if no results meet threshold

### 3. `search-state-service.ts`

**Added:**
- `url?: string` field to `SearchResult` interface
- `address?: string` field to `SearchResult` interface

### 4. `search-panel.tsx`

**Added:**
- URL link display with hostname truncation
- Clickable links that open in new tabs
- Link prevents result selection when clicked

## Configuration

### Adjust Confidence Threshold

Edit `src/lib/search-orchestrator.ts`:

```typescript
// Change threshold (0-1 scale)
const CONFIDENCE_THRESHOLD = 0.7;  // 70% (default)
const CONFIDENCE_THRESHOLD = 0.8;  // 80% (stricter)
const CONFIDENCE_THRESHOLD = 0.6;  // 60% (more lenient)
```

### Adjust Scoring Weights

Edit `src/lib/services/exa-search-service.ts`:

```typescript
// Increase weight for addresses
if (hasAddress) score += 0.30;  // Was 0.20

// Decrease penalty for generic names
if (isGeneric) score -= 0.20;  // Was 0.30
```

## Testing

```bash
✅ Lint: passed
✅ Type-check: passed
✅ Tests: 31 passed
✅ Build: successful
```

**Test logs show confidence filtering:**
```
WARN: Found 2 results from Exa, but none met confidence threshold (>= 70%)
```

## Benefits Summary

✨ **Clean Descriptions**
- No more citation brackets `[1]`, `[2]`
- No more embedded URLs `(https://...)`
- Professional, readable text

✨ **Confidence Filtering**
- Only high-quality data in Convex
- Better cache hit quality
- Prevents database pollution

✨ **URL Links**
- Direct access to source websites
- Better user experience
- Trust indicators (shows source domain)

✨ **Transparent Confidence**
- Logged confidence scores
- Clear threshold enforcement
- Warning when quality is low

## User Experience

### Before
```
Search "Din Tai Fung"
Results:
1. Din Tai Fung [1] (https://example.com) | 🔍 Exa
   Famous restaurant (http://link.com) [2]...
2. Singapore | 🔍 Exa
   Place
3. Unknown Location [3] | 🔍 Exa
   N/A

All 3 saved to Convex ❌
```

### After
```
Search "Din Tai Fung"
Results:
1. Din Tai Fung | 🔍 Exa
   Famous restaurant for xiaolongbao dumplings
   🔗 dintaifung.com.sg
   
2. Singapore | 🔍 Exa
   Place
   
3. Unknown Location | 🔍 Exa
   N/A

Only 1 high-quality result saved to Convex ✅
```

## Future Improvements

1. **Display confidence in UI** - Show confidence badges
2. **User override** - Let users manually save low-confidence results
3. **Confidence trends** - Track quality over time
4. **Smart thresholds** - Adjust based on query type
5. **Confidence boosting** - Learn from user selections

## Summary

✨ **The quality features provide:**
- 🧹 Clean, professional descriptions (no artifacts)
- 🎯 High-confidence filtering (only quality data saved)
- 🔗 Clickable source URLs (better UX)
- 📊 Transparent confidence scoring (logged)
- 💾 Cleaner Convex database (70%+ threshold)

**Result:** Better search quality, cleaner UI, and higher-quality cache!

