export type Dictionary<ValueType> = Record<string, ValueType>

export type EnvironmentVariables = Record<string, Script>

export type TopLevelImports = string[]
export type TopLevelEnvironments = Record<string, EnvironmentVariables>
// because this is a circular reference... any could be Script | TopLevelScripts again...
export type TopLevelScripts = Record<string, any>

export interface Config {
  imports?: TopLevelImports
  env: TopLevelEnvironments
  scripts: TopLevelScripts
}

// export type EnvScripts = Record<string, Script>

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
  $env?: EnvironmentVariables
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
export type Script = string | CmdScript | StdinScript | EnvScript | ResolveScript

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

export const isDefined = (o: any): o is object => {
  return typeof o !== 'undefined' && o !== null
}

export const isScript = (script: any): script is Script => {
  return typeof script === 'object' &&
  script !== null &&
  (isCmdScript(script) || isStdinScript(script) || isEnvScript(script) || isResolveScript(script))
}
