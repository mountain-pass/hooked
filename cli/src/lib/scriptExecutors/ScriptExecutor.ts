import inquirer from 'inquirer'
import path from 'path'
import YAML from 'yaml'
import { fetchGlobalEnvVars, findScript, resolveEnvironmentVariables } from '../config.js'
import defaults from '../defaults.js'
import { type ProgramOptions } from '../program.js'
import {
  checkIfRecognisedAsOldScript,
  isBoolean,
  isCmdScript,
  isDefined,
  isDockerCmdScript,
  isEnvScript,
  isInternalScript,
  isJobsSerialScript,
  isNumber,
  isSSHCmdScript,
  isStdinScript,
  isStdinScriptFieldsMapping,
  isString,
  isUndefined,
  isWritePathScript,
  type CmdScript,
  type DockerCmdScript,
  type EnvScript,
  type EnvironmentVariables,
  type InternalScript,
  type JobsSerialScript,
  type ResolveScript,
  type SSHCmdScript,
  type Script,
  type StdinResponses,
  type StdinScript,
  type WritePathScript,
  type YamlConfig
} from '../types.js'
import { toJsonString, type Environment } from '../utils/Environment.js'
import { mergeEnvVars } from '../utils/envVarUtils.js'
import logger from '../utils/logger.js'
import { executeCmd } from './$cmd.js'
import { StdinChoicesResolver, StdinChoicesResolverReturnType } from './resolvers/StdinChoicesResolver.js'
import verifyLocalRequiredTools from './verifyLocalRequiredTools.js'
import { CaptureWritableStream } from '../common/CaptureWritableStream.js'
import { displayReRunnableScript } from '../history.js'

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
  isFinalScript = false,
  storeResultAsEnv = false
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    mergeEnvVars(envVars, script.$env)
  }

  // actually resolve the environment variables... (internal script)
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)

  // execute the script
  const result = await script.$internal({ key, stdin, env })

  if (storeResultAsEnv && isString(result)) {
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
 * @param isFinalScript - used to determine if this is the end of a process (i.e. if final script, don't capture output)
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
  isFinalScript: boolean = false,
  storeResultAsEnv: boolean = false
): Promise<string> => {
  // if "step" $env is defined, merge environment variables
  if (isDefined(script.$env)) {
    mergeEnvVars(envVars, script.$env)
  }

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

    if (isFinalScript) {
      logger.debug(`Rerun: ${displayReRunnableScript(options.scriptPath!, options.env?.split(','), stdin, options.config)}`)
    }

    // !!! run the actual command !!!
    let newValue = await executeCmd(
      key,
      script,
      options,
      { env: env.resolved },
      env,
      // N.B. we do NOT want to capture output if this is the final script, we want it to be streamed to stdout!
      { printStdio: true, captureStdout: !isFinalScript }
    )
    // remove trailing newlines
    newValue = newValue.replace(/(\r?\n)*$/, '')

    // if not the final script,
    if (storeResultAsEnv && isString(newValue)) {
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
  const parentDir = path.dirname(script.$path)

  // actually resolve the environment variables... (cmd script)
  await resolveEnvironmentVariables(config, envVars, stdin, env, options)

  // we need the resolved path, to do the yaml/json check
  const resolvedPath = env.resolve(script.$path, 'path')
  let content: string | undefined
  if (isString(script.$content)) {
    // write string
    content = script.$content
  } else if (/.ya?ml$/i.test(resolvedPath)) {
    // treat as yaml
    content = YAML.stringify(script.$content)
  } else {
    // treat as json
    content = JSON.stringify(script.$content, null, 2)
  }

  // convert to a CmdScript
  const cmdScript: CmdScript = {
    $cmd: `
#!/bin/sh -e

${isString(content) && isString(parentDir) && parentDir.length > 0 ? `mkdir -p ${parentDir}` : ''}
${isString(content)
        ? `echo Writing file: ${script.$path}`
        : `echo Creating dir: ${script.$path}`
      }
${isString(content)
        ? `cat > ${script.$path} << EOL\n${content}\nEOL`
        : `mkdir -p ${script.$path}`
      }
${isString(script.$permissions) ? `chmod ${script.$permissions} ${script.$path}` : ''}
${isString(script.$owner) ? `chown ${script.$owner} ${script.$path}` : ''}
`
  }
  if (isString(script.$image)) (cmdScript as DockerCmdScript).$image = script.$image
  if (isString(script.$ssh)) (cmdScript as SSHCmdScript).$ssh = script.$ssh

  await resolveCmdScript(key, cmdScript, stdin, env, config, options, envVars, true)
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
    if (isCmdScript(scriptx) || isInternalScript(scriptx) || isWritePathScript(scriptx) || isEnvScript(scriptx) || isJobsSerialScript(scriptx)) {
      // all good
    } else {
      // uknown
      throw new Error(`Expected $cmd, $path or $jobs_serial, found "${typeof scriptx}" at path "${pathx.join(' ')}": ${JSON.stringify(scriptx)}`)
    }
  }
}

export const executeScriptsSequentially = async (
  executableScriptsAndPaths: ScriptAndPaths[],
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables = {},
  isFinalScript: boolean,
  storeResultAsEnv: boolean
): Promise<string[]> => {
  const outputs: string[] = []
  for (const scriptAndPaths of executableScriptsAndPaths) {
    const [scriptx, pathsx] = scriptAndPaths
    if (isCmdScript(scriptx)) {
      // resolve $cmd $env vars (if any)
      if (isDefined(scriptx.$env)) {
        mergeEnvVars(envVars, scriptx.$env ?? {})
      }
      logger.debug(`Merged environment: ${JSON.stringify(envVars)}`)
      // run cmd script
      outputs.push(await resolveCmdScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars, isFinalScript, storeResultAsEnv))
    } else if (isInternalScript(scriptx)) {
      // run internal script
      outputs.push(await resolveInternalScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars, isFinalScript, storeResultAsEnv))
    } else if (isWritePathScript(scriptx)) {
      // write files
      await resolveWritePathScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars)
    } else if (isEnvScript(scriptx)) {
      // write files
      await resolveEnvScript(pathsx.join(' '), scriptx, stdin, env, config, options, envVars)
    }
  }
  return outputs
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
): Promise<string[]> => {
  // resolve job definitions
  const executableScriptsAndPaths = await resolveScripts([key], script, config, options)

  // check executable scripts are actually executable
  verifyScriptsAreExecutable(executableScriptsAndPaths)

  // execute scripts sequentially
  return await executeScriptsSequentially(executableScriptsAndPaths, stdin, env, config, options, envVars, true, false)
}

export class InvalidConfigError extends Error {
  constructor(m: string) {
    super(m)

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, InvalidConfigError.prototype)
  }
}

/**
 * This resolves a single environment StdinScript.
 */
export const resolveStdinScript = async (
  key: string,
  script: StdinScript,
  stdin: StdinResponses,
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables
): Promise<void> => {

  const choices = await StdinChoicesResolver(key, script, {
    config,
    env,
    envVars,
    options,
    stdin
  })

  // use to lookup a choice by name or value
  const findMappedChoice = (candidate: string | undefined, choices: StdinChoicesResolverReturnType | undefined): string | undefined => {
    if (isUndefined(choices)) return candidate
    if (isUndefined(candidate)) return undefined
    return choices?.filter(choice => {
      if (isStdinScriptFieldsMapping(choice)) {
        return choice.name === candidate || choice.value === candidate
      } else {
        return choice === candidate
      }
    })
      .map(choice => {
        if (isStdinScriptFieldsMapping(choice)) {
          return choice.value
        } else {
          return choice
        }
      })
      .find(f => String(f)) as string
  }

  const stdinMapped = findMappedChoice(stdin[key], choices)
  const envMapped = findMappedChoice(env.isResolvableByKey(key) ? env.resolveByKey(key) : undefined, choices)

  // logger.info(`Got here stdinMapped=${stdinMapped}, envMapped=${envMapped}, choices=${JSON.stringify(choices)}`)

  if (isDefined(stdinMapped)) {
    // if we already have a response, use that
    env.putResolved(key, stdinMapped)
    return
  } else if (isDefined(envMapped)) {
    // else if we already have a value in the environment, use the mapped value
    env.putResolved(key, envMapped)
    stdin[key] = envMapped
    return
  } else {

    // // check if already resolved in environment variables...
    // if (env.isResolvableByKey(key)) {
    //   // nothing more to do
    //   logger.debug(`Key '${key}' is already resolvable - value=${env.resolveByKey(key)}`)
    //   return
    // }

    if (options.batch === true) {
      throw new Error(`Could not retrieve stdin for key (interactive prompts disabled). key='${key}'.`)
    }
    // resolve env vars in name and default...
    const newMessage = resolveResolveScript('', { $resolve: script.$ask }, env, false)
    const newDefault = isString(script.$default)
      ? resolveResolveScript('', { $resolve: script.$default }, env, false)
      : script.$default
    // otherwise prompt user for an answer to the $ask question
    // const stdout = new CaptureStream(process.stdout)
    await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'list' : 'text',
          name: key,
          message: newMessage,
          pageSize: defaults.getDefaults().PAGE_SIZE,
          default: newDefault,
          choices,
          loop: true,
          // output: stdout,
        }
      ])
      .then((answers) => {
        const value = answers[key]
        if (typeof value === 'undefined') {
          throw new Error(`Inquirer response is undefined, could not find key '${key}' in answers: ${JSON.stringify(answers)}`)
        }
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

/**
 * Attempt to resolve environment variables.
 * @param key
 * @param script
 * @param stdin
 * @param env
 * @param config
 * @param options
 * @param envVars
 * @returns
 */
export const resolveScript = async (
  key: string,
  script: Script,
  stdin: StdinResponses = {},
  env: Environment,
  config: YamlConfig,
  options: ProgramOptions,
  envVars: EnvironmentVariables,
  isFinalScript: boolean,
  storeResultAsEnv: boolean
): Promise<string> => {
  // ensure we're only dealing with strings... (from the yaml config)
  if (typeof script === 'number' || typeof script === 'boolean') {
    script = String(script)
  }
  // perform environment variable resolution
  // NOTE do not store environment variable - rather, return the string value.
  if (isInternalScript(script)) {
    return await resolveInternalScript(key, script, stdin, env, config, options, envVars, isFinalScript, storeResultAsEnv)
  } else if (isWritePathScript(script)) {
    await resolveWritePathScript(key, script, stdin, env, config, options, envVars)
  } else if (isJobsSerialScript(script)) {
    return (await resolveJobsSerialScript(key, script, stdin, env, config, options, envVars)).join('\n')
  } else if (isCmdScript(script)) {
    return await resolveCmdScript(key, script, stdin, env, config, options, {}, isFinalScript, storeResultAsEnv)
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
    checkIfRecognisedAsOldScript(script)
    throw new Error(`Unknown or old script format detected - "${typeof script}" : ${JSON.stringify(script)} at path: ${key}`)
  }
}
