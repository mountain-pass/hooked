
export interface Config {
  env: any
  scripts: any
}

export type Dictionary<ValueType> = Record<string, ValueType>

export type Env = Record<string, any>
export type EnvScripts = Record<string, Script>

export type ResolvedEnv = Record<string, string>

export type StdinResponses = Record<string, string>

export interface SuccessfulScript {
  ts: number
  scriptPath: string[]
  envNames: string[]
  stdin: object
}

// script types

export interface CmdScript {
  $env?: Env
  $cmd: string
}

export interface EnvScript {
  $env: string
}
export interface ResolveScript {
  $resolve: string
}
export interface StdinScript {
  $stdin: string
  $default?: string
  // allow multiple options
  $choices?: string[] | CmdScript | StdinScript | EnvScript | ResolveScript | null
}
export type Script = CmdScript | StdinScript | EnvScript | ResolveScript

export const isCmdScript = (script: Script): script is CmdScript => {
  return typeof (script as any).$cmd === 'string'
}

export const isEnvScript = (script: Script): script is EnvScript => {
  return typeof (script as any).$env === 'string'
}

export const isResolveScript = (script: Script): script is ResolveScript => {
  return typeof (script as any).$resolve === 'string'
}

export const isStdinScript = (script: Script): script is StdinScript => {
  return typeof (script as any).$stdin === 'string'
}

export const isScript = (script: any): script is Script => {
  return typeof script === 'object' &&
  script !== null &&
  (isCmdScript(script) || isStdinScript(script) || isEnvScript(script) || isResolveScript(script))
}
