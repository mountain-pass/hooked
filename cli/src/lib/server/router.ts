import express, { type Router } from 'express'
import HJSON from 'hjson'
import { fetchGlobalEnvVars, findScript } from '../config.js'
import { type ProgramOptions } from '../program.js'
import { executeScriptsSequentially, resolveScripts, verifyScriptsAreExecutable } from '../scriptExecutors/ScriptExecutor.js'
import { type StdinResponses, isDefined, isJobsSerialScript, sortCaseInsensitive, type EnvironmentVariables, type ScriptAndPaths, type YamlConfig } from '../types.js'
import { Environment, type RawEnvironment } from '../utils/Environment.js'
import { mergeEnvVars } from '../utils/envVarUtils.js'
import { globalErrorHandler } from './globalErrorHandler.js'
import logger from '../utils/logger.js'

const router = async (
  options: ProgramOptions,
  config: YamlConfig,
  parentEnvVars: EnvironmentVariables
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
    res.json(isDefined(config.imports) ? config.imports : [])
  })

  app.get('/plugins', (req, res) => {
    res.json(isDefined(config.plugins) ? config.plugins : {})
  })

  app.get('/scripts', (req, res) => {
    res.json(isDefined(config.scripts) ? config.scripts : {})
  })

  app.get('/scripts/:scriptPath', globalErrorHandler(async (req, res) => {
    const scriptPath = req.params.scriptPath.split(' ')
    const rootScriptAndPaths = await findScript(config, scriptPath, options)
    const [script, paths] = rootScriptAndPaths
    res.json({ script, paths })
  }))

  /**
   * Runs the given script.
   */
  app.get('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    const result = await invoke(providedEnvNames, scriptPath, {})
    res.json(result)
  }))

  /**
   * Runs the given script with environment variables.
   */
  app.post('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    const stdin = req.body ?? {}
    const result = await invoke(providedEnvNames, scriptPath, stdin)
    res.json(result)
  }))

  /**
   * Invokes a script with the provided environment names.
   * @param providedEnvNames
   * @param scriptPath
   * @returns
   */
  const invoke = async (providedEnvNames: string[], scriptPath: string[], stdin: StdinResponses): Promise<any> => {
    const envVars: EnvironmentVariables = { ...parentEnvVars }
    logger.debug(`Running script: env=${providedEnvNames.join(',')} script=${scriptPath.join(',')}`)

    // find the script to execute...
    const rootScriptAndPaths = await findScript(config, scriptPath, options)
    const [script, paths] = rootScriptAndPaths

    // merge in the stdin...
    mergeEnvVars(envVars, stdin)

    // fetch the environment variables...
    await fetchGlobalEnvVars(
      config,
      providedEnvNames,
      options,
      envVars
    )
    logger.debug(`Resolved environment: ${JSON.stringify(envVars)}`)

    // executable scripts
    let executableScriptsAndPaths: ScriptAndPaths[] = [rootScriptAndPaths]

    if (isJobsSerialScript(script)) {
      // resolve job definitions
      executableScriptsAndPaths = await resolveScripts(paths, script, config, options)
    }

    // check executable scripts are actually executable
    verifyScriptsAreExecutable(executableScriptsAndPaths)

    // execute scripts sequentially
    const outputs = await executeScriptsSequentially(
      executableScriptsAndPaths,
      stdin,
      new Environment(),
      config,
      options,
      envVars,
      false,
      false
    )

    return {
      success: true,
      finishedAt: new Date().toISOString(),
      env: providedEnvNames,
      paths,
      envVars,
      outputs
    }
  }

  return app
}

export default { router }
