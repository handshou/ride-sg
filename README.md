# Ride-SG

A modern Singapore map explorer with intelligent landmark search and real-time bicycle parking data.

## 🚀 Technologies

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[Effect-TS](https://effect.website/)** - Functional programming library for TypeScript
- **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)** - Interactive map rendering
- **[Convex](https://convex.dev)** - Real-time backend database with caching
- **[Exa AI](https://exa.ai)** - Semantic search API for landmark discovery
- **[LTA DataMall](https://datamall.lta.gov.sg/)** - Singapore bicycle parking data
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Biome](https://biomejs.dev)** - Fast linter and formatter
- **[Vitest](https://vitest.dev)** & **[Playwright](https://playwright.dev)** - Testing

## ✨ Features

1. **Smart Landmark Search** - AI-powered search with Exa API, automatically cached in Convex for fast retrieval
2. **Interactive Map Explorer** - Satellite/street views with smooth flyTo animations and location markers
3. **Real-time Bicycle Parking** - Live data from LTA DataMall showing nearby bicycle parking with shelter indicators
4. **Location Discovery** - GPS location finder, random coordinates generator, and manual search

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- [Mapbox Access Token](https://account.mapbox.com/access-tokens/)
- [Convex Account](https://convex.dev)
- [Exa API Key](https://exa.ai)
- [LTA DataMall Account Key](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html)

### Installation

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your keys to `.env.local`:
   ```env
   MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
   EXA_API_KEY=your_exa_api_key
   LTA_ACCOUNT_KEY=your_lta_account_key
   ```

3. **Start Convex development server:**
   ```bash
   npx convex dev
   ```
   
   Follow the prompts to set up your Convex project.

4. **Start Next.js development server:**
   ```bash
   pnpm dev
   ```

5. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 📝 Development Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
pnpm test         # Run unit tests (Vitest)
pnpm test:watch   # Run tests in watch mode
pnpm test:e2e     # Run end-to-end tests (Playwright)
pnpm check-all    # Run all checks (lint + type-check + test + build)
```

## 🏗️ Architecture

### Effect-TS Service Layer

The project uses Effect-TS for functional programming patterns:

- **Services**: Modular, composable services with dependency injection
- **Error Handling**: Type-safe error handling with `Effect.catchAll`
- **Configuration**: Environment variables managed through Effect Config
- **Runtime**: Custom server runtime for Next.js server components

### Key Services

- `ExaSearchService` - Semantic search with Exa Answer API
- `ConvexService` - Database operations with caching
- `MapboxService` - Geocoding and map data
- `BicycleParkingService` - LTA DataMall integration
- `GeolocationService` - Browser geolocation API
- `ToastService` - User notifications

### Convex Schema

- `locations` - Cached landmark search results
- `bicycleParking` - Cached bicycle parking data

## 📦 Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Core application logic
│   ├── actions/     # Next.js Server Actions
│   ├── services/    # Effect-TS services
│   └── schema/      # Effect.Schema definitions
convex/              # Convex backend functions
tests/               # Playwright e2e tests
```

## 🧪 Testing

- **Unit Tests**: Vitest for testing Effect-TS services
- **E2E Tests**: Playwright for browser testing across Chromium, Firefox, WebKit
- **Performance**: 14 unit tests (~400ms), 36 e2e tests (~40s)

## 📚 Documentation

See additional documentation in the repository:

- `AGENTS.md` - AI agent capabilities and guidelines
- `DEPLOYMENT.md` - Vercel deployment instructions
- `SECURITY_FIX.md` - Server-side API key security
- `SEARCH_INTEGRATION.md` - Search architecture overview

## 🚀 Future Enhancements

### Weather & Environment

- **Real-time Rain Overlay** - 2-hour rain nowcast from [Meteorological Service Singapore](https://www.weather.gov.sg/weather-forecast-2hrnowcast-2/)
- **Air Quality & UV Index** - Smog levels and UV radiation data from [National Environment Agency](https://www.nea.gov.sg/corporate-functions/weather#weather-forecast2hr)

### Traffic & Transportation

- **LTA Dynamic Data** - Real-time bus arrivals, taxi availability, and traffic speed from [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html)
- **Traffic Closures** - Live road closure alerts from [LTA OneMotoring](https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic_updates_and_road_closures.html?type=crw&qcrw=D)

### Enhanced Features

- **Route Planning** - Multi-modal route suggestions combining walking, cycling, and public transport
- **Weather-Aware Recommendations** - Smart suggestions based on current weather and air quality
- **Community Reports** - Crowdsourced updates for parking availability and facility conditions
- **Historical Analytics** - Parking usage patterns and weather trends over time

## 📄 License

MIT
