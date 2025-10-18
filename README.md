# Next.js + Effect-TS Full-Stack Application

A modern full-stack application demonstrating the separation of frontend and backend runtimes using Next.js 15 with App Router and Effect-TS.

## Architecture

### Frontend (Next.js)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS
- **Runtime**: Node.js (Browser + Server)
- **Linting**: Biome

### Backend (Effect-TS)
- **Framework**: Effect-TS with Express.js
- **Language**: TypeScript with strict mode
- **Runtime**: Node.js (Server only)
- **Patterns**: Functional programming, Layer-based DI
- **Error Handling**: Effect-based error management

## Project Structure

```
src/
├── app/                    # Next.js App Router (frontend)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React components (frontend)
│   ├── UserList.tsx
│   └── UserForm.tsx
├── lib/                   # Frontend utilities
└── backend/               # Effect-TS backend (separate runtime)
    ├── api/               # Express routes
    │   ├── router.ts
    │   ├── users.ts
    │   └── health.ts
    ├── services/          # Effect-TS services
    │   └── user-service.ts
    ├── config/            # Configuration
    │   └── server.ts
    ├── types/             # Type definitions
    └── index.ts           # Backend entry point
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

### Development

#### Option 1: Run both frontend and backend together
```bash
npm run dev:full
```

#### Option 2: Run frontend and backend separately

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:backend
```

### Available Scripts

- `npm run dev` - Start Next.js development server (frontend only)
- `npm run dev:backend` - Start Effect-TS backend server
- `npm run dev:full` - Start both frontend and backend concurrently
- `npm run build` - Build Next.js application
- `npm run build:backend` - Build Effect-TS backend
- `npm run build:full` - Build both frontend and backend
- `npm run start` - Start production Next.js server
- `npm run start:backend` - Start production backend server
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/` - API information
- `GET /api/health` - Health check
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user

## Effect-TS Patterns

This project demonstrates several Effect-TS patterns:

### Service Layer Pattern
```typescript
export interface UserService {
  readonly getUsers: () => Effect.Effect<readonly User[], never, never>
  readonly getUserById: (id: string) => Effect.Effect<User | null, never, never>
  readonly createUser: (data: CreateUserData) => Effect.Effect<User, never, never>
}
```

### Error Handling
```typescript
class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}
```

### Configuration Management
```typescript
export const ServerConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3001)),
  host: Config.string("HOST").pipe(Config.withDefault("localhost")),
  nodeEnv: Config.string("NODE_ENV").pipe(Config.withDefault("development"))
})
```

### Layer-based Dependency Injection
```typescript
export const UserServiceLive = Effect.sync(() => makeUserService())
export const UserService = Effect.service(UserServiceLive)
```

## Cursor Configuration

This project includes a `.cursorrules` file that provides AI assistant instructions for:

- Understanding the project structure
- Following Effect-TS patterns
- Maintaining separation between frontend and backend
- Using proper TypeScript conventions
- Following the established architecture

## Development Guidelines

### Frontend Development
- Use App Router patterns
- Prefer server components when possible
- Use TypeScript strictly
- Follow React 19 patterns
- Use Tailwind CSS for styling

### Backend Development
- Use Effect-TS for all business logic
- Express.js for HTTP handling only
- Use proper error handling with Effect
- Follow functional programming principles
- Use Layer-based dependency injection

## Environment Variables

Create a `.env.local` file for environment-specific configuration:

```env
# Backend Configuration
PORT=3001
HOST=localhost
NODE_ENV=development

# Frontend Configuration (if needed)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Contributing

1. Follow the established patterns
2. Use TypeScript strictly
3. Follow Effect-TS conventions for backend code
4. Use Biome for linting and formatting
5. Maintain separation between frontend and backend runtimes

## License

MIT