import express from 'express'
import http from 'http'
import https from 'https'
import { type ProgramOptions } from '../program.js'
import { isDefined, isString, isUndefined, type YamlConfig } from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import router from './router.js'
import fsPromise from 'fs/promises'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { findFileInAncestors } from '../utils/packageJson.js'
import jwt, { HookedJwtPayload } from './auth/jwt.js'
import { type JwtPayload } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { type HookedServerSchemaType } from '../schema/HookedSchema.js'

const corsOptions = {
  credentials: true,
  origin: (origin: any, callback: any) => callback(null, true)
  // origin: function(origin: any, callback: any) {
  //   const originIsSame = typeof origin === 'undefined'
  //   if (originIsSame || allowlist.indexOf(origin) !== -1) {
  //     callback(null, true)
  //   } else {
  //     callback(new Error(`Domain not allowed by CORS - ${origin}`))
  //   }
  // }
}

export interface AuthorisedUser { username: string, roles: string[] }

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
  config: HookedServerSchemaType
): Promise<void> => {
  logger.info(`Need salt? Try this: ${bcrypt.genSaltSync(10)}`)

  // determine public path
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const publicPath = findFileInAncestors(dirname, 'public', false)
  logger.debug(`Serving static files from: ${publicPath}`)

  // setup express
  const app = express()
  app.enable('trust proxy')
  app.set('etag', 'strong')
  app.use(cors(corsOptions))

  jwt.initialise(
    app,
    // authenticator
    (auth) => {
      const { username, password } = auth
      // encrypt and compare the password
      const user = (config.users ?? []).find((user) => user.username === username)
      if (isDefined(user)) {
        logger.debug(`Authenticating user: ${username}`)
        if (bcrypt.compareSync(password, user.password)) {
          const { username, roles } = user
          return { username, roles } satisfies AuthorisedUser
        } else {
          logger.info(`Invalid password for user: ${username} pw: ${bcrypt.hashSync(password, config.auth.salt)}`)
        }
      } else {
        logger.info(`Rejecting unknown user: ${username}`)
      }
    },
    // authoriser
    (jwtPayload) => {
      // logger.info('Authorising user - ' + JSON.stringify(jwtPayload))
      const { username, roles } = jwtPayload
      // verify user exists
      const user = (config.users ?? []).find((user) => user.username === username)
      if (isDefined(user)) {
        // logger.info(`Authorised user: ${username}`)
        return { username, roles } satisfies AuthorisedUser
      } else {
        logger.info(`Rejected user: ${username}`)
      }
    })

  // auth by apikey or jwt
  app.use('/api', (req, res, next) => {
    if (isString(options.apiKey) && req.header('authorization') === `Bearer ${options.apiKey}`) {
      next()
    } else {
      jwt.requireSigninMiddleware(req, res, next)
    }
  })

  app.get('/api/status', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
  app.use('/api', await router.router(systemProcessEnvs, options))
  app.use('/', express.static(publicPath))

  // ssl setup
  if ((isString(options.sslCert) && !isString(options.sslKey)) || (!isString(options.sslCert) && isString(options.sslKey))) {
    throw new Error('sslKey and sslCert must both be provided together.')
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
    const apiKey = options.apiKey
    const toggles = `api-key=${isString(apiKey) ? apiKey.substring(0, 1).padEnd(apiKey.length, '*') : '🙅'}, ssl=${isHttps ? '✅' : '🙅'}`
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
  process.on('SIGTERM', shutdownServer)
}

export default { startServer }
