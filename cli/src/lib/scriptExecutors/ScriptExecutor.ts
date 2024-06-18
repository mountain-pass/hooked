import inquirer from 'inquirer'
import YAML from 'yaml'
import path from 'path'
import fsPromise from 'fs/promises'
import jp from 'jsonpath'
import { fetchGlobalEnvVars, findScript, resolveEnvironmentVariables } from '../config.js'
import defaults from '../defaults.js'
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
  type EnvironmentVariables,
  type InternalScript,
  type ResolveScript,
  type SSHCmdScript,
  type Script,
  type StdinResponses,
  type StdinScript,
  type YamlConfig,
  isSSHCmdScript,
  isWritePathScript,
  type WritePathScript,
  isJobsSerialScript,
  type JobsSerialScript,
  isEnvScript,
  isNumber,
  isBoolean
} from '../types.js'
import { toJsonString, type Environment } from '../utils/Environment.js'
import { mergeEnvVars } from '../utils/envVarUtils.js'
import logger from '../utils/logger.js'
import { executeCmd } from './$cmd.js'
import verifyLocalRequiredTools from './verifyLocalRequiredTools.js'
import fileUtils from '../utils/fileUtils.js'

// Environment variable names that are exempt from being resolved
const EXEMPT_ENVIRONMENT_KEYWORDS = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']

export interface ScriptExecutorResponse {
  value: string
  stdinResponses?: StdinResponses
}

export const isScriptExectorResponse = (o: any): o is ScriptExecutorResponse => {
  return typeof o === 'object' && typeof o.value === 'string'
}

/**
 *
 * @param key
 * @param script
 * @param stdin
 * @param env
 * @param config
 * @param options
 * @param envVars
 * @param isFinalScript - used to determine if this is the end of a process (i.e. don't capture output)
 * @returns
 */
export const resolveInternalScript = async (
  key: string,
  script: InternalScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables,
  isFinalScript = false
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    mergeEnvVars(envVars, script.$env)
  }

  // actually resolve the environment variables... (internal script)
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)

  // print environment variables, and exit.
  if (isFinalScript && options.printenv === true) {
    logger.info(env.toJsonStringResolved(options.pretty))
    return ''
  }

  // execute the script
  const result = await script.$internal({ key, stdin, env })

  if (!isFinalScript && isString(result)) {
    // envVars[key] = result
    env.putResolved(key, result)
  }
  return result
}

/**
 * Resolves all environment variables, and runs the $cmd script.
 * @param key
 * @param script
 * @param stdin
 * @param env
 * @param config
 * @param options
 * @param envVars
 * @param isFinalScript - used to determine if this is the end of a process (i.e. don't capture output)
 * @returns
 */
export const resolveCmdScript = async (
  key: string,
  script: CmdScript | DockerCmdScript | SSHCmdScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {},
  isFinalScript = false
): Promise<string> => {
  // include environments defined in $envNames
  if (isDefined(script.$envNames) && Array.isArray(script.$envNames) && script.$envNames.length > 0) {
    await fetchGlobalEnvVars(
      config,
      script.$envNames,
      options,
      envVars
    )
  }

  // actually resolve the environment variables... (cmd script)
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)

  const missingKeys = env.getMissingRequiredKeys(script.$cmd)
  if (missingKeys.length > 0) {
    // eslint-disable-next-line max-len
    const foundString = toJsonString(env.getAll(), true)
    // const envVarsString = toJsonString(envVars, true)
    // eslint-disable-next-line max-len
    throw new Error(`Script '${key}' is missing required environment variables: ${JSON.stringify(missingKeys.sort())}\nFound: ${foundString}`)
  }

  // print environment variables, and exit.
  if (isFinalScript && options.printenv === true) {
    logger.info(env.toJsonStringResolved(options.pretty))
    return ''
  }

  // if set to true, or not defined and not a docker or ssh script, include host environment variables...
  const isDocker = isDockerCmdScript(script)
  const isSSH = isSSHCmdScript(script)
  if (script.$envFromHost === true) {
    env.putAllResolved(process.env as any, false)
  } else if (!isDefined(script.$envFromHost) && !isDocker && !isSSH) {
    logger.debug(`Including host environment variables for script '${key}' (isDocker=${String(isDocker)}, isSSH=${String(isSSH)})`)
    env.putAllResolved(process.env as any, false)
  } else {
    logger.debug(`Not including host environment variables for script '${key}'`)
  }

  // execute the command, capture the output
  try {
    // if running an image, verify docker is installed
    const runInDocker = isDockerCmdScript(script)
    if (runInDocker) {
      await verifyLocalRequiredTools.verifyDockerExists(env)
    }

    // run the actual command
    let newValue = await executeCmd(
      key,
      script,
      { env: env.resolved },
      env,
      // N.B. we do NOT want to capture output if this is the final script, we want it to be streamed to stdout!
      { printStdio: true, captureStdout: !isFinalScript }
    )
    // remove trailing newlines
    newValue = newValue.replace(/(\r?\n)*$/, '')
    if (!isFinalScript && isString(newValue)) {
      // envVars[key] = newValue
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

/**
 * Writes the given file definition.
 */
const writeFileOrFolder = async (def: WritePathScript, env: Environment): Promise<void> => {
  const filepath = fileUtils.resolvePath(def.$path)
  if (isDefined(def.$content)) {
    // is file
    let content = ''
    if (isString(def.$content)) {
      // write string
      content = def.$content
    } else if (/.ya?ml$/i.test(def.$path)) {
      // treat as yaml
      content = YAML.stringify(def.$content)
    } else {
      // treat as json
      content = JSON.stringify(def.$content)
    }
    logger.debug(`Writing file - ${filepath}`)
    // NOTE ensure parent directory exists!
    await fsPromise.mkdir(path.dirname(filepath), { recursive: true })
    await fsPromise.writeFile(filepath, env.resolve(content), {
      encoding: isDefined(def.$encoding) ? env.resolve(def.$encoding) as BufferEncoding : 'utf-8',
      flag: 'w'
    })
  } else {
    // is folder
    logger.debug(`Writing folder - ${filepath}`)
    await fsPromise.mkdir(filepath, { recursive: true })
  }
  // set mode if present
  if (isString(def.$permissions)) {
    await fsPromise.chmod(filepath, env.resolve(def.$permissions))
  }
  // set owner if present
  if (isString(def.$owner)) {
    const tmp = env.resolve(def.$owner)
    if (/^\d+:\d+$/.test(tmp)) {
      const [uid, gid] = tmp.split(':')
      await fsPromise.chown(filepath, parseInt(uid), parseInt(gid))
    } else {
      throw new Error('"$owner" must be a numerical uid and gid. e.g. "1000:1000"')
    }
  }
}

/**
 * Resolves all environment variables, and writes the file.
 * @param key
 * @param script
 * @param stdin
 * @param env
 * @param config
 * @param options
 * @param envVars
 * @param isFinalScript - used to determine if this is the end of a process (i.e. don't capture output)
 * @returns
 */
export const resolveWritePathScript = async (
  key: string,
  script: WritePathScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {}
): Promise<void> => {
  // actually resolve the environment variables... (cmd script)
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)

  const missingKeys = new Set<string>()
  env.getMissingRequiredKeys(script.$path).forEach(missingKeys.add)
  if (isString(script.$content)) env.getMissingRequiredKeys(script.$content).forEach(missingKeys.add)
  if (isString(script.$encoding)) env.getMissingRequiredKeys(script.$encoding).forEach(missingKeys.add)
  if (isString(script.$owner)) env.getMissingRequiredKeys(script.$owner).forEach(missingKeys.add)
  if (isString(script.$permissions)) env.getMissingRequiredKeys(script.$permissions).forEach(missingKeys.add)
  if (missingKeys.size > 0) {
    // eslint-disable-next-line max-len
    const foundString = toJsonString(env.getAll(), true)
    // const envVarsString = toJsonString(envVars, true)
    // eslint-disable-next-line max-len
    throw new Error(`Script '${key}' is missing required environment variables: ${JSON.stringify([...missingKeys].sort())}\nFound: ${foundString}`)
  }

  // wait until all files have been written...
  await writeFileOrFolder(script, env)
}

export const resolveEnvScript = async (
  key: string,
  script: EnvScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {}
): Promise<void> => {
  // if "step" $env is defined, merge raw environment variables
  if (isDefined(script.$env)) {
    mergeEnvVars(envVars, script.$env)
  }

  // resolve environment variables
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)
}

export type ScriptAndPaths = [Script, string[]]

/**
 * Converts all script paths to their Script objects.
 */
export const resolveScripts = async (
  parentPath: string[],
  script: JobsSerialScript,
  config: YamlConfig,
  options: ProgramOptions
): Promise<ScriptAndPaths[]> => {
  return await Promise.all(script.$jobs_serial.map(async (refOrJob, idx) => {
  // resolve job by reference
    if (isString(refOrJob) || isNumber(refOrJob) || isBoolean(refOrJob)) {
      return await findScript(config, String(refOrJob).split(' '), options)
    } else {
      return [refOrJob, [...parentPath, `${idx}`]]
    }
  }))
}

/**
 * Throws an error, if any of the provided jobs are not executable.
 */
export const verifyScriptsAreExecutable = (executableScriptsAndPaths: ScriptAndPaths[]): void => {
  // check executable scripts are actually executable
  for (const scriptAndPaths of executableScriptsAndPaths) {
    const [scriptx, pathx] = scriptAndPaths
    if (isCmdScript(scriptx) || isInternalScript(scriptx) || isWritePathScript(scriptx) || isEnvScript(scriptx)) {
      // all good
    } else {
      // uknown
      throw new Error(`Expected $cmd or $path, found "${typeof scriptx}" at path "${pathx.join(' ')}": ${JSON.stringify(scriptx)}`)
    }
  }
}

export const executeScriptsSequentially = async (
  executableScriptsAndPaths: ScriptAndPaths[],
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {}
): Promise<void> => {
  for (const scriptAndPaths of executableScriptsAndPaths) {
    const [scriptx, pathsx] = scriptAndPaths
    if (isCmdScript(scriptx)) {
      // run cmd script
      await resolveCmdScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars, true)
    } else if (isInternalScript(scriptx)) {
      // run internal script
      await resolveInternalScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars, true)
    } else if (isWritePathScript(scriptx)) {
      // write files
      await resolveWritePathScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars)
    } else if (isEnvScript(scriptx)) {
      // write files
      await resolveEnvScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars)
    } else if (options.printenv === true) {
      throw new Error(`Cannot print environment variables for this script type - script="${JSON.stringify(scriptx)}"`)
    }
  }
}

/**
 * Resolves all environment variables, and writes the file.
 * @param key
 * @param script
 * @param stdin
 * @param env
 * @param config
 * @param options
 * @param envVars
 * @param isFinalScript - used to determine if this is the end of a process (i.e. don't capture output)
 * @returns
 */
export const resolveJobsSerialScript = async (
  key: string,
  script: JobsSerialScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {}
): Promise<void> => {
  // resolve job definitions
  const executableScriptsAndPaths = await resolveScripts([key], script, config, options)

  // check executable scripts are actually executable
  verifyScriptsAreExecutable(executableScriptsAndPaths)

  // execute scripts sequentially
  await executeScriptsSequentially(executableScriptsAndPaths, stdin, env, config, options, envVars)
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
  options: ProgramOptions,
  envVars: EnvironmentVariables
): Promise<void> => {
  if (isDefined(stdin[key])) {
    // if we already have a response, use that
    env.putResolved(key, stdin[key])
  } else if (env.isResolvableByKey(key)) {
    // else if we already have a value in the environment, use that
    stdin[key] = env.resolveByKey(key)
  } else {
    let choices: any = script.$choices
    // resolve choices if they are a script
    if (isScript(choices)) {
      choices = await resolveScript(key, choices, stdin, env, config, options, envVars)
      if (typeof choices === 'string') {
        try {
          // try (STRICT!) json to parse input...
          choices = JSON.parse(choices)
        } catch (err: any) {
          // could not parse as json, use string instead...
        }
      }
    }

    if (isString(choices)) {
      choices = (choices).split('\n').map((choice: string | boolean | number) => ({ name: String(choice), value: String(choice) }))
    } else if (isObject(choices) && !Array.isArray(choices)) {
      choices = Object.entries(choices).map(([name, value]) => ({ name, value }))
    } else if (Array.isArray(choices)) {
      if (choices.length === 0) {
        throw new Error('Invalid $choices, must be a non-empty array')
      }
      if (isObject(choices[0]) || isStdinScriptFieldsMapping(choices[0])) {
        // do nothing
      } else {
        // ensure name is a string
        choices = choices.map((choice: string | boolean | number | any) => {
          return { name: String(choice), value: String(choice) }
        })
      }
    }

    // apply field mappings
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
    }

    // apply filters and sorting
    if (typeof choices !== 'undefined' && choices !== null && choices.length > 0) {
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
        choices = choices.filter((choice: any) => regex.test(choice.name))
      }
    }

    if (options.batch === true) {
      throw new Error('Interactive prompts not supported in batch mode. ' +
        `Could not retrieve stdin for key '${key}'.`)
    }
    // resolve env vars in name and default...
    const newMessage = resolveResolveScript('', { $resolve: script.$ask }, env, false)
    const newDefault = isString(script.$default)
      ? resolveResolveScript('', { $resolve: script.$default }, env, false)
      : script.$default
    // otherwise prompt user for an answer to the $ask question
    await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'list' : 'text',
          name: key,
          message: newMessage,
          pageSize: defaults.getDefaults().PAGE_SIZE,
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
  options: ProgramOptions,
  envVars: EnvironmentVariables
): Promise<string> => {
  // ensure we're only dealing with strings... (from the yaml config)
  if (typeof script === 'number' || typeof script === 'boolean') {
    script = String(script)
  }
  // perform environment variable resolution
  if (isInternalScript(script)) {
    await resolveInternalScript(key, script, stdin, env, config, options, envVars)
  } else if (isWritePathScript(script)) {
    await resolveWritePathScript(key, script, stdin, env, config, options, envVars)
  } else if (isJobsSerialScript(script)) {
    await resolveJobsSerialScript(key, script, stdin, env, config, options, envVars)
  } else if (isCmdScript(script)) {
    await resolveCmdScript(key, script, stdin, env, config, options)
  } else if (isStdinScript(script)) {
    await resolveStdinScript(key, script, stdin, env, config, options, envVars)
  } else if (isString(script)) {
    // NOTE if it's a string, treat it like a "resolve"
    resolveResolveScript(key, { $resolve: script }, env)
  }

  // if it's resolvable, resolve it...
  if (env.isResolvableByKey(key)) {
    return env.resolveByKey(key)
  } else if (EXEMPT_ENVIRONMENT_KEYWORDS.includes(key) && isString(script)) {
    // else, check if it's exempt (i.e. internally resolved)!
    env.putResolved(key, script)
    return script
  } else {
    // otherwise... it wasn't resolvable
    throw new Error(`Unknown script type "${typeof script}" : ${JSON.stringify(script)} at path: ${key}`)
  }
}
