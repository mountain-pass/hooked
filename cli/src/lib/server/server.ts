import express from 'express'
import http from 'http'
import https from 'https'
import { type ProgramOptions } from '../program.js'
import { isString, type YamlConfig } from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import router from './router.js'
import fsPromise from 'fs/promises'

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

  // api-key verification
  const apiKey = options.apiKey
  if (isString(apiKey)) {
    const requiredAuthorizationHeader = `Bearer ${apiKey}`
    app.use((req, res, next) => {
      if (req.header('authorization') !== requiredAuthorizationHeader) {
        res.status(401).json({ message: 'Invalid authorization token.' }).end()
      } else {
        next()
      }
    })
  }
  app.use(express.json())
  app.use(await router.router(systemProcessEnvs, options, config))

  // ssl setup
  if ((isString(options.sslCert) && !isString(options.sslKey)) || (!isString(options.sslCert) && isString(options.sslKey))) {
    throw new Error('ssl-key and ssl-cert must both be provided together.')
  }
  const isHttps = isString(options.sslCert) && isString(options.sslKey)
  const server = isHttps
    ? https.createServer({
      cert: await fsPromise.readFile(options.sslCert as string, 'utf-8'),
      key: await fsPromise.readFile(options.sslKey as string, 'utf-8')
    }, app)
    : http.createServer(app)

  // listen
  server.listen(port, () => {
    const toggles = `api-key=${isString(apiKey) ? '✅' : '🙅'}, ssl=${isHttps ? '✅' : '🙅'}`
    logger.info(`Server listening: ${isHttps ? 'https' : 'http'}://localhost:${port} (${toggles})`)
  })
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
