import { Effect, Runtime, Layer, Console } from "effect"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import { apiRouter } from "./api/router"
import { ServerConfig } from "./config/server"

// Main application effect
const program = Effect.gen(function* () {
  const config = yield* ServerConfig
  const app = express()

  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json())

  // API routes
  app.use("/api", apiRouter)

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  })

  // Start server
  const server = app.listen(config.port, () => {
    Console.log(`🚀 Backend server running on port ${config.port}`)
  })

  // Graceful shutdown
  process.on("SIGTERM", () => {
    Console.log("SIGTERM received, shutting down gracefully")
    server.close(() => {
      Console.log("Server closed")
      process.exit(0)
    })
  })

  return server
})

// Create runtime with configuration layer
const runtime = Runtime.make(ServerConfig.layer)

// Run the program
Effect.runPromise(program.pipe(Effect.provide(ServerConfig.layer)))
  .then(() => Console.log("Backend started successfully"))
  .catch((error) => {
    Console.error("Failed to start backend:", error)
    process.exit(1)
  })