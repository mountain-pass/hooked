
import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { LOGS_MENU_OPTION, PAGE_SIZE } from './defaults.js'
import { displaySuccessfulScript, fetchHistory } from './history.js'
import { type ProgramOptions } from './program.js'
import { resolveScript } from './scriptExecutors/ScriptExecutor.js'
import {
  isScript,
  type CmdScript,
  type EnvironmentVariables,
  type Script, type StdinResponses,
  type TopLevelEnvironments,
  type TopLevelScripts,
  type YamlConfig
} from './types.js'
import { Environment, toJsonString } from './utils/Environment.js'
import fileUtils from './utils/fileUtils.js'
import { fetchImports } from './utils/imports.js'
import logger from './utils/logger.js'

const isDefined = (o: any): boolean => typeof o !== 'undefined' && o !== null

export const stripLeadingEmojiSpace = (str: string): string => {
  return str.replace(/^\p{Extended_Pictographic}\s+/u, '')
}

export const startsWithEmojiSpace = (str: string): boolean => /^\p{Extended_Pictographic}\s/u.test(str)

export const stripEmojis = (str: string): string => {
  return str.replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const normaliseString = (str: string): string => {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/**
 * Finds a script, given a path.
 */
export const findScript = async (
  config: YamlConfig,
  scriptPath: string[],
  options: ProgramOptions
): Promise<[Script, string[]]> => {
  let script = config.scripts

  // inject _logs_ into scripts
  if (isDefined(config.scripts)) {
    const history = fetchHistory().map((log) => {
      const display = displaySuccessfulScript(log, true)
      const $cmd = displaySuccessfulScript(log, false)
      return [display, { $cmd }] as [string, CmdScript]
    })
    if (history.length > 0) {
      script = { [LOGS_MENU_OPTION]: Object.fromEntries(history), ...script }
    } else {
      logger.debug('No history found.')
    }
  }

  const resolvedScriptPath: string[] = []
  for (const path of scriptPath) {
    if (isDefined(script[path])) {
      // find exact match
      resolvedScriptPath.push(path)
      script = script[path]
    } else if (isDefined(script[stripEmojis(path)])) {
      // find exact match without emojis
      resolvedScriptPath.push(path)
      script = script[path]
    } else {
      // try to find partial match

      // search by prefix
      const entries = Object.entries(script)
      const found = entries.filter(([key, value]) => stripEmojis(normaliseString(key)).startsWith(normaliseString(path)))
      if (found.length === 1) {
        const foundKey = found[0][0]
        resolvedScriptPath.push(foundKey)
        script = found[0][1]
      }
    }
    // no match... prompt
  }
  while (!isScript(script)) {
    if (
      typeof script === 'undefined' ||
      script === null ||
      Object.keys(script).length === 0
    ) {
      const availableScripts = `\t- ${stringifyScripts(config).join('\t- ')}`
      const scriptStr = scriptPath.join(' ')
      throw new Error(`No scripts found at path: ${JSON.stringify(scriptStr)}\nDid you mean?\n${availableScripts}`)
    }
    let choices: string[] = []
    const modifiedScripts: any = {}
    if (config.plugins?.icons === true) {
      // if environment flag is set, add emoji
      choices = Object.entries(script).map(([c, v]) => {
        if (startsWithEmojiSpace(c)) {
          return c
        } else {
          // 🪝📁✅🟢
          const icon = isScript(v) ? '🪝 ' : '📁'
          // const icon = isScript(v) ? '⚡' : '📁'
          const modScript = `${icon} ${c}`
          modifiedScripts[modScript] = true
          return modScript
        }
      })
    } else {
      choices = Object.keys(script)
    }
    if (options.batch === true) {
      throw new Error('Interactive prompts not supported in batch mode. ' +
        `Could not determine a script to run. scriptPath='${scriptPath.join(' ')}'`)
    }
    // ask user for the next script
    await inquirer
      .prompt([
        {
          type: 'list',
          name: 'next',
          message: 'Please select an option:',
          pageSize: PAGE_SIZE,
          default: choices[0],
          choices,
          loop: true
        }
      ])
      .then((answers) => {
        const nextScript = modifiedScripts[answers.next] === true ? stripLeadingEmojiSpace(answers.next) : answers.next
        resolvedScriptPath.push(nextScript)
        script = script[nextScript]
      })
  }
  logger.debug(`Using script: ${resolvedScriptPath.join(' ')}`)
  return [script, resolvedScriptPath]
}

/**
 * Gets a list of executable scripts.
 */
export const stringifyScripts = (config: YamlConfig): string[] => {
  const scripts: string[] = []
  const walk = (obj: any, path: string[] = []): void => {
    for (const key in obj) {
      if (key.startsWith('$')) {
        scripts.push(path.join(' '))
      } else {
        walk(obj[key], [...path, key])
      }
    }
  }
  walk(config.scripts)
  return scripts
}

/**
 * Resolves an environment configuration.
 * @param config
 * @param envName
 * @returns
 */
export const internalFindEnv = (
  config: YamlConfig,
  envName = 'default',
  options: ProgramOptions
): [EnvironmentVariables, string] => {
  if (!isDefined(config) || !isDefined(config.env)) {
    throw new Error('No environments found in config. Must have at least one environment.')
  }

  // look for exact match
  if (isDefined(config.env[envName])) {
    logger.debug(`Using environment: ${envName}`)
    const newLocal = config.env[envName]
    return [newLocal === null ? {} : newLocal, envName]
  }

  // if only one environment, always use that? No

  // search by prefix
  const envs = Object.entries(config.env)
  const found = envs.filter(([key, value]) => key.startsWith(envName))
  if (found.length === 1) {
    const foundEnv = found[0][0]
    logger.debug(`Using environment: ${foundEnv}`)
    const newLocal = found[0][1]
    return [newLocal === null ? {} : newLocal, foundEnv]
  }

  const availableEnvs = envs.map(([key, value]) => `\t- ${key}`).join('\n')
  throw new Error(`Environment not found: ${envName}\nDid you mean?\n${availableEnvs}`)
}

/* Aggregator function, for merging imported configs. */
const _mergeEnvAndScripts = (tmp: YamlConfig, aggrEnvs: TopLevelEnvironments, aggrScripts: TopLevelScripts): void => {
  // merge scripts - easy, they should all have unique top level names!
  Object.assign(aggrScripts, tmp.scripts)
  // merge envs - harder, they can have the same top level names...
  if (isDefined(tmp.env)) {
    Object.entries(tmp.env).forEach(([key, envVars]) => {
      // if they have the same top level name, then merge them...
      if (isDefined(aggrEnvs[key])) {
        aggrEnvs[key] = { ...aggrEnvs[key], ...envVars }
      } else {
        aggrEnvs[key] = envVars
      }
    })
  }
}

export const _resolveAndMergeConfigurationWithImports = async (config: YamlConfig, pullLatestFlag: boolean = false): Promise<void> => {
  // load and apply imports
  const envs: TopLevelEnvironments = {}
  const scripts: TopLevelScripts = {}

  // resolve external imports
  const allLocal = await fetchImports(config.imports, pullLatestFlag)

  // load imports from local
  for (const importPath of allLocal) {
    const filepath = fileUtils.resolvePath(importPath)
    logger.debug(`Importing: ${filepath}`)
    const tmp = await loadConfig(filepath, pullLatestFlag)
    _mergeEnvAndScripts(tmp, envs, scripts)
  }

  // do final top level merge
  _mergeEnvAndScripts(config, envs, scripts)

  // overwrite the existing config object!
  config.env = envs
  config.scripts = scripts
}

/**
 * Finds and resolves the environment.
 * @param config
 * @param environment
 * @returns
 */
export const fetchGlobalEnvVars = async (
  config: YamlConfig = {} as any,
  environmentNames: string[] = ['default'],
  options: ProgramOptions = {} as any,
  envVars: EnvironmentVariables = {}
): Promise<[EnvironmentVariables, string[]]> => {
  // look for and apply all matching environments
  const allEnvNames = new Set<string>()
  for (const envName of environmentNames) {
    const [foundEnv = {}, resolvedEnvName] = internalFindEnv(config, envName, options)
    // collect ALL environment variables (in no particular order!)
    for (const [key, script] of Object.entries(foundEnv)) {
      envVars[key] = script
    }
    allEnvNames.add(resolvedEnvName)
  }

  return [envVars, [...allEnvNames]]
}

export const resolveEnvironmentVariables = async (
  config: YamlConfig = {} as any,
  envVars: EnvironmentVariables,
  stdin: StdinResponses = {},
  env: Environment = new Environment(),
  options: ProgramOptions = {} as any): Promise<void> => {
  // TODO resolve scripts, regardless of order (option 1 - dumb brute force resolution, option 2 - resolve in order)

  // OPTION 1 - brute force, up to 5 attempts...
  let remainingAttempts: Array<[string, Script]> = Object.entries(envVars)
  let errors: Error[] = []
  while (remainingAttempts.length > 0) {
    const retry: Array<[string, Script]> = []
    errors = []
    // attempt to resolve variables, sequentially...
    for (const [key, script] of remainingAttempts) {
      try {
        await resolveScript(key, script, stdin, env, config, options, envVars)
      } catch (err: any) {
        // could not resolve, add to retry list
        errors.push(err)
        retry.push([key, script])
      }
    }
    // no progress made, abort!
    if (retry.length === remainingAttempts.length) {
      logger.debug(`Retry stuck with ${retry.length} unresolved environment variable(s)...`)
      break
    } else if (retry.length > 0) {
      // some progress made, log and retry
      logger.debug(`Retrying ${retry.length} unresolved environment variable(s)...`)
    }
    // update remaining attempts
    remainingAttempts = retry
  }
  // if there are still remaining attempts...
  if (remainingAttempts.length > 0 && errors.length > 0) {
    const errorsString = `- ${errors.map((err) => err.message).join('\n- ')}`
    // const envString = `environment=${toJsonString(envVars, true)}`
    throw new Error(`Could not resolve ${errors.length} environment variables:\n${errorsString}`)
  }

  // OLD WAY - assumes env vars can be resolved in order...
  // for (const [key, script] of keyScriptPairs) {
  //   await resolveScript(key, script, stdin, env, config, options)
  // }
}

export const loadConfig = async (configFile: string, pullLatestFlag = false): Promise<YamlConfig> => {
  const fileExists = fs.existsSync(configFile)
  // file exists
  if (fileExists) {
    const yamlStr = fs.readFileSync(configFile, 'utf-8')
    const config = YAML.parse(yamlStr)
    if (config === null) {
      throw new Error(`Invalid YAML in ${configFile} - ${yamlStr}`)
    }

    // merge imports with current configuration
    await _resolveAndMergeConfigurationWithImports(config, pullLatestFlag)
    return config
  } else {
    throw new Error(`No ${configFile} file found.`)
  }
}
