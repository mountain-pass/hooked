import { CONFIG_PATH, DEFAULT_CONFIG } from './defaults.js'

import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { cyan } from './colour.js'
import { executeCmd } from './scriptExecutors/$cmd.js'
import {
  isCmdScript,
  isEnvScript,
  isResolveScript,
  isScript,
  isStdinScript,
  type CmdScript, type Config,
  type Dictionary,
  type Env,
  type ResolveScript,
  type ResolvedEnv, type Script, type StdinResponses
} from './types.js'
import { resolveScript } from './scriptExecutors/ScriptExector.js'

const isDefined = (o: any): boolean => typeof o !== 'undefined'

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
  scriptPath: string[]
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
  console.log(cyan(`Using script: ${resolvedScriptPath.join(' ')}`))
  return [script, resolvedScriptPath]
}

/**
 * Generic wrapper around any executable "Script" object.
 * @param script
 * @param env
 */
export const executeScript = async (
  script: Script,
  env: ResolvedEnv
): Promise<string | undefined> => {
  if (isCmdScript(script)) {
    const requiredKeys = getEnvVarRefs(script.$cmd)
    const missingKeys = requiredKeys.filter(key => typeof env[key] === 'undefined')
    if (missingKeys.length > 0) {
      throw new Error(`Script is missing required environment variables: ${JSON.stringify(missingKeys)}`)
    }
    return executeCmd(script.$cmd, {
      stdio: 'inherit',
      env
    })
  }
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

export const parseConfig = (config: string, env?: any): Config => {
  return YAML.parse(config)
}

/**
 * Resolves an environment configuration.
 * @param config
 * @param env
 * @returns
 */
export const internalFindEnv = (
  config: Config,
  env = 'default'
): [Env, string] => {
  // look for exact match
  if (isDefined(config.env[env])) {
    console.log(cyan(`Using environment: ${env}`))
    return [config.env[env] as Env, env]
  }

  // if only one environment, always use that? No

  // search by prefix
  const envs = Object.entries(config.env)
  const found = envs.filter(([key, value]) => key.startsWith(env))
  if (found.length === 1) {
    const foundEnv = found[0][0]
    console.log(cyan(`Using environment: ${foundEnv}`))
    return [found[0][1] as Env, foundEnv]
  }

  const availableEnvs = envs.map(([key, value]) => `\t- ${key}`).join('\n')
  throw new Error(`Environment not found: ${env}\nDid you mean?\n${availableEnvs}`)
}

/**
 * Resolves environment variables in order of $stdin & $env, then $cmd, then $resolve.
 * @param environment
 * @returns
 */
const internalResolveEnv = async (
  environment: Env,
  stdin: StdinResponses = {},
  globalEnv: ResolvedEnv = {}
): Promise<[ResolvedEnv, StdinResponses]> => {
  const resolvedEnv: ResolvedEnv = { ...globalEnv, ...environment }
  const stdinResponses = { ...stdin }
  // defer the resolves until the end...
  const cmds: Dictionary<CmdScript> = {}
  const resolves: Dictionary<ResolveScript> = {}
  // first pass, resolve $env & $stdin
  for (const [key, value] of Object.entries(environment)) {
    if (isCmdScript(value)) {
      cmds[key] = value
    } else if (isResolveScript(value)) {
      resolves[key] = value
    } else if (isEnvScript(value)) {
      resolvedEnv[key] = await resolveScript(key, value, stdinResponses, resolvedEnv)
    } else if (isStdinScript(value)) {
      resolvedEnv[key] = await resolveScript(key, value, stdinResponses, resolvedEnv)
      stdinResponses[key] = resolvedEnv[key]
    }
  }
  // process `cmds` env vars
  for (const [key, script] of Object.entries(cmds)) {
    resolvedEnv[key] = await resolveScript(key, script, stdinResponses, resolvedEnv)
  }
  // process `resolves` env vars last of all... up to 5x times (could be optimised!)
  let unresolved = Object.entries(resolves)
  for (let i = 0; unresolved.length > 0 && i < 5; i++) {
    const tmp: Dictionary<ResolveScript> = {}
    for (const [key, script] of unresolved) {
      // use string replacement to resolve from the resolvedEnv
      resolvedEnv[key] = await resolveScript(key, script, stdinResponses, resolvedEnv)
      const notFullyResolved = /\${([^}]+)}/g.test(resolvedEnv[key])
      if (notFullyResolved) {
        tmp[key] = script
      }
    }
    unresolved = Object.entries(tmp)
  }
  return [resolvedEnv, stdinResponses]
}

/**
 * Finds and resolves the environment.
 * @param config
 * @param environment
 * @returns
 */
export const resolveEnv = async (
  config: Config,
  environmentNames: string[] = ['default'],
  stdin: StdinResponses = {},
  globalEnv: ResolvedEnv = {}
): Promise<[ResolvedEnv, StdinResponses, string[]]> => {
  let allEnvs: ResolvedEnv = { ...globalEnv }
  let allStdinResponses: StdinResponses = { ...stdin }
  const allEnvNames: string[] = []
  for (const environment of environmentNames) {
    const [env, envName] = internalFindEnv(config, environment)
    const [resolvedEnv, stdinResponses] = await internalResolveEnv(env, stdin, allEnvs)
    allEnvs = { ...allEnvs, ...resolvedEnv }
    allStdinResponses = { ...allStdinResponses, ...stdinResponses }
    allEnvNames.push(envName)
  }
  return [allEnvs, allStdinResponses, allEnvNames]
}

export const loadConfig = (): string => {
  let config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log(cyan(`No ${CONFIG_PATH} file found. Creating a sample to get your started...`))
    config = YAML.stringify(DEFAULT_CONFIG)
    fs.writeFileSync(CONFIG_PATH, config, 'utf-8')
  } else {
    config = fs.readFileSync(CONFIG_PATH, 'utf-8')
  }
  return config
}
