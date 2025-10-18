import { Effect, Layer, Config } from "effect"

export interface ServerConfig {
  readonly port: number
  readonly host: string
  readonly nodeEnv: string
}

export const ServerConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3001)),
  host: Config.string("HOST").pipe(Config.withDefault("localhost")),
  nodeEnv: Config.string("NODE_ENV").pipe(Config.withDefault("development"))
}).pipe(
  Config.map((config): ServerConfig => ({
    port: config.port,
    host: config.host,
    nodeEnv: config.nodeEnv
  }))
)

export const ServerConfigLive = Layer.fromEffect(
  ServerConfig,
  ServerConfig
)

export const layer = ServerConfigLive