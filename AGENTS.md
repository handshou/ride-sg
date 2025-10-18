# AI Agents Documentation

This document outlines the AI agents and their capabilities for the Ride-SG project, which integrates Effect-TS with Next.js server components.

## Project Overview

**Ride-SG** is a Next.js application that demonstrates the integration of Effect-TS functional programming library with React server components. The project showcases how to build robust, type-safe applications using functional programming principles in a modern web framework.

## Architecture

### Core Technologies
- **Next.js 15.5.6** - React framework with App Router
- **Effect-TS** - Functional programming library for TypeScript
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Biome** - Fast linter and formatter

### Effect-TS Integration

The project includes a custom Effect-TS runtime specifically designed for Next.js server components:

#### Key Components

1. **Effect Runtime** (`src/lib/effect-runtime.ts`)
   - `ServerRuntime` - Default runtime for server components
   - `LoggerService` - Logging service with Effect integration
   - `runServerEffect()` - Synchronous Effect execution
   - `runServerEffectAsync()` - Asynchronous Effect execution

2. **Server Component Integration**
   - Effects run during server-side rendering
   - Proper error handling and logging
   - Type-safe Effect composition

## AI Agent Capabilities

### Development Agent
**Role**: Code generation, refactoring, and architecture decisions
**Capabilities**:
- Effect-TS program composition
- Next.js server component optimization
- Type-safe functional programming patterns
- Error handling and logging strategies

### Testing Agent
**Role**: Test generation and quality assurance
**Capabilities**:
- Effect-TS program testing
- Server component testing strategies
- Integration test scenarios
- Performance testing

### Documentation Agent
**Role**: Code documentation and knowledge management
**Capabilities**:
- API documentation generation
- Effect-TS pattern documentation
- Architecture decision records
- Developer onboarding guides

## Development Guidelines

### Effect-TS Patterns

1. **Service Layer Pattern**
   ```typescript
   export class LoggerService {
     log(message: string): Effect.Effect<void> {
       return Effect.sync(() => console.log(message));
     }
   }
   ```

2. **Dependency Injection**
   ```typescript
   export const LoggerServiceTag = Context.GenericTag<LoggerService>("LoggerService");
   export const LoggerServiceLive = Layer.succeed(LoggerServiceTag, new LoggerService());
   ```

3. **Effect Composition**
   ```typescript
   export function createHelloWorldEffect(): Effect.Effect<string> {
     return Effect.gen(function* () {
       const logger = yield* LoggerServiceTag;
       yield* logger.log("Creating hello world message");
       return "Hello World from Effect-TS!";
     });
   }
   ```

### Server Component Integration

1. **Synchronous Effects**
   ```typescript
   const result = runServerEffect(createHelloWorldEffect());
   ```

2. **Asynchronous Effects**
   ```typescript
   const result = await runServerEffectAsync(createAsyncEffect());
   ```

## Best Practices

### Effect-TS in Server Components
- Use synchronous effects for simple operations
- Use asynchronous effects for I/O operations
- Always provide proper error handling
- Leverage Effect's composability for complex operations

### Performance Considerations
- Effects run during server-side rendering
- Minimize heavy computations in effects
- Use Effect's built-in optimizations
- Consider caching strategies for expensive operations

### Error Handling
- Use Effect's error handling mechanisms
- Provide fallback values for critical operations
- Log errors appropriately
- Handle Effect failures gracefully

## Future Enhancements

### Planned Features
- Database integration with Effect-TS
- Real-time updates with Effect streams
- Advanced error recovery patterns
- Performance monitoring and metrics

### Agent Evolution
- Enhanced testing capabilities
- Automated refactoring suggestions
- Performance optimization recommendations
- Security vulnerability detection

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Lint and Format**
   ```bash
   npm run lint
   npm run format
   ```

## Resources

- [Effect-TS Documentation](https://effect.website/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Contributing

When contributing to this project:

1. Follow Effect-TS functional programming patterns
2. Maintain type safety throughout
3. Write comprehensive tests
4. Document new patterns and services
5. Follow the established architecture patterns

## Support

For questions or issues:
- Check the Effect-TS documentation
- Review the code examples in `src/lib/effect-runtime.ts`
- Consult the Next.js server components guide
- Open an issue for specific problems
