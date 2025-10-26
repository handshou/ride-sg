# Structured Geocoding with Mapbox v6

This document explains how to use Mapbox Geocoding v6's structured input feature for more precise geocoding results.

## Overview

Instead of passing a single combined address string, you can now break down addresses into their component parts for more accurate geocoding results.

## Features

### 1. Structured Address Components

The `StructuredAddress` interface supports:
- `streetNumber`: Street number (e.g., "123")
- `streetName`: Street name (e.g., "Orchard Road")
- `city`: City name (e.g., "Singapore", "Jakarta")
- `state`: State or region (e.g., "Central Region")
- `postalCode`: Postal/ZIP code (e.g., "238858", "10110")
- `country`: ISO 3166-1 alpha-2 country code (e.g., "SG", "ID")

### 2. Geocoding Functions

#### `geocodeStructuredAddress`

Geocodes an address using structured components for maximum precision.

```typescript
import { geocodeStructuredAddress } from "@/lib/utils/geocoding-utils";

const result = yield* geocodeStructuredAddress(
  {
    streetNumber: "10",
    streetName: "Bayfront Avenue",
    city: "Singapore",
    postalCode: "018956",
    country: "SG"
  },
  mapboxToken
);

// Result: { latitude: 1.2838, longitude: 103.8607, placeName: "10 Bayfront Avenue, Singapore 018956" }
```

#### `parseAddressString`

Helper function to convert existing single-string addresses into structured format.

```typescript
import { parseAddressString } from "@/lib/utils/geocoding-utils";

const structured = parseAddressString(
  "10 Bayfront Avenue, Singapore, 018956",
  "SG"
);

// Result:
// {
//   streetNumber: "10",
//   streetName: "Bayfront Avenue",
//   city: "Singapore",
//   postalCode: "018956",
//   country: "SG"
// }
```

### 3. Legacy Compatibility

The existing `geocodeLocationName` function (Mapbox v5) is still available for backward compatibility:

```typescript
import { geocodeLocationName } from "@/lib/utils/geocoding-utils";

const result = yield* geocodeLocationName("Marina Bay Sands", mapboxToken);
```

## Benefits of Structured Input

### 1. Improved Precision

Structured input provides explicit information about address components, leading to more accurate geocoding:

**Single-string (less precise):**
```typescript
// May match multiple locations or get confused by ambiguous formatting
const result = yield* geocodeLocationName(
  "10 Bayfront Singapore 018956",
  token
);
```

**Structured (more precise):**
```typescript
// Explicitly identifies each component for accurate matching
const result = yield* geocodeStructuredAddress({
  streetNumber: "10",
  streetName: "Bayfront Avenue",
  city: "Singapore",
  postalCode: "018956",
  country: "SG"
}, token);
```

### 2. Better Disambiguation

When multiple locations have similar names, structured input helps disambiguate:

```typescript
// Without structured input, "Orchard Road" might match many locations
// With structured input, we can be explicit:
const result = yield* geocodeStructuredAddress({
  streetName: "Orchard Road",
  city: "Singapore",
  state: "Central Region",
  country: "SG"
}, token);
```

### 3. Multi-City Support

Perfect for applications covering multiple cities like Singapore and Jakarta:

**Singapore:**
```typescript
const sgAddress = {
  streetNumber: "1",
  streetName: "Marina Boulevard",
  city: "Singapore",
  postalCode: "018989",
  country: "SG"
};
```

**Jakarta:**
```typescript
const jakartaAddress = {
  streetName: "Jalan Thamrin",
  city: "Jakarta",
  state: "Jakarta Special Capital Region",
  postalCode: "10110",
  country: "ID"
};
```

## Usage Examples

### Example 1: Direct Structured Geocoding

```typescript
import { Effect } from "effect";
import { geocodeStructuredAddress } from "@/lib/utils/geocoding-utils";

const geocodeExample = (mapboxToken: string) =>
  Effect.gen(function* () {
    const address = {
      streetNumber: "10",
      streetName: "Bayfront Avenue",
      city: "Singapore",
      postalCode: "018956",
      country: "SG"
    };

    const result = yield* geocodeStructuredAddress(address, mapboxToken);

    if (result) {
      console.log(`Location: ${result.placeName}`);
      console.log(`Coordinates: ${result.latitude}, ${result.longitude}`);
    }
  });
```

### Example 2: Parse and Geocode

```typescript
import { Effect } from "effect";
import {
  parseAddressString,
  geocodeStructuredAddress
} from "@/lib/utils/geocoding-utils";

const parseAndGeocodeExample = (mapboxToken: string) =>
  Effect.gen(function* () {
    // Convert existing single-string address
    const addressString = "10 Bayfront Avenue, Singapore, 018956";
    const structured = parseAddressString(addressString, "SG");

    // Use structured geocoding
    const result = yield* geocodeStructuredAddress(structured, mapboxToken);

    return result;
  });
```

### Example 3: Fallback Pattern

Combine structured and legacy geocoding for robustness:

```typescript
import { Effect } from "effect";
import {
  geocodeStructuredAddress,
  geocodeLocationName,
  parseAddressString
} from "@/lib/utils/geocoding-utils";

const geocodeWithFallback = (
  address: string,
  mapboxToken: string
) =>
  Effect.gen(function* () {
    // Try structured geocoding first
    const structured = parseAddressString(address, "SG");
    let result = yield* geocodeStructuredAddress(structured, mapboxToken).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    );

    // Fallback to legacy single-string geocoding
    if (!result) {
      result = yield* geocodeLocationName(address, mapboxToken);
    }

    return result;
  });
```

## API Reference

### Types

```typescript
interface StructuredAddress {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface GeocodedLocation {
  latitude: number;
  longitude: number;
  placeName: string;
}
```

### Functions

```typescript
// Structured geocoding (v6)
geocodeStructuredAddress(
  address: StructuredAddress,
  mapboxToken: string
): Effect.Effect<GeocodedLocation | null, Error>

// Parse address string to structured format
parseAddressString(
  addressString: string,
  defaultCountry?: string
): StructuredAddress

// Legacy single-string geocoding (v5)
geocodeLocationName(
  locationName: string,
  mapboxToken: string
): Effect.Effect<GeocodedLocation | null, Error>

// Reverse geocoding (v5)
reverseGeocode(
  latitude: number,
  longitude: number,
  mapboxToken: string
): Effect.Effect<string | null, Error>
```

## Migration Guide

### Before (v5 Single-String)

```typescript
const result = yield* geocodeLocationName(
  "10 Bayfront Avenue, Singapore 018956",
  mapboxToken
);
```

### After (v6 Structured)

```typescript
const result = yield* geocodeStructuredAddress(
  {
    streetNumber: "10",
    streetName: "Bayfront Avenue",
    city: "Singapore",
    postalCode: "018956",
    country: "SG"
  },
  mapboxToken
);
```

### Quick Migration with Parser

```typescript
const addressString = "10 Bayfront Avenue, Singapore 018956";
const structured = parseAddressString(addressString, "SG");
const result = yield* geocodeStructuredAddress(structured, mapboxToken);
```

## Best Practices

1. **Use structured input when you have well-organized address data**
   - If your data is already structured (e.g., from a database), use `geocodeStructuredAddress` directly
   - If you only have a single string, use `parseAddressString` as a helper

2. **Always provide country code**
   - Helps narrow down results significantly
   - Use "SG" for Singapore, "ID" for Indonesia

3. **Include postal codes when available**
   - Postal codes provide strong disambiguation
   - Essential for precise location matching

4. **Handle null results gracefully**
   - Both v5 and v6 geocoding can return null if no match is found
   - Implement fallback patterns or user feedback

5. **Consider caching results**
   - Geocoding API calls cost money and have rate limits
   - Cache frequently geocoded addresses

## See Also

- [Mapbox Geocoding v6 Documentation](https://docs.mapbox.com/api/search/geocoding-v6/)
- [Mapbox Geocoding v5 Documentation](https://docs.mapbox.com/api/search/geocoding/)
- Full examples: `src/lib/utils/geocoding-examples.ts`
