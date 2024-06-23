import express, { type Router } from 'express'
import { findScript } from '../config.js'
import { type ProgramOptions } from '../program.js'
import common from '../runtime/common.js'
import {
  sortCaseInsensitive,
  type EnvironmentVariables,
  type YamlConfig
} from '../types.js'
import { globalErrorHandler } from './globalErrorHandler.js'
import { type Environment } from '../utils/Environment.js'

const router = async (
  options: ProgramOptions,
  config: YamlConfig,
  parentEnvVars: EnvironmentVariables,
  parentEnvironment: Environment
): Promise<Router> => {
  const app = express.Router()

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/env', (req, res) => {
    const result = Object.entries(config.env).reduce<Record<string, string[]>>((prev, curr) => {
      const [key, env] = curr
      prev[key] = Object.keys(env).sort(sortCaseInsensitive)
      return prev
    }, {})
    res.json(result)
  })

  app.get('/imports', (req, res) => {
    res.json(config.imports ?? [])
  })

  app.get('/plugins', (req, res) => {
    res.json(config.plugins ?? {})
  })

  app.get('/scripts', (req, res) => {
    res.json(config.scripts ?? {})
  })

  app.get('/scripts/:scriptPath', globalErrorHandler(async (req, res) => {
    const scriptPath = req.params.scriptPath.split(' ')
    const [script, paths] = await findScript(config, scriptPath, options)
    res.json({ script, paths })
  }))

  /**
   * Runs the given script.
   */
  app.get('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    res.json(await common.invoke(options, config, parentEnvVars, parentEnvironment, providedEnvNames, scriptPath, {}, false, false))
  }))

  /**
   * Runs the given script with environment variables.
   */
  app.post('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    const stdin = req.body ?? {}
    res.json(await common.invoke(options, config, parentEnvVars, parentEnvironment, providedEnvNames, scriptPath, stdin, false, false))
  }))

  return app
}

export default { router }
