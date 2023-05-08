import inquirer from 'inquirer'
import { getEnvVarRefs, internalResolveEnv } from '../config.js'
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
  type StdinScript
} from '../types.js'
import { cleanupOldTmpFiles, executeCmd } from './$cmd.js'

export interface ScriptExecutorResponse {
  value: string
  stdinResponses?: StdinResponses
}

export const isScriptExectorResponse = (o: any): o is ScriptExecutorResponse => {
  return typeof o === 'object' && typeof o.value === 'string'
}

export const resolveCmdScript = async (
  key: string | undefined,
  script: CmdScript,
  stdin: StdinResponses,
  env: ResolvedEnv,
  captureOutput = true
): Promise<string> => {
  // if "step" env is defined, resolve environment variables
  if (isDefined(script.$env)) {
    // TODO provide stdin
    await internalResolveEnv(script.$env, stdin, env)
  }

  // check for missing environment variables
  const requiredKeys = getEnvVarRefs(script.$cmd)
  const missingKeys = requiredKeys.filter(key => typeof env[key] === 'undefined')
  if (missingKeys.length > 0) {
    throw new Error(`Script is missing required environment variables: ${JSON.stringify(missingKeys)}`)
  }

  // cleanup old tmp files
  cleanupOldTmpFiles(env)

  // execute the command, capture the output
  let newValue = executeCmd(script.$cmd, { stdio: captureOutput ? undefined : 'inherit', env })
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
  env: ResolvedEnv
): Promise<void> => {
  if (isDefined(stdin[key])) {
    // if we already have a response, use that
    env[key] = stdin[key]
  } else {
    let choices
    // resolve choices if they are a script
    if (isScript(script.$choices)) {
      const result = await resolveScript(key, script.$choices, stdin, env)
      if (typeof result === 'string') {
        choices = result.split('\n')
      }
    } else if (Array.isArray(script.$choices)) {
      choices = script.$choices
    }
    // otherwise prompt user
    await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'rawlist' : 'text',
          name: key,
          message: script.$stdin,
          pageSize: 20,
          default: script.$default,
          choices,
          loop: false
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
  env: ResolvedEnv = {}
): Promise<string> => {
  if (typeof script === 'number' || typeof script === 'boolean') {
    script = String(script)
  }
  if (isCmdScript(script)) {
    // $cmd
    await resolveCmdScript(key, script, stdin, env)
  // } else if (isEnvScript(script)) {
  //   // $env
  //   resolveEnvScript(key, script, env)
  } else if (isStdinScript(script)) {
    // $stdin
    await resolveStdinScript(key, script, stdin, env)
  // } else if (isResolveScript(script)) {
  //   // $resolve
  //   resolveResolveScript(key, script, env)
  } else if (typeof script === 'string') {
    resolveResolveScript(key, { $resolve: script }, env)
    // env[key] = script
  }
  if (typeof env[key] === 'string') {
    return env[key]
  }
  throw new Error(`Unknown script type: ${JSON.stringify(script)}`)
}
