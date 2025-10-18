import { Router } from "express"
import { Effect, Console, Data } from "effect"
import { UserService } from "../services/user-service"

const router = Router()

// Error classes
class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
}> {}

// Get all users
router.get("/", (req, res) => {
  const getUsers = Effect.gen(function* () {
    yield* Console.log("Fetching all users")
    const users = yield* UserService.getUsers()
    return users
  })

  Effect.runPromise(getUsers)
    .then((users) => res.json({ users }))
    .catch((error) => {
      Console.error("Failed to fetch users:", error)
      res.status(500).json({ error: "Failed to fetch users" })
    })
})

// Get user by ID
router.get("/:id", (req, res) => {
  const { id } = req.params

  const getUserById = Effect.gen(function* () {
    if (!id) {
      yield* Effect.fail(new ValidationError({ message: "User ID is required" }))
    }

    yield* Console.log(`Fetching user with ID: ${id}`)
    const user = yield* UserService.getUserById(id)
    
    if (!user) {
      yield* Effect.fail(new UserNotFoundError({ userId: id }))
    }

    return user
  })

  Effect.runPromise(getUserById)
    .then((user) => res.json({ user }))
    .catch((error) => {
      if (error._tag === "UserNotFoundError") {
        res.status(404).json({ error: `User with ID ${error.userId} not found` })
      } else if (error._tag === "ValidationError") {
        res.status(400).json({ error: error.message })
      } else {
        Console.error("Failed to fetch user:", error)
        res.status(500).json({ error: "Failed to fetch user" })
      }
    })
})

// Create new user
router.post("/", (req, res) => {
  const { name, email } = req.body

  const createUser = Effect.gen(function* () {
    if (!name || !email) {
      yield* Effect.fail(new ValidationError({ 
        message: "Name and email are required" 
      }))
    }

    yield* Console.log(`Creating user: ${name} (${email})`)
    const user = yield* UserService.createUser({ name, email })
    return user
  })

  Effect.runPromise(createUser)
    .then((user) => res.status(201).json({ user }))
    .catch((error) => {
      if (error._tag === "ValidationError") {
        res.status(400).json({ error: error.message })
      } else {
        Console.error("Failed to create user:", error)
        res.status(500).json({ error: "Failed to create user" })
      }
    })
})

export { router as userRoutes }