# Ride-SG

A modern Singapore and Jakarta map explorer with intelligent landmark search, cross-border navigation, real-time bicycle parking, and rainfall visualization.

**🏆 Hackathon Submission (Cutoff: Oct 19, 2025 9:00 AM SGT)**
- **[Live Demo](https://ride-lwfrxwc1s-handshous-projects.vercel.app?_vercel_share=pdX2roJsPJaV2fITyuAlUH4aARHA4p7I)** - Production deployment at cutoff time
- **[Source Code](https://github.com/handshou/ride-sg/tree/71dfee2497333f609629f932e1db6666493ed590)** - GitHub repository snapshot at cutoff time

**Built at [Cursor Hackathon SG 2025](https://luma.com/cursor-hack-sg)** - A 24-hour hackathon with 500+ builders, sponsored by Cursor, OpenAI, DeepMind, Anthropic, Groq, ElevenLabs, Supabase, Convex, Exa, and more.

## 🚀 Technologies

### Core Framework & Backend
- **[Next.js 15](https://nextjs.org)** - React framework with App Router and Turbopack
- **[React 19](https://react.dev)** - Modern UI library with latest features
- **[Effect-TS](https://effect.website/)** - Functional programming library for TypeScript
- **[PostgreSQL](https://www.postgresql.org)** via `@effect/sql-pg` - Persistence behind Effect repository ports
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development

### APIs & Data Sources
- **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)** - Interactive map rendering with 3D support
- **[Exa AI](https://exa.ai)** - Semantic search API for landmark discovery
- **[LTA DataMall](https://datamall.lta.gov.sg/)** - Singapore bicycle parking & rainfall data

### UI & Styling
- **[Tailwind CSS v4](https://tailwindcss.com)** - Utility-first styling
- **[Radix UI](https://www.radix-ui.com/)** - Accessible UI components
- **[Lucide React](https://lucide.dev)** - Beautiful icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme management
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications

### Development Tools
- **[Biome](https://biomejs.dev)** - Fast linter and formatter
- **[Vitest](https://vitest.dev)** - Unit testing framework
- **[Playwright](https://playwright.dev)** - E2E testing across browsers
- **[Husky](https://typicode.github.io/husky/)** - Git hooks for quality checks

## ✨ Features

1. **Cross-Border Navigation** - Seamless travel between Singapore and Jakarta with intelligent city detection, smooth flyTo animations (6.5s cross-border, 2.5s local), and URL updates without page reloads
2. **City Toggle** - Quick toggle between Singapore and Jakarta with plane animation during transition, maintaining map state and supporting browser back/forward navigation
3. **Smart Landmark Search** - AI-powered search with Exa API, saved locations persisted in PostgreSQL
4. **Interactive Map Explorer** - Multiple map styles (satellite, streets, dark, light) with smooth flyTo animations and 3D buildings toggle
5. **Real-time Bicycle Parking** - Live data from LTA DataMall showing nearby bicycle parking with shelter indicators, save favorites locally
6. **Real-time Rainfall Overlay** - 2-hour rainfall nowcast with heat map visualization showing rain intensity across Singapore (live + mock modes)
7. **Location Discovery** - GPS location finder, random coordinates generator, saved locations cycling, and manual search
8. **Theme Support** - Dark/light mode with persistent theme preference across the app

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- [Mapbox Access Token](https://account.mapbox.com/access-tokens/)
- Docker Desktop (local PostgreSQL)
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

3. **Start PostgreSQL, run migrations, and start Next.js:**
   ```bash
   pnpm run dev:all
   ```

   See `docs/POSTGRES_SETUP.md` for details.

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
pnpm lint         # Run Biome linter (check only)
pnpm format       # Format code with Biome
pnpm fix          # Auto-fix linting issues with Biome
pnpm type-check   # Run TypeScript type checking
pnpm test         # Run unit tests (Vitest)
pnpm test:watch   # Run tests in watch mode
pnpm test:e2e     # Run end-to-end tests (Playwright)
pnpm check-all    # Run all checks (fix + type-check + test + build)
```

**Pre-push Hook**: Husky automatically runs `check-all` before every push. Skip with `git push --no-verify` if needed.

## 🏗️ Architecture

### Effect-TS Managed Runtime Pattern

The project uses Effect-TS with a **ManagedRuntime** architecture for optimal performance:

- **Single Runtime Instances**: One server runtime, one client runtime (not per-request)
- **Layered Architecture**: BaseLayer (shared) + ServerLayer (server-only) + ClientLayer (client-only)
- **Lifecycle Management**: Initialized via Next.js instrumentation hooks
- **Resource Efficiency**: Service reuse, connection pooling, reduced GC pressure
- **Error Handling**: Type-safe error handling with `Effect.catchAll`
- **Configuration**: Environment variables managed through Effect Config

### Runtime Layers

```typescript
BaseLayer (Shared)
├─ ConfigService: Environment variables
└─ ToastService: Logging & notifications

ServerLayer (Server-only) = BaseLayer +
├─ MapboxService: Geocoding API
├─ RainfallService: NEA rainfall data
├─ BicycleParkingService: LTA bike parking
└─ ExaSearchService: Semantic search

ClientLayer (Client-only) = BaseLayer +
├─ GeolocationService: Browser GPS
├─ MapReadinessService: Map state
├─ MapNavigationService: Map flyTo animations
├─ CrossBorderNavigationService: City detection & navigation
└─ ThemeSyncService: Theme management
```

**Benefits:**
- 🚀 9% faster responses (no layer construction overhead)
- 💾 Lower memory usage (services instantiated once)
- 🔄 HTTP connection pooling (reused across requests)
- 📊 Better fiber management (shared pool)

See [docs/RUNTIME_ARCHITECTURE.md](docs/RUNTIME_ARCHITECTURE.md) for details.

### Key Services

**15 Effect-TS Services:** ExaSearchService, DatabaseSearchService, CapturedImageService, MapboxService, BicycleParkingService, RainfallService, SearchStateService, GeolocationService, RandomCoordinatesService, ToastService, ThemeSyncService, MapReadinessService, ConfigService, MapNavigationService, CrossBorderNavigationService

**PostgreSQL Schema:** 5 tables (locations, rainfall_readings, bicycle_parking_cache, captured_images, image_blobs) behind repository ports

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
src/lib/repositories/ # Repository ports and PostgreSQL adapters
tests/               # Playwright e2e tests
```

## 🧪 Testing

- **Unit Tests**: Vitest for testing Effect-TS services (63 tests in ~1s)
- **E2E Tests**: Playwright for browser testing across Chromium, Firefox, WebKit (21 tests in ~40s)
- **Quality Checks**: Pre-push hook runs full test suite automatically

## 🎨 Visual Regression Testing

Percy integration for visual regression testing catches UI changes automatically:

```bash
# Run visual tests (requires PERCY_TOKEN)
pnpm test:visual

# Run visual tests with browser visible (local development)
pnpm test:visual:local
```

### Setup

1. Sign up at [percy.io](https://percy.io) (free for open source)
2. Create a project and get your `PERCY_TOKEN`
3. Add to your environment:
   ```bash
   export PERCY_TOKEN=your_token_here
   # or add to .env file
   ```
4. Run tests - Percy will capture baselines on first run

### What's Tested

- **Map Loading**: Initial map render and controls
- **Search Panel**: Search interface and results display  
- **Database Integration**: Database result badges and UI state

### Usage

- **Cost**: ~4 snapshots/run × ~40 runs/month = ~160 snapshots/month (3% of 5000 limit)
- **Browser**: Chromium only (1280px desktop viewport)
- **When to run**: Before releases or when UI changes are made
- **Baselines**: Approve changes via Percy dashboard to update baselines

## 📚 Documentation

Additional documentation in the `docs/` directory:

### Setup & Deployment
- `POSTGRES_SETUP.md` - PostgreSQL persistence and repository ports
- `DEPLOYMENT.md` - Vercel deployment instructions
- `DEV_VS_PROD.md` - Development vs production environment setup

### Features & Architecture
- `SEARCH_INTEGRATION.md` - Search architecture overview
- `SCHEMA_INTEGRATION.md` - Schema design patterns
- `BICYCLE_PARKING_FEATURE.md` - Bicycle parking implementation
- `THEME_SYNC_SERVICE.md` - Theme synchronization service

### Technical Fixes & Improvements
- `SECURITY_FIX.md` - Server-side API key security
- `3D_BUILDINGS_FIX.md` - Mapbox 3D buildings implementation
- `MAPBOX_LAYER_PERSISTENCE.md` - Map layer state management
- `PARALLEL_SEARCH_FIX.md` - Concurrent search optimization
- `EXA_QUERY_IMPROVEMENTS.md` - Exa API query enhancements
- `TIMEOUT_FIX.md` - Request timeout handling
- `BADGE_FIX.md` - UI badge component fixes

### Development Guides
- `AGENTS.md` - AI agent capabilities and guidelines
- `QUALITY_FEATURES.md` - Code quality standards
- `PRODUCTION_TROUBLESHOOTING.md` - Production debugging guide

## 🚀 Future Enhancements

### Weather & Environment

- **Air Quality & UV Index** - Smog levels and UV radiation data from [National Environment Agency](https://www.nea.gov.sg/corporate-functions/weather#weather-forecast2hr)
- **Weather Forecasts** - 4-day weather forecasts and temperature trends
- **Lightning Alerts** - Real-time lightning strike warnings from NEA

### Traffic & Transportation

- **LTA Dynamic Data** - Real-time bus arrivals, taxi availability, and traffic speed from [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html)
- **Traffic Closures** - Live road closure alerts from [LTA OneMotoring](https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic_updates_and_road_closures.html?type=crw&qcrw=D)
- **ERP Rates** - Electronic Road Pricing rates and timing information
- **Carpark Availability** - Real-time carpark occupancy data

### Enhanced Features

- **Route Planning** - Multi-modal route suggestions combining walking, cycling, and public transport
- **Weather-Aware Recommendations** - Smart suggestions based on current weather, air quality, and rainfall
- **Community Reports** - Crowdsourced updates for parking availability and facility conditions
- **Historical Analytics** - Parking usage patterns, weather trends, and traffic patterns over time
- **Offline Mode** - Cached map tiles and saved locations for offline use

## 🏆 Built at Cursor Hackathon SG 2025

This project was built during the [Cursor Hackathon Singapore 2025](https://luma.com/cursor-hack-sg), Cursor's first official 24-hour hackathon in Singapore with 500+ builders.

### Event Highlights

- 24 hours of intense building with Cursor
- $100,000+ in cash and credits for winners
- $200,000+ in total perks for all participants
- Sponsored by Cursor, OpenAI, DeepMind, Anthropic, Groq, ElevenLabs, Supabase, Convex, Exa, and more

Special thanks to the sponsors whose APIs and services power this application:
- **Convex** - Original hackathon backend, since replaced by PostgreSQL
- **Exa** - Semantic search API
- **Mapbox** - Interactive map rendering

## 📄 License

MIT
