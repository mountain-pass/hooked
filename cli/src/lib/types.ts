export type Dictionary<ValueType> = Record<string, ValueType>

export interface Plugins {
  abi: boolean
  icons: boolean
}
export type EnvironmentVariables = Record<string, Script>

export type TopLevelImports = string[]
export type TopLevelEnvironments = Record<string, EnvironmentVariables>
// because this is a circular reference... any could be Script | TopLevelScripts again...
export type TopLevelScripts = Record<string, any>

export interface Config {
  plugins?: Plugins
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
  /** Additional environment variables to resolve (added to global environment). Resolved before $envNames */
  $env?: EnvironmentVariables
  /** Additional environment group names to resolve ONLY when executing command. Resolved after $env. */
  $envNames?: string[]
  /** If supplied, command will execute in this docker image container. */
  $image?: string
  /** The command to execute. Supports multiline. */
  $cmd: string
}

export interface EnvScript {
  $env: string
}
export interface ResolveScript {
  $resolve: string
}

export interface StdinScriptFieldsMapping {
  name: string
  value: string
  short?: string
}
export interface StdinScript {
  $stdin: string
  $default?: string
  // allow multiple options
  $choices?: string[] | CmdScript | StdinScript | EnvScript | ResolveScript | null
  /** fields mapping for json - [name, value, short?] */
  $fieldsMapping?: StdinScriptFieldsMapping
  $sort?: 'alpha' | 'alphaDesc' | 'none'
  $filter?: string
}

export interface InternalScript {
  $env?: EnvironmentVariables
  $internal: (options: { key: string, stdin: StdinResponses, env: ResolvedEnv }) => Promise<string>
}

export type Script = string | CmdScript | StdinScript | EnvScript | ResolveScript | InternalScript

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
export const isStdinScriptFieldsMapping = (script: any): script is StdinScriptFieldsMapping => {
  return typeof script !== 'undefined' &&
    isString(script.name) &&
    isString(script.value) &&
    (isString(script.short) || typeof script.short === 'undefined')
}

export const isInternalScript = (script: Script): script is InternalScript => {
  return typeof (script as any).$internal === 'function'
}

export const isDefined = (o: any): o is object => {
  return typeof o !== 'undefined' && o !== null
}

export const isString = (o: any): o is string => {
  return typeof o === 'string'
}

export const isScript = (script: any): script is Script => {
  return (typeof script === 'object' || typeof script === 'function') &&
  script !== null &&
  (isCmdScript(script) || isStdinScript(script) || isEnvScript(script) || isResolveScript(script) || isInternalScript(script))
}
