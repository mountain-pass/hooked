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
  type Config
} from '../types.js'
import { cleanupOldTmpFiles, executeCmd } from './$cmd.js'
import { PAGE_SIZE } from '../defaults.js'
import { type Options } from '../program.js'

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
  let newValue = executeCmd(script.$cmd, script.$image, { stdio: captureOutput ? undefined : 'inherit', env: onetimeEnvironment })
  // remove trailing newlines
  newValue = newValue.replace(/(\r?\n)*$/, '')
  if (typeof key === 'string') {
    env[key] = newValue
  }
  return newValue
}

export const resolveEnvScript = (key: string, script: EnvScript, env: ResolvedEnv): void => {
  const resolvedEnvValue = env[script.$env]
  if (isDefined(resolvedEnvValue)) {
    env[key] = resolvedEnvValue
  } else {
    throw new Error(`Global environment variable not found: ${script.$env}`)
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
        choices = result.split('\n')
      }
    } else if (Array.isArray(script.$choices)) {
      choices = script.$choices
    }
    // otherwise prompt user
    if (options.batch === true) throw new Error('Interactive prompts not supported in batch mode.')
    await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'rawlist' : 'text',
          name: key,
          message: script.$stdin,
          pageSize: PAGE_SIZE,
          default: script.$default,
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

export const resolveResolveScript = (key: string, script: ResolveScript, env: ResolvedEnv): void => {
  // check for missing environment variables
  const requiredKeys = getEnvVarRefs(script.$resolve)
  const missingKeys = requiredKeys.filter(key => typeof env[key] === 'undefined')
  if (missingKeys.length > 0) {
    throw new Error(`Environment '${key}' is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  }

  // use string replacement to resolve from the resolvedEnv
  const newValue = script.$resolve.replace(/\${([^}]+)}/g, (match, p1) => env[p1])
  env[key] = newValue
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
  throw new Error(`Unknown script type #1: ${JSON.stringify(script)}`)
}
