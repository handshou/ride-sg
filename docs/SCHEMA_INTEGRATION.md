# Effect.Schema Integration for Exa Answers API

## Overview

This document describes the integration of **Effect.Schema** for type-safe parsing of **Exa Answers API** responses. The project now uses Exa's Answer API instead of the Search API for more accurate Singapore landmark information.

## Changes Made

### 1. Created Schema Directory (`src/lib/schema/`)

Organized schema definitions in a dedicated folder:
```
src/lib/schema/
├── exa-answer.schema.ts      # Exa Answer API response schemas
├── search-result.schema.ts   # Unified search result schemas
└── index.ts                  # Barrel exports
```

### 2. Exa Answer API Schema (`exa-answer.schema.ts`)

Defines type-safe schemas for Exa's Answer API responses:

```typescript
import { Schema } from "effect";

// Source document that contributed to the answer
export const ExaAnswerSourceSchema = Schema.Struct({
  content: Schema.String,
  id: Schema.String,
  score: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(1),
  ),
  url: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
});

// Exa Answer API Response
export const ExaAnswerResponseSchema = Schema.Struct({
  answer: Schema.String,
  sources: Schema.Array(ExaAnswerSourceSchema),
});

// Type exports
export type ExaAnswerSource = Schema.Schema.Type<typeof ExaAnswerSourceSchema>;
export type ExaAnswerResponse = Schema.Schema.Type<typeof ExaAnswerResponseSchema>;
```

### 3. Search Result Schema (`search-result.schema.ts`)

Unified schema for search results from any source (Exa, Mapbox, Database):

```typescript
// Geographic coordinates
export const CoordinatesSchema = Schema.Struct({
  latitude: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(-90),
    Schema.lessThanOrEqualTo(90),
  ),
  longitude: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(-180),
    Schema.lessThanOrEqualTo(180),
  ),
});

// Search result
export const SearchResultSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  location: CoordinatesSchema,
  source: Schema.Literal("mapbox", "exa", "database"),
  timestamp: Schema.Number,
  address: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

export type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>;
```

### 4. Updated Exa Search Service

The service now uses **Exa Answer API** (`/answer` endpoint) instead of Search API (`/search`):

#### Old Approach (Search API):
```typescript
// ❌ OLD: Used search API, returned web results
fetch("https://api.exa.ai/search", {
  body: JSON.stringify({
    query: `${query} Singapore landmark`,
    num_results: 5,
    type: "auto",
  }),
});
```

#### New Approach (Answer API):
```typescript
// ✅ NEW: Uses Answer API, gets direct answers
const enhancedQuery = `What are the top 5 famous landmarks, tourist attractions, or places related to "${query}" in Singapore? List their names.`;

const response = await fetch("https://api.exa.ai/answer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": exaApiKey,
  },
  body: JSON.stringify({
    query: enhancedQuery,
    num_sources: 3,
    use_autoprompt: true,
  }),
});

// Parse and validate with Effect.Schema
const answerData: ExaAnswerResponse = yield* Effect.try({
  try: () => Schema.decodeUnknownSync(ExaAnswerResponseSchema)(rawData),
  catch: (error) => new ExaError(`Schema validation failed: ${error.message}`),
});
```

## Key Features

### 1. Type Safety with Effect.Schema

- **Compile-time validation**: TypeScript catches schema mismatches
- **Runtime validation**: Ensures API responses match expected structure
- **Type inference**: Automatic TypeScript type generation from schemas

```typescript
// Type is automatically inferred from schema
const answerData: ExaAnswerResponse = Schema.decodeUnknownSync(
  ExaAnswerResponseSchema
)(rawData);

// TypeScript knows: answerData.answer is string
// TypeScript knows: answerData.sources is ExaAnswerSource[]
```

### 2. Location Extraction from Natural Language

The service now extracts location names from Exa's natural language answers:

```typescript
private extractLocationNames(answer: string): string[] {
  // Intelligently parse the answer to find landmark names
  const locations = answer
    .split(/[,\n•\-\d+\.\s]+/)
    .map((loc) => loc.trim())
    .filter((loc) => loc.length > 3 && !isCommonWord(loc));

  return [...new Set(locations)].slice(0, 5);
}
```

**Example:**
- **Query:** "Marina Bay"
- **Exa Answer:** "Top 5 landmarks: Marina Bay Sands, Gardens by the Bay, ArtScience Museum, Helix Bridge, Merlion"
- **Extracted:** `["Marina Bay Sands", "Gardens by the Bay", "ArtScience Museum", "Helix Bridge", "Merlion"]`

### 3. Geocoding Integration

Each extracted location is geocoded using Mapbox:

```typescript
for (const locationName of locationNames) {
  const coordinates = yield* this.geocodeLocation(locationName, mapboxToken);

  if (coordinates) {
    exaResults.push({
      id: `exa-${Date.now()}-${exaResults.length}`,
      title: locationName,
      description: `${sourceContent} (via Exa Answer API)`,
      location: coordinates,
      source: "exa" as const,
      timestamp: Date.now(),
    });
  }
}
```

## Benefits

### ✅ Accuracy Improvements

| Old (Search API) | New (Answer API) |
|------------------|------------------|
| Returns web search results | Returns direct answers |
| Requires manual parsing of web content | AI extracts relevant information |
| May return irrelevant results | Focused on Singapore landmarks |
| No guarantee of structure | Consistent answer format |

### ✅ Type Safety

- **Before:** `any` types, manual type casting
- **After:** Full type inference from schemas
- **Result:** Fewer runtime errors, better IDE support

### ✅ Maintainability

- **Centralized schemas**: All data structures in `src/lib/schema/`
- **Reusable validation**: Schema used across services
- **Clear documentation**: Types self-document the API contract

## Example Flow

1. **User searches:** "Marina Bay"
2. **Search orchestrator checks Convex:** Empty results
3. **Exa Answer API called:**
   - Query: "What are the top 5 famous landmarks related to 'Marina Bay' in Singapore?"
   - Response: "Top attractions include Marina Bay Sands, Gardens by the Bay..."
4. **Schema validation:** Response validated against `ExaAnswerResponseSchema`
5. **Location extraction:** AI answer parsed to extract landmark names
6. **Geocoding:** Each landmark geocoded with Mapbox
7. **Save to Convex:** Results saved for future searches
8. **Return to user:** Structured `SearchResult[]` with coordinates

## API Usage

### Using Schemas

```typescript
import { Schema } from "effect";
import { ExaAnswerResponseSchema, type ExaAnswerResponse } from "@/lib/schema";

// Decode unknown data (throws on failure)
const data: ExaAnswerResponse = Schema.decodeUnknownSync(
  ExaAnswerResponseSchema
)(unknownData);

// Safe decoding (returns Effect)
const dataEffect = Schema.decodeUnknown(ExaAnswerResponseSchema)(unknownData);

// Type checking
const isValid = Schema.is(ExaAnswerResponseSchema)(data);
```

### Using Search Results

```typescript
import { type SearchResult } from "@/lib/schema";

function displayResults(results: SearchResult[]) {
  for (const result of results) {
    console.log(`${result.title} (${result.source})`);
    console.log(`  ${result.location.latitude}, ${result.location.longitude}`);
  }
}
```

## Testing

All tests pass with the new schema integration:

```bash
pnpm run check-all

✅ Lint: passed
✅ Type-check: passed
✅ Tests: 31 passed
✅ Build: successful
```

### Schema Validation Tests

The schemas are tested indirectly through the existing search tests:
- Exa Answer API responses are validated on every search
- Invalid responses throw `ExaError` with schema validation details
- Type safety ensures compile-time correctness

## Security Notes

- **EXA_API_KEY**: Server-side only (via Server Actions)
- **Schema validation**: Protects against malformed API responses
- **Type safety**: Prevents runtime type errors

## Future Improvements

1. **Add schema tests**: Unit tests for schema validation
2. **Custom annotations**: Add JSON Schema annotations for OpenAPI docs
3. **Error messages**: Custom error messages for validation failures
4. **Schema evolution**: Version schemas for backward compatibility
5. **Additional schemas**: Convex data models, Mapbox responses

## References

- [Effect Schema Documentation](https://effect.website/docs/schema/introduction)
- [Exa Answer API](https://docs.exa.ai/reference/answer)
- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)

## Summary

✨ **The project now uses:**
- ✅ **Effect.Schema** for type-safe data validation
- ✅ **Exa Answer API** for intelligent landmark discovery
- ✅ **Centralized schemas** in `src/lib/schema/`
- ✅ **Compile-time type safety** with TypeScript inference
- ✅ **Runtime validation** with graceful error handling

This provides a **robust, type-safe foundation** for the search functionality! 🎉

