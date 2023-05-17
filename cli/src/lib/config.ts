
import fs from 'fs'
import inquirer from 'inquirer'
import path from 'path'
import YAML from 'yaml'
import { cyan } from './colour.js'
import { LOGS_MENU_OPTION, PAGE_SIZE, getLocalImportsCachePath } from './defaults.js'
import { displaySuccessfulScript, fetchHistory } from './history.js'
import { type Options } from './program.js'
import { resolveScript } from './scriptExecutors/ScriptExector.js'
import {
  isScript,
  type CmdScript,
  type Config,
  type EnvironmentVariables,
  type ResolvedEnv, type Script, type StdinResponses,
  type TopLevelEnvironments,
  type TopLevelScripts
} from './types.js'
import fileUtils from './utils/fileUtils.js'
import logger from './utils/logger.js'

const isDefined = (o: any): boolean => typeof o !== 'undefined' && o !== null

/**
 * Remove env vars that are the same as the global env.
 * @param env
 * @param processEnv
 * @returns
 */
export const stripProcessEnvs = (env: ResolvedEnv, processEnv: ResolvedEnv = process.env as any): ResolvedEnv => {
  const envCopy = Object.fromEntries(Object.entries(env).filter(([key, value]) => {
    // if value is the same, delete it
    return env[key] !== processEnv[key]
  }))
  return envCopy
}

/**
 * Retrieves all ${...} references from a string.
 * @param str e.g. 'hello ${name}'
 * @returns e.g. ['name']
 */
export const getEnvVarRefs = (str: string): string[] => {
  const regex = /\${([^}]+)}/g
  return Object.keys([...str.matchAll(regex)].reduce((prev: any, curr: string[]) => {
    prev[curr[1]] = 1
    return prev
  }, {}))
}

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
  config: Config,
  scriptPath: string[],
  options: Options
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
      // if enviornment flag is set, add emoji
      choices = Object.entries(script).map(([c, v]) => {
        if (startsWithEmojiSpace(c)) {
          return c
        } else {
          // 🪝📁✅🟢
          const icon = isScript(v) ? '🪝 ' : '📁'
          const modScript = `${icon} ${c}`
          modifiedScripts[modScript] = true
          return modScript
        }
      })
    } else {
      choices = Object.keys(script)
    }
    if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode.')
    // ask user for the next script
    await inquirer
      .prompt([
        {
          type: 'rawlist',
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
export const stringifyScripts = (config: Config): string[] => {
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
  config: Config,
  envName = 'default',
  options: Options
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

/**
 * Resolves environment variables in order of $stdin & $env, then $cmd, then $resolve.
 * @param environment
 * @returns
 */
export const internalResolveEnv = async (
  environment: EnvironmentVariables = {},
  stdin: StdinResponses = {},
  resolvedEnv: ResolvedEnv = {},
  config: Config,
  options: Options
): Promise<void> => {
  // resolve environment variables **IN ORDER**
  for (const [key, script] of Object.entries(environment)) {
    await resolveScript(key, script, stdin, resolvedEnv, config, options)
  }
}

/**
 * Finds and resolves the environment.
 * @param config
 * @param environment
 * @returns
 */
export const resolveEnv = async (
  config: Config = {} as any,
  environmentNames: string[] = ['default'],
  stdin: StdinResponses = {},
  env: ResolvedEnv = {},
  options: Options = {} as any
): Promise<[ResolvedEnv, StdinResponses, string[]]> => {
  // load and apply imports
  const envs: TopLevelEnvironments = {}
  const scripts: TopLevelScripts = {}

  /* Aggregator function, for merging imported configs. */
  const mergeEnvAndScripts = (tmp: Config, aggrEnvs: TopLevelEnvironments, aggrScripts: TopLevelScripts): void => {
    // merge scripts
    Object.assign(aggrScripts, tmp.scripts)
    // merge envs
    if (isDefined(tmp.env)) {
      Object.entries(tmp.env).forEach(([key, envVars]) => {
        // merge environments
        if (!isDefined(env)) {
          throw new Error(`Environment ${key} is null.`)
        }
        if (isDefined(aggrEnvs[key])) {
          aggrEnvs[key] = { ...aggrEnvs[key], ...envVars }
        } else {
          aggrEnvs[key] = envVars
        }
      })
    }
    // TODO handle imports?
  }

  // START IMPORTS

  if (Array.isArray(config.imports) && config.imports.length > 0) {
    const remotes = config.imports.filter(i => i.startsWith('https://'))
    const remotesCache = remotes.map(i => getLocalImportsCachePath(path.basename(i)))
    const allLocal = config.imports.map(i => i.startsWith('https://') ? getLocalImportsCachePath(path.basename(i)) : i)

    // pull remotes if not cached
    if (options.pull === true) {
      // force-pull remotes
      await Promise.all(remotes.map(async (url, i) => {
        logger.debug(`Downloading remote import #1: ${url} -> ${remotesCache[i]}`)
        await fileUtils.downloadFile(url, remotesCache[i])
      }))
    } else {
      // pull remotes if not cached
      await Promise.all(remotes.map(async (url, i) => {
        if (!fs.existsSync(remotesCache[i])) {
          logger.debug(`Downloading remote import #2: ${url} -> ${remotesCache[i]}`)
          await fileUtils.downloadFile(url, remotesCache[i])
        }
      }))
    }
    // complain if any local files are missing
    const missingLocalFiles = allLocal.filter(i => !fs.existsSync(fileUtils.resolvePath(i)))
    if (missingLocalFiles.length > 0) {
      throw new Error(`Missing import files: ${missingLocalFiles.join(', ')}`)
    }

    // load imports from local
    for (const importPath of allLocal) {
      const filepath = fileUtils.resolvePath(importPath)
      logger.debug(`Importing: ${filepath}`)
      const tmp = loadConfig(filepath)
      mergeEnvAndScripts(tmp, envs, scripts)
    }
  }
  // do final top level merge
  mergeEnvAndScripts(config, envs, scripts)
  config.scripts = scripts
  config.env = envs

  // END IMPORTS

  // look for and apply all matching environments
  const allEnvNames: string[] = []
  for (const envName of environmentNames) {
    const [foundEnv = {}, resolvedEnvName] = internalFindEnv(config, envName, options)
    await internalResolveEnv(foundEnv, stdin, env, config, options)
    allEnvNames.push(resolvedEnvName)
  }
  return [env, stdin, allEnvNames]
}

export const loadConfig = (configFile: string): Config => {
  const fileExists = fs.existsSync(configFile)
  // file exists
  if (fileExists) {
    const yamlStr = fs.readFileSync(configFile, 'utf-8')
    const yaml = YAML.parse(yamlStr)
    if (yaml === null) {
      throw new Error(`Invalid YAML in ${configFile} - ${yamlStr}`)
    }
    return yaml
  } else {
    throw new Error(`No ${configFile} file found.`)
  }
}
