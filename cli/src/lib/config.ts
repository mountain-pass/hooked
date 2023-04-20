import { CONFIG_PATH, DEFAULT_CONFIG } from './defaults.js'

import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import { cyan } from './colour.js'
import { executeCmd } from './scriptExecutors/$cmd.js'
import { type EnvScript, type CmdScript, type Config, type Env, type ResolvedEnv, type Script, type StdinResponses, type StdinScript, type ResolveScript, type Dictionary } from './types.js'

const isDefined = (o: any): boolean => typeof o !== 'undefined'

const isLeafNode = (script: any): boolean => isDefined(script) && (isDefined(script.$cmd) || isDefined(script.$stdin))

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
  while (!isLeafNode(script)) {
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
): Promise<void> => {
  if (isDefined((script as CmdScript).$cmd)) {
    executeCmd((script as CmdScript).$cmd, {
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
 * Resolves environment variables
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
  const resolves: Dictionary<ResolveScript> = {}
  for (const [key, value] of Object.entries(environment)) {
    // RESOLVE $cmd
    if (isDefined(value) && isDefined(value.$cmd)) {
      const script = value as CmdScript
      let newValue = executeCmd(script.$cmd)
      // remove trailing newlines
      newValue = newValue.replace(/(\r?\n)*$/, '')
      resolvedEnv[key] = newValue
    } else if (isDefined(value) && isDefined(value.$resolve)) {
      resolves[key] = value
    } else if (isDefined(value) && isDefined(value.$env)) {
      const script = value as EnvScript
      const resolvedEnvValue = globalEnv[script.$env]
      if (isDefined(resolvedEnvValue)) {
        resolvedEnv[key] = resolvedEnvValue
      } else {
        throw new Error(`Global environment variable not found: ${script.$env}`)
      }
    } else if (isDefined(value) && isDefined(value.$stdin)) {
      const script = value as StdinScript
      // RESOLVE $stdin
      // if we already have a response, use that
      if (isDefined(stdin[key])) {
        resolvedEnv[key] = stdin[key]
      } else {
        await inquirer
          .prompt([
            {
              type: 'text',
              name: key,
              message: script.$stdin,
              default: script.$default
            }
          ])
          .then((answers) => {
            stdinResponses[key] = answers[key]
            resolvedEnv[key] = answers[key]
          })
      }
    }
  }
  // process resolves last of all... up to 5x times (could be optimised!)
  let unresolved = Object.entries(resolves)
  for (let i = 0; unresolved.length > 0 && i < 5; i++) {
    const tmp: Dictionary<ResolveScript> = {}
    for (const [key, script] of unresolved) {
      // use string replacement to resolve from the resolvedEnv
      const newValue = script.$resolve.replace(/\${([^}]+)}/g, (match, p1) => {
        const newVal = resolvedEnv[p1]
        if (isDefined(newVal) && typeof newVal === 'string') {
          return newVal
        } else {
          return match
        }
      })
      resolvedEnv[key] = newValue
      const notFullyResolved = /\${([^}]+)}/g.test(newValue)
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
