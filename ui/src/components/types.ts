
export type Dictionary<ValueType> = Record<string, ValueType>

/**  */
export interface Plugins {
  abi: boolean
  icons: boolean
  npm: boolean
  makefile: boolean
}

/** Are unresolved "raw" environment variables. e.g. "${HELLO}" */
export type EnvironmentVariables = Record<string, Script>

export type TopLevelImports = string[]
export type TopLevelEnvironments = Record<string, EnvironmentVariables>
// because this is a circular reference... any could be Script | TopLevelScripts again...
export type TopLevelScripts = Record<string, any>

export interface CronTrigger {
  $cron: string
  $job: string
}

export interface Triggers extends Record<string, CronTrigger> {}

export interface YamlConfig {
  /**  */
  plugins?: Plugins
  /**  */
  imports?: TopLevelImports
  /**  */
  triggers?: Triggers
  /**  */
  env: TopLevelEnvironments
  /**  */
  scripts: TopLevelScripts
}

// export type EnvScripts = Record<string, Script>

export type StdinResponses = Record<string, string>

export interface SuccessfulScript {
  ts: number
  scriptPath: string[]
  envNames: string[]
  stdin: object
}

// script types

export interface BaseScript {
  _scriptPath?: string
}

/** Configuration for writing a file/folder. */
export interface WritePathScript extends BaseScript {
  /** Sets the file/folder location. */
  $path: string
  /**
   * Sets the contents of the file to match the string.
   * If an object is provided, will attempt to serialise the content to match either Yaml or Json (using the file extension).
   * If absent, treats the path as a folder.
   * Content is utf-8.
   */
  $content?: string | object
  /** Sets the read/write/execute access permissions on the file/folder (default '644'). */
  $permissions?: string
  /** Sets the 'uid:gid' of the file/folder. (Note: must be numerical!). */
  $owner?: string
  /** If supplied, command will execute in this docker image container. */
  $image?: string
  /** If supplied, command will execute in this remote server. */
  $ssh?: string
}

/**
 * Allows running multiple jobs, one after the other. Environment variables will be accumulated, and passed on to future jobs.
 */
export interface JobsSerialScript extends BaseScript {
  /** A list of script paths, or job definitions. */
  $jobs_serial: string[] | Script[]
}

export interface CmdScript extends BaseScript {
  /** Additional environment variables to resolve (added to global environment). Resolved before $envNames */
  $env?: EnvironmentVariables
  /** Additional environment group names to resolve ONLY when executing command. */
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

export interface EnvScript extends BaseScript {
  /** Additional environment variables to resolve (added to global environment). */
  $env: string
}
export interface ResolveScript extends BaseScript {
  $resolve: string
}

export interface StdinScriptFieldsMapping {
  name: string
  value: string
}

/** Provides a prompt to the user, to select from a set of choices. */
export interface StdinScript extends BaseScript {
  /** The prompt provided to the user. */
  $ask: string
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

export interface InternalScript extends BaseScript {
  $env?: EnvironmentVariables
  $internal: (options: { key: string, stdin: StdinResponses }) => Promise<string>
}

export type Script = string
| CmdScript
| DockerCmdScript
| SSHCmdScript
| StdinScript
| EnvScript
| ResolveScript
| InternalScript
| WritePathScript
| JobsSerialScript

export type ScriptAndPaths = [Script, string[]]

export const isJobsSerialScript = (script: Script): script is JobsSerialScript => {
  return Array.isArray((script as any).$jobs_serial)
}

export const isWritePathScript = (script: Script): script is WritePathScript => {
  return typeof (script as any).$path === 'string'
}

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
  return typeof (script as any).$env !== 'undefined'
}

export const isResolveScript = (script: Script): script is ResolveScript => {
  return typeof (script as any).$resolve === 'string'
}

export const isStdinScript = (script: Script): script is StdinScript => {
  return typeof (script as any).$ask === 'string'
}

export const isInternalScript = (script: Script): script is InternalScript => {
  return typeof (script as any).$internal === 'function'
}

export const isScript = (script: any): script is Script & BaseScript => {
  return (typeof script === 'object' || typeof script === 'function') &&
  script !== null &&
  (
    isWritePathScript(script) ||
    isCmdScript(script) ||
    isJobsSerialScript(script) ||
    isStdinScript(script) ||
    isEnvScript(script) ||
    isResolveScript(script) ||
    isInternalScript(script)
  )
}

export const isStdinScriptFieldsMapping = (script: any): script is StdinScriptFieldsMapping => {
  return typeof script !== 'undefined' &&
    isString(script.name) &&
    isString(script.value) &&
    (isString(script.short) || typeof script.short === 'undefined')
}

export const isUndefined = (o: any): o is undefined => typeof o === 'undefined'

export const isDefined = (o: any): o is object => {
  return typeof o !== 'undefined' && o !== null
}

export const isDefinedAny = (o: any): o is any => {
  return typeof o !== 'undefined' && o !== null
}

export const isString = (o: any): o is string => {
  return typeof o === 'string'
}

export const isNumber = (o: any): o is number => {
  return typeof o === 'number'
}

export const isBoolean = (o: any): o is boolean => {
  return typeof o === 'boolean'
}

export const isObject = (o: any): o is object => {
  return typeof o === 'object'
}

type FunctionX = () => any

export const isFunction = (o: any): o is FunctionX => {
  return typeof o === 'function'
}

export const sortCaseInsensitive = (a: string, b: string): number => {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}
