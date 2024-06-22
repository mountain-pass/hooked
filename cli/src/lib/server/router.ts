import express, { type Router } from 'express'
import { type ProgramOptions } from '../program.js'
import { isDefined, sortCaseInsensitive, type YamlConfig } from '../types.js'

const router = async (options: ProgramOptions, config: YamlConfig): Promise<Router> => {
  const app = express.Router()

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/env', (req, res) => {
    const result = Object.entries(config.env).reduce<Record<string, string[]>>((prev, curr) => {
      const [key, envVars] = curr
      prev[key] = Object.keys(envVars).sort(sortCaseInsensitive)
      return prev
    }, {})
    res.json(result)
  })

  app.get('/imports', (req, res) => {
    res.json(isDefined(config.imports) ? config.imports : [])
  })

  app.get('/plugins', (req, res) => {
    res.json(isDefined(config.plugins) ? config.plugins : {})
  })

  app.get('/scripts', (req, res) => {
    res.json(isDefined(config.scripts) ? config.scripts : {})
  })

  /**
   * Runs the given script
   */
  app.get('/scripts', (req, res) => {
    res.json(config.scripts)
  })

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/scripts/:script', (req, res) => {
    res.json(config.scripts)
  })

  return app
}

export default { router }
