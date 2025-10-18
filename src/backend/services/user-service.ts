import { Effect, Console, Data } from "effect"

// User type definition
export interface User {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly createdAt: Date
}

// Service interface
export interface UserService {
  readonly getUsers: () => Effect.Effect<readonly User[], never, never>
  readonly getUserById: (id: string) => Effect.Effect<User | null, never, never>
  readonly createUser: (data: { name: string; email: string }) => Effect.Effect<User, never, never>
}

// In-memory storage for demo purposes
let users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date("2024-01-01")
  },
  {
    id: "2", 
    name: "Jane Smith",
    email: "jane@example.com",
    createdAt: new Date("2024-01-02")
  }
]

// Service implementation
const makeUserService = (): UserService => ({
  getUsers: () => Effect.gen(function* () {
    yield* Console.log("Retrieving all users from storage")
    return users
  }),

  getUserById: (id: string) => Effect.gen(function* () {
    yield* Console.log(`Looking up user with ID: ${id}`)
    const user = users.find(u => u.id === id) || null
    return user
  }),

  createUser: (data) => Effect.gen(function* () {
    yield* Console.log(`Creating new user: ${data.name}`)
    
    const newUser: User = {
      id: (users.length + 1).toString(),
      name: data.name,
      email: data.email,
      createdAt: new Date()
    }
    
    users = [...users, newUser]
    yield* Console.log(`User created with ID: ${newUser.id}`)
    
    return newUser
  })
})

// Service layer
export const UserServiceLive = Effect.sync(() => makeUserService())

// Service accessor
export const UserService = Effect.service(UserServiceLive)

// Helper functions for direct access
export const getUsers = () => Effect.gen(function* () {
  const service = yield* UserService
  return yield* service.getUsers()
})

export const getUserById = (id: string) => Effect.gen(function* () {
  const service = yield* UserService
  return yield* service.getUserById(id)
})

export const createUser = (data: { name: string; email: string }) => Effect.gen(function* () {
  const service = yield* UserService
  return yield* service.createUser(data)
})