import { type Environment } from './utils/Environment'

export type Dictionary<ValueType> = Record<string, ValueType>

/**  */
export interface Plugins {
  abi: boolean
  icons: boolean
  npm: boolean
  make: boolean
}

/** Are unresolved "raw" environment variables. e.g. "${HELLO}" */
export type EnvironmentVariables = Record<string, Script>

export type TopLevelImports = string[]
export type TopLevelEnvironments = Record<string, EnvironmentVariables>
// because this is a circular reference... any could be Script | TopLevelScripts again...
export type TopLevelScripts = Record<string, any>

export interface YamlConfig {
  /**  */
  plugins?: Plugins
  /**  */
  imports?: TopLevelImports
  /**  */
  env: TopLevelEnvironments
  /**  */
  scripts: TopLevelScripts
}

// export type EnvScripts = Record<string, Script>

/**
 * @deprecated Please use Environment
 */
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
  /** If true, includes all environment variables from the host machine. (On by default for non-$ssh and non-$image commands (i.e. local). */
  $envFromHost?: boolean
  /** The command to execute. Supports multiline. */
  $cmd: string
  /** The message to show, if an error occurs. */
  $errorMessage?: string
}

export interface DockerCmdScript extends CmdScript {
  /** If supplied, command will execute in this docker image container. */
  $image: string
}

export interface SSHCmdScript extends CmdScript {
  /** If supplied, command will execute in this remote server. */
  $ssh: string
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
}

/** Provides a prompt to the user, to select from a set of choices. */
export interface StdinScript {
  /** The prompt provided to the user. */
  $stdin: string
  /** The default value provided to the user. */
  $default?: string
  /** Provides different choices to the user. Can be a multiline string, array, object, arrays of name/value objects, Scripts, etc. */
  $choices?: string | string[] | boolean[] | number[] | StdinScriptFieldsMapping[] | Record<string, string> |
  CmdScript | DockerCmdScript | SSHCmdScript | StdinScript | EnvScript | ResolveScript | InternalScript | null
  /** For JSON arrays, name and value can be overridden by specifying alternative JSON paths. */
  $fieldsMapping?: StdinScriptFieldsMapping
  /** A regex filter to apply to the 'name' or values. */
  $filter?: string
  /** Sorts the displayed 'name' values. */
  $sort?: 'alpha' | 'alphaDesc' | 'none'
}

export interface InternalScript {
  $env?: EnvironmentVariables
  $internal: (options: { key: string, stdin: StdinResponses, env: Environment }) => Promise<string>
}

export type Script = string | CmdScript | DockerCmdScript | SSHCmdScript | StdinScript | EnvScript | ResolveScript | InternalScript

export const isCmdScript = (script: Script): script is CmdScript => {
  return typeof (script as any).$cmd === 'string'
}

export const isDockerCmdScript = (script: Script): script is DockerCmdScript => {
  return typeof (script as any).$cmd === 'string' && typeof (script as any).$image === 'string'
}

export const isSSHCmdScript = (script: Script): script is SSHCmdScript => {
  return typeof (script as any).$cmd === 'string' && typeof (script as any).$ssh === 'string'
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

export const isObject = (o: any): o is object => {
  return typeof o === 'object'
}

export const isScript = (script: any): script is Script => {
  return (typeof script === 'object' || typeof script === 'function') &&
  script !== null &&
  (isCmdScript(script) || isStdinScript(script) || isEnvScript(script) || isResolveScript(script) || isInternalScript(script))
}
