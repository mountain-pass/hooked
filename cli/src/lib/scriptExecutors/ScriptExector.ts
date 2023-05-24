import inquirer from 'inquirer'
import { getEnvVarRefs, internalResolveEnv, resolveEnv } from '../config.js'
import {
  isCmdScript,
  isDefined,
  isScript,
  isStdinScript,
  type CmdScript, type EnvScript,
  type ResolveScript,
  type ResolvedEnv,
  type Script,
  type StdinResponses,
  type StdinScript,
  isInternalScript,
  type InternalScript,
  type Config,
  isStdinScriptFieldsMapping,
  isString,
  isObject
} from '../types.js'
import { cleanupOldTmpFiles, executeCmd } from './$cmd.js'
import { PAGE_SIZE } from '../defaults.js'
import { type Options } from '../program.js'
import logger from '../utils/logger.js'
import jp from 'jsonpath'
import docker from './docker.js'

// Environment variable names that are exempt from being resolved
const EXEMPT_ENVIRONMENT_KEYWORDS = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']

export interface ScriptExecutorResponse {
  value: string
  stdinResponses?: StdinResponses
}

export const isScriptExectorResponse = (o: any): o is ScriptExecutorResponse => {
  return typeof o === 'object' && typeof o.value === 'string'
}

export const resolveInternalScript = async (
  key: string,
  script: InternalScript,
  stdin: StdinResponses,
  env: ResolvedEnv,
  config: Config,
  options: Options
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    // TODO provide stdin
    await internalResolveEnv(script.$env, stdin, env, config, options)
  }

  const result = await script.$internal({ key, stdin, env })
  if (typeof result === 'string') {
    env[key] = result
  }
  return result
}

export const resolveCmdScript = async (
  key: string | undefined,
  script: CmdScript,
  stdin: StdinResponses,
  env: ResolvedEnv,
  config: Config,
  options: Options,
  captureOutput = true
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    await internalResolveEnv(script.$env, stdin, env, config, options)
  }

  let onetimeEnvironment: ResolvedEnv = { ...env }

  // include environments defined in $envNames
  if (isDefined(script.$envNames) && Array.isArray(script.$envNames) && script.$envNames.length > 0) {
    const globalEnv = { ...env, ...process.env as any }
    const [newEnv] = await resolveEnv(
      config,
      script.$envNames,
      stdin,
      globalEnv,
      options
    )
    onetimeEnvironment = { ...newEnv }
  }

  // check for missing environment variables
  const requiredKeys = getEnvVarRefs(script.$cmd)
  const missingKeys = requiredKeys.filter(key => typeof onetimeEnvironment[key] === 'undefined')
  if (missingKeys.length > 0) {
    throw new Error(`Script is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  }

  // cleanup old tmp files
  cleanupOldTmpFiles(env)

  // execute the command, capture the output
  try {
    // if running an image, verify docker is installed
    const runInDocker = isDefined(script.$image)
    if (runInDocker) {
      docker.verifyDockerExists(onetimeEnvironment, env)
    }
    let newValue = executeCmd(script.$cmd, script.$image, { stdio: captureOutput ? undefined : 'inherit', env: onetimeEnvironment }, env)
    // remove trailing newlines
    newValue = newValue.replace(/(\r?\n)*$/, '')
    if (typeof key === 'string') {
      env[key] = newValue
    }
    return newValue
  } catch (e: any) {
    if (isString(script.$errorMessage)) {
      logger.warn(script.$errorMessage)
    }
    throw e
  }
}

export const resolveEnvScript = (key: string, script: EnvScript, env: ResolvedEnv): void => {
  const resolvedEnvValue = env[script.$env]
  if (isDefined(resolvedEnvValue)) {
    env[key] = resolvedEnvValue
  } else {
    throw new Error(`Global environment variable not found: ${script.$env}`)
  }
}

class InvalidConfigError extends Error {
  constructor (m: string) {
    super(m)

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, InvalidConfigError.prototype)
  }
}

export const resolveStdinScript = async (
  key: string,
  script: StdinScript,
  stdin: StdinResponses,
  env: ResolvedEnv,
  config: Config,
  options: Options
): Promise<void> => {
  if (isDefined(stdin[key])) {
    // if we already have a response, use that
    env[key] = stdin[key]
  } else if (isDefined(env[key])) {
    // else if we already have a value in the environment, use that
    stdin[key] = env[key]
  } else {
    let choices
    // resolve choices if they are a script
    if (isScript(script.$choices)) {
      const result = await resolveScript(key, script.$choices, stdin, env, config, options)
      if (typeof result === 'string') {
        try {
          // try (strict) json to parse input...
          choices = JSON.parse(result)
        } catch (err: any) {
          // could not parse as json, use string instead...
        }
        if (isDefined(choices) && !Array.isArray(choices)) {
          throw new InvalidConfigError(`Invalid $choices script result, must be an array, found = ${result}`)
        }
        // if parsed successfully...
        if (Array.isArray(choices)) {
          // apply optional json field mappings...
          if (isStdinScriptFieldsMapping(script.$fieldsMapping)) {
            const mapping = script.$fieldsMapping
            choices = choices.map((choice: any) => {
              const newChoice: any = {}
              // if a 'name' mapping is provided, check that it resolves to a defined object
              if (isString(mapping.name)) {
                if (isDefined(choice[mapping.name])) {
                  newChoice.name = String(choice[mapping.name])
                } else if (isDefined(jp.value(choice, mapping.name))) {
                  newChoice.name = String(jp.value(choice, mapping.name))
                } else {
                  throw new InvalidConfigError(`Invalid $fieldsMapping.name, '${mapping.name}' does not resolve - ${JSON.stringify(choice)}`)
                }
              }
              // if a 'value' mapping is provided, check that it resolves to a defined object
              if (isString(mapping.value)) {
                if (isDefined(choice[mapping.value])) {
                  newChoice.value = String(choice[mapping.value])
                } else if (isDefined(jp.value(choice, mapping.value))) {
                  newChoice.value = String(jp.value(choice, mapping.value))
                } else {
                  throw new InvalidConfigError(`Invalid $fieldsMapping.value, '${mapping.value}' does not resolve - ${JSON.stringify(choice)}`)
                }
              }
              return newChoice
            })
            // sort, if requested
            if (script.$sort === 'alpha') {
              choices.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
            } else if (script.$sort === 'alphaDesc') {
              choices.sort((a: any, b: any) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }))
            }
            // filter, if requested
            if (isString(script.$filter)) {
              const regexStr = script.$filter
              // by default, assume not a fully qualified regex...
              let pattern = regexStr
              let flags = 'im' // NOTE using 'g' will save state!
              // if a fully qualified regex, parse it
              if (regexStr.startsWith('/')) {
                pattern = regexStr.slice(1, regexStr.lastIndexOf('/'))
                flags = regexStr.slice(regexStr.lastIndexOf('/') + 1)
              }
              const regex = new RegExp(pattern, flags)
              logger.debug(`using regex filter: ${regexStr} => ${regex.toString()}`)
              const countBefore = choices.length
              choices = choices.filter((choice: any) => regex.test(choice.name))
              logger.debug(`filtered ${String(countBefore)} choices to ${String(choices.length)} choices`)
            }
          }
        } else {
          // if not json array, treat as string...
          choices = result.split('\n')
          // sort, if requested
          if (script.$sort === 'alpha') {
            choices.sort((a: any, b: any) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
          } else if (script.$sort === 'alphaDesc') {
            choices.sort((a: any, b: any) => b.localeCompare(a, undefined, { sensitivity: 'base' }))
          }
          // filter, if requested
          if (isString(script.$filter)) {
            const regex = new RegExp(script.$filter)
            choices = choices.filter((choice: string) => regex.test(choice))
          }
        }
      }
    } else if (Array.isArray(script.$choices)) {
      if (script.$choices.length === 0) {
        throw new Error('Invalid $choices, must be a non-empty array')
      }
      if (isObject(script.$choices[0])) {
        choices = script.$choices
      } else {
        // ensure name is a string
        choices = script.$choices.map((choice: string) => ({ name: String(choice), value: String(choice) }))
      }
    }
    if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode.')
    // resolve env vars in name and default...
    const newMessage = resolveResolveScript('', { $resolve: script.$stdin }, env, false)
    const newDefault = isString(script.$default)
      ? resolveResolveScript('', { $resolve: script.$default }, env, false)
      : script.$default
    // otherwise prompt user for an answer to the $stdin question
    await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'rawlist' : 'text',
          name: key,
          message: newMessage,
          pageSize: PAGE_SIZE,
          default: newDefault,
          choices,
          loop: true
        }
      ])
      .then((answers) => {
        const value = answers[key]
        env[key] = value
        stdin[key] = value
      })
  }
}

/**
 * Used to resolve environment variables in a string.
 *
 * @param key - used for error reporting
 * @param script - the script to resolve (the value of $resolve)
 * @param env - environment variables to use for resolving
 */
export const resolveResolveScript = (key: string, script: ResolveScript, env: ResolvedEnv, insertInEnvironment: boolean = true): string => {
  // EXEMPT_ENVIRONMENT_KEYWORDS are special exemptions - that are internally resolved!
  if (EXEMPT_ENVIRONMENT_KEYWORDS.includes(key)) return script.$resolve

  // check for missing environment variables
  const requiredKeys = getEnvVarRefs(script.$resolve)
  const missingKeys = requiredKeys.filter(key => typeof env[key] === 'undefined')
  if (missingKeys.length > 0) {
    throw new Error(`Environment '${key}' is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  }

  // use string replacement to resolve from the resolvedEnv
  const newValue = script.$resolve.replace(/\${([^}]+)}/g, (match, p1) => env[p1])
  if (insertInEnvironment) {
    env[key] = newValue
  }
  return newValue
}

export const resolveScript = async (
  key: string,
  script: Script,
  stdin: StdinResponses = {},
  env: ResolvedEnv = {},
  config: Config,
  options: Options
): Promise<string> => {
  if (typeof script === 'number' || typeof script === 'boolean') {
    script = String(script)
  }
  if (isInternalScript(script)) {
    // script is an internal function, invoke with args
    await resolveInternalScript(key, script, stdin, env, config, options)
  } else if (isCmdScript(script)) {
    // $cmd
    await resolveCmdScript(key, script, stdin, env, config, options)
  // } else if (isEnvScript(script)) {
  //   // $env
  //   resolveEnvScript(key, script, env)
  } else if (isStdinScript(script)) {
    // $stdin
    await resolveStdinScript(key, script, stdin, env, config, options)
  // } else if (isResolveScript(script)) {
  //   // $resolve
  //   resolveResolveScript(key, script, env)
  } else if (typeof script === 'string') {
    // NOTE if it's a string, treat it like a "resolve"
    resolveResolveScript(key, { $resolve: script }, env)
    // env[key] = script
  }
  if (typeof env[key] === 'string') {
    return env[key]
  }
  // EXEMPT_ENVIRONMENT_KEYWORDS are special exemptions - that are internally resolved!
  if (EXEMPT_ENVIRONMENT_KEYWORDS.includes(key) && isString(script)) {
    env[key] = script
    return script
  }
  throw new Error(`Unknown script type: ${JSON.stringify(script)} at path: ${key}`)
}
