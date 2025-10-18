import { Router } from "express"
import { userRoutes } from "./users"
import { healthRoutes } from "./health"

export const apiRouter = Router()

// Mount route handlers
apiRouter.use("/users", userRoutes)
apiRouter.use("/health", healthRoutes)

// API info endpoint
apiRouter.get("/", (req, res) => {
  res.json({
    message: "Effect-TS Backend API",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      health: "/api/health"
    }
  })
})