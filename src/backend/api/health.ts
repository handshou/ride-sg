import { Router } from "express"
import { Effect, Console } from "effect"

const router = Router()

// Health check endpoint
router.get("/", (req, res) => {
  const healthCheck = Effect.gen(function* () {
    const timestamp = new Date().toISOString()
    const uptime = process.uptime()
    
    yield* Console.log(`Health check requested at ${timestamp}`)
    
    return {
      status: "healthy",
      timestamp,
      uptime: `${Math.floor(uptime)}s`,
      memory: process.memoryUsage(),
      version: process.version
    }
  })

  Effect.runPromise(healthCheck)
    .then((data) => res.json(data))
    .catch((error) => {
      Console.error("Health check failed:", error)
      res.status(500).json({ 
        status: "unhealthy", 
        error: error.message 
      })
    })
})

export { router as healthRoutes }