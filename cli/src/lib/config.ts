import { DEFAULT_CONFIG } from './defaults.js'

import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { type Options } from '../index.js'
import { cyan } from './colour.js'
import { resolveScript } from './scriptExecutors/ScriptExector.js'
import {
  isScript,
  type Config,
  type EnvironmentVariables,
  type ResolvedEnv, type Script, type StdinResponses,
  type TopLevelEnvironments,
  type TopLevelScripts
} from './types.js'

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

/**
 * Finds a script, given a path.
 */
export const findScript = async (
  config: Config,
  scriptPath: string[],
  options: Options
): Promise<[Script, string[]]> => {
  let script = config.scripts
  const resolvedScriptPath: string[] = []
  for (const path of scriptPath) {
    // find exact match
    if (isDefined(script[path])) {
      resolvedScriptPath.push(path)
      script = script[path]
    } else {
      // try to find partial match

      // search by prefix
      const entries = Object.entries(script)
      const found = entries.filter(([key, value]) => key.startsWith(path))
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
      throw new Error(`No scripts found at path: ${scriptStr}\nDid you mean?\n${availableScripts}`)
    }
    const choices = Object.keys(script)
    // TODO auto select if only one choice?
    await inquirer
      .prompt([
        {
          type: 'list',
          name: 'next',
          message: 'Please select a script',
          default: choices[0],
          choices
        }
      ])
      .then((answers) => {
        resolvedScriptPath.push(answers.next)
        script = script[answers.next]
      })
  }
  if (options.debug === true) console.log(cyan(`Using script: ${resolvedScriptPath.join(' ')}`))
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
    if (options.debug === true) console.log(cyan(`Using environment: ${envName}`))
    const newLocal = config.env[envName]
    return [newLocal === null ? {} : newLocal, envName]
  }

  // if only one environment, always use that? No

  // search by prefix
  const envs = Object.entries(config.env)
  const found = envs.filter(([key, value]) => key.startsWith(envName))
  if (found.length === 1) {
    const foundEnv = found[0][0]
    if (options.debug === true) console.log(cyan(`Using environment: ${foundEnv}`))
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
  resolvedEnv: ResolvedEnv = {}
): Promise<void> => {
  // resolve environment variables **IN ORDER**
  for (const [key, script] of Object.entries(environment)) {
    await resolveScript(key, script, stdin, resolvedEnv)
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
    for (const importPath of config.imports) {
      if (options.debug === true) console.log(`Importing: ${importPath}`)
      const tmp = loadConfig(importPath)
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
    await internalResolveEnv(foundEnv, stdin, env)
    allEnvNames.push(resolvedEnvName)
  }
  return [env, stdin, allEnvNames]
}

export const loadConfig = (configFile: string, saveDefaultIfMissing = false): Config => {
  let config
  const fileExists = fs.existsSync(configFile)
  // file exists
  if (fileExists) {
    const yamlStr = fs.readFileSync(configFile, 'utf-8')
    const yaml = YAML.parse(yamlStr)
    if (yaml === null) {
      throw new Error(`Invalid YAML in ${configFile} - ${yamlStr}`)
    }
    return yaml
  } else if (saveDefaultIfMissing) {
    // create default
    console.log(cyan(`No ${configFile} file found. Creating a sample to get you started...`))
    config = YAML.stringify(DEFAULT_CONFIG)
    fs.writeFileSync(configFile, config, 'utf-8')
    return DEFAULT_CONFIG
  } else {
    throw new Error(`No ${configFile} file found.`)
  }
}
