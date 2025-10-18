import { Effect, Runtime, Layer } from "effect"
import { NodeServer } from "@effect/platform-node"
import { Express } from "@effect/platform"
import express from "express"
import cors from "cors"
import helmet from "helmet"

// Define the server layer
const ServerLive = Layer.succeed(
  Express.Express,
  Express.make(() => {
    const app = express()
    app.use(helmet())
    app.use(cors())
    app.use(express.json())
    
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() })
    })
    
    app.get("/api/hello", (req, res) => {
      res.json({ message: "Hello from Effect-TS backend!" })
    })
    
    return app
  })
)

// Main program
const program = Effect.gen(function* () {
  const express = yield* Express.Express
  const server = yield* NodeServer.layer(express, { port: 3001 })
  
  yield* Effect.log("Server started on port 3001")
  yield* Effect.never // Keep the server running
})

// Run the program
const runtime = Runtime.make(ServerLive)
Runtime.runPromise(runtime)(program).catch(console.error)
