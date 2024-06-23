import express, { type Router } from 'express'
import fsPromise from 'fs/promises'
import common from '../common/invoke.js'
import loaders from '../common/loaders.js'
import { findScript } from '../config.js'
import defaults from '../defaults.js'
import { type ProgramOptions } from '../program.js'
import {
  sortCaseInsensitive,
  type YamlConfig
} from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import { globalErrorHandler } from './globalErrorHandler.js'

const router = async (
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions,
  yamlConfig: YamlConfig
): Promise<Router> => {
  const app = express.Router()

  let config = yamlConfig
  let lastUpdated = -1
  let lastChecked = -1

  /** Checks whether the root config file modification time is newer, and reloads the configuration. (Max once per second) */
  const checkIfConfigHasChanged = async (): Promise<void> => {
    if ((Date.now() - lastChecked) > 1000) {
      // haven't checked in the last second, re-check...
      lastChecked = Date.now()
      const f = defaults.getDefaults().HOOKED_FILE
      const stats = await fsPromise.stat(f)
      if (stats.mtimeMs > lastUpdated) {
        // changed, reload
        logger.debug(`Configuration changed, reloading '${f}'`)
        lastUpdated = stats.mtimeMs
        config = await loaders.loadConfiguration(systemProcessEnvs, options)
      }
    }
  }

  /**
   * Endpoint for verification.
   */
  app.get('/', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/env', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    const result = Object.entries(config.env).reduce<Record<string, string[]>>((prev, curr) => {
      const [key, env] = curr
      prev[key] = Object.keys(env).sort(sortCaseInsensitive)
      return prev
    }, {})
    res.json(result)
  }))

  app.get('/imports', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    res.json(config.imports ?? [])
  }))

  app.get('/plugins', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    res.json(config.plugins ?? {})
  }))

  app.get('/scripts', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    res.json(config.scripts ?? {})
  }))

  app.get('/scripts/:scriptPath', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    const scriptPath = req.params.scriptPath.split(' ')
    const [script, paths] = await findScript(config, scriptPath, options)
    res.json({ script, paths })
  }))

  /**
   * Runs the given script.
   */
  app.get('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    res.json(await common.invoke(systemProcessEnvs, options, config, providedEnvNames, scriptPath, {}, false, false))
  }))

  /**
   * Runs the given script with environment variables.
   */
  app.post('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    await checkIfConfigHasChanged()
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    const stdin = req.body ?? {}
    res.json(await common.invoke(systemProcessEnvs, options, config, providedEnvNames, scriptPath, stdin, false, false))
  }))

  return app
}

export default { router }
