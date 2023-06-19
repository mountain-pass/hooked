import inquirer from 'inquirer'
import jp from 'jsonpath'
import { internalResolveEnv, resolveEnv, resolveEnvironmentVariables } from '../config.js'
import { PAGE_SIZE } from '../defaults.js'
import { type ProgramOptions } from '../program.js'
import {
  isCmdScript,
  isDefined,
  isDockerCmdScript,
  isInternalScript,
  isObject,
  isScript,
  isStdinScript,
  isStdinScriptFieldsMapping,
  isString,
  type CmdScript,
  type DockerCmdScript,
  type EnvScript,
  type InternalScript,
  type ResolveScript,
  type ResolvedEnv,
  type SSHCmdScript,
  type Script,
  type StdinResponses,
  type StdinScript,
  type YamlConfig
} from '../types.js'
import { type Environment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import { cleanupOldTmpFiles, executeCmd } from './$cmd.js'
import verifyLocalRequiredTools from './verifyLocalRequiredTools.js'

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
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    // TODO provide stdin
    await internalResolveEnv(script.$env, stdin, env, config, options)
  }

  const result = await script.$internal({ key, stdin, env })
  if (typeof result === 'string') {
    env.putResolved(key, result)
  }
  return result
}

export const resolveCmdScript = async (
  key: string | undefined,
  script: CmdScript | DockerCmdScript | SSHCmdScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  captureOutput = true
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    await internalResolveEnv(script.$env, stdin, env, config, options)
  }

  // let onetimeEnvironment: ResolvedEnv = { ...env }

  // include environments defined in $envNames
  if (isDefined(script.$envNames) && Array.isArray(script.$envNames) && script.$envNames.length > 0) {
    const [envVars] = await resolveEnv(
      config,
      script.$envNames,
      stdin,
      env,
      options
    )
    await resolveEnvironmentVariables(config, envVars, stdin, env, options)
    // onetimeEnvironment = { ...newEnv }
  }

  const missingKeys = env.getMissingRequiredKeys(script.$cmd)
  if (missingKeys.length > 0) {
    throw new Error(`Script is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  }

  // throws error if not resolvable
  // env.resolve(script.$cmd, key)

  // check for missing environment variables
  // const requiredKeys = getEnvVarRefs(script.$cmd)
  // const missingKeys = requiredKeys.filter(key => typeof onetimeEnvironment[key] === 'undefined')
  // if (missingKeys.length > 0) {
  //   throw new Error(`Script is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  // }

  // cleanup old tmp files
  cleanupOldTmpFiles(env)

  // execute the command, capture the output
  try {
    // TODO move inside execute cmd!
    // if running an image, verify docker is installed
    const runInDocker = isDockerCmdScript(script)
    if (runInDocker) {
      await verifyLocalRequiredTools.verifyDockerExists(env)
    }

    // run the actual command
    let newValue = await executeCmd(
      script,
      { env: env.resolved },
      env,
      { printStdio: true, captureStdout: captureOutput }
    )
    // remove trailing newlines
    newValue = newValue.replace(/(\r?\n)*$/, '')
    if (typeof key === 'string') {
      env.putResolved(key, newValue)
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
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions
): Promise<void> => {
  if (isDefined(stdin[key])) {
    // if we already have a response, use that
    env.putResolved(key, stdin[key])
  } else if (env.isResolvableByKey(key)) {
    // else if we already have a value in the environment, use that
    stdin[key] = env.resolveByKey(key)
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
        choices = script.$choices.map((choice: string | boolean | number) => ({ name: String(choice), value: String(choice) }))
      }
    }
    if (options.batch === true) {
      throw new Error('Interactive prompts not supported in batch mode. ' +
        `Could not retrieve stdin for key '${key}'.`)
    }
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
        env.putResolved(key, value)
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
export const resolveResolveScript = (key: string, script: ResolveScript, env: Environment, insertInEnvironment: boolean = true): string => {
  // // EXEMPT_ENVIRONMENT_KEYWORDS are special exemptions - that are internally resolved!
  // if (EXEMPT_ENVIRONMENT_KEYWORDS.includes(key)) return script.$resolve

  // // check for missing environment variables
  // const requiredKeys = getEnvVarRefs(script.$resolve)
  // const missingKeys = requiredKeys.filter(key => typeof env[key] === 'undefined')
  // if (missingKeys.length > 0) {
  //   throw new Error(`Environment '${key}' is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  // }

  // // use string replacement to resolve from the resolvedEnv
  // const newValue = script.$resolve.replace(/\${([^}]+)}/g, (match, p1) => env[p1])
  // if (insertInEnvironment) {
  //   env[key] = newValue
  // }
  // return newValue
  if (insertInEnvironment) {
    return env.resolveAndPutResolved(key, script.$resolve)
  } else {
    return env.resolve(script.$resolve, key)
  }
}

export const resolveScript = async (
  key: string,
  script: Script,
  stdin: StdinResponses = {},
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions
): Promise<string> => {
  // ensure we're only dealing with strings... (from the yaml config)
  if (typeof script === 'number' || typeof script === 'boolean') {
    script = String(script)
  }
  // perform environment variable resolution
  if (isInternalScript(script)) {
    await resolveInternalScript(key, script, stdin, env, config, options)
  } else if (isCmdScript(script)) {
    await resolveCmdScript(key, script, stdin, env, config, options)
  } else if (isStdinScript(script)) {
    await resolveStdinScript(key, script, stdin, env, config, options)
  } else if (isString(script)) {
    // NOTE if it's a string, treat it like a "resolve"
    resolveResolveScript(key, { $resolve: script }, env)
  }

  // if it's resolvable, resolve it...
  if (env.isResolvableByKey(key)) {
    return env.resolveByKey(key)
  }
  // else, check if it's exempt (i.e. internally resolved)!
  if (EXEMPT_ENVIRONMENT_KEYWORDS.includes(key) && isString(script)) {
    env.putResolved(key, script)
    return script
  }
  throw new Error(`Unknown script type: ${JSON.stringify(script)} at path: ${key}`)
}
