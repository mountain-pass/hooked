import inquirer from 'inquirer'
import {
  type Script, type ResolvedEnv, isCmdScript, isEnvScript,
  isStdinScript, type StdinResponses, isResolveScript,
  type CmdScript, type EnvScript, type StdinScript, type ResolveScript, isScript
} from '../types.js'
import { executeCmd } from './$cmd.js'

const isDefined = (o: any): boolean => typeof o !== 'undefined'

export interface ScriptExecutorResponse {
  value: string
  stdinResponses?: StdinResponses
}

export const isScriptExectorResponse = (o: any): o is ScriptExecutorResponse => {
  return typeof o === 'object' && typeof o.value === 'string'
}

export const resolveCmdScript = (script: CmdScript, env: ResolvedEnv, captureOutput = true): string => {
  let newValue = executeCmd(script.$cmd, { stdio: captureOutput ? undefined : 'inherit', env })
  // remove trailing newlines
  newValue = newValue.replace(/(\r?\n)*$/, '')
  return newValue
}

export const resolveEnvScript = (script: EnvScript, env: ResolvedEnv): string => {
  const resolvedEnvValue = env[script.$env]
  if (isDefined(resolvedEnvValue)) {
    return resolvedEnvValue
  } else {
    throw new Error(`Global environment variable not found: ${script.$env}`)
  }
}

export const resolveStdinScript = async (
  script: StdinScript,
  key: string,
  stdin: StdinResponses,
  env: ResolvedEnv
): Promise<string> => {
  if (isDefined(stdin[key])) {
    // if we already have a response, use that
    return stdin[key]
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
    return await inquirer
      .prompt([
        {
          type: isDefined(choices) ? 'list' : 'text',
          name: key,
          message: script.$stdin,
          default: script.$default,
          choices
        }
      ])
      .then((answers) => {
        return answers[key]
      })
  }
}

export const resolveResolveScript = (script: ResolveScript, env: ResolvedEnv): string => {
  // use string replacement to resolve from the resolvedEnv
  const newValue = script.$resolve.replace(/\${([^}]+)}/g, (match, p1) => {
    const lookupval = env[p1]
    if (typeof lookupval === 'string') {
      return lookupval
    } else {
      return match
    }
  })
  return newValue
}

export const resolveScript = async (
  key: string,
  script: Script,
  stdin: StdinResponses = {},
  env: ResolvedEnv = {}
): Promise<string> => {
  if (isCmdScript(script)) {
    // $cmd
    return resolveCmdScript(script, env)
  } else if (isEnvScript(script)) {
    // $env
    return resolveEnvScript(script, env)
  } else if (isStdinScript(script)) {
    // $stdin
    return await resolveStdinScript(script, key, stdin, env)
  } else if (isResolveScript(script)) {
    // $resolve
    return resolveResolveScript(script, env)
  }
  throw new Error(`Unknown script type: ${JSON.stringify(script)}`)
}
