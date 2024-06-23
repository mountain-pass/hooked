import express from 'express'
import router from './router.js'
import logger from '../utils/logger.js'
import { type ProgramOptions } from '../program.js'
import { type EnvironmentVariables, type YamlConfig } from '../types'
import { type RawEnvironment, type Environment } from '../utils/Environment.js'

/**
 * Starts the REST API server.
 * @param port
 * @param options
 * @param config
 * @param envVars
 * @param env
 */
const startServer = async (
  port: number,
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions,
  config: YamlConfig
): Promise<void> => {
  const app = express()
  app.use(express.json())
  app.use(await router.router(systemProcessEnvs, options, config))
  const server = app.listen(port, () => { logger.info(`Server listening: http://localhost:${port}`) })
  const shutdownServer = (): void => {
    if (server.listening) {
      logger.debug('Server shutting down...')
      server.close((err) => {
        if (err != null) {
          console.error(`Error stopping server: ${err.message}`)
          process.exit(1)
        } else {
          logger.debug('Server shutdown successfully.')
        }
      })
    }
  }
  process.on('SIGINT', shutdownServer)
}

export default { startServer }
