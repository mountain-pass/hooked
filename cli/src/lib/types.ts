
export interface Config {
  env: any
  scripts: any
}

export type Dictionary<ValueType> = Record<string, ValueType>

export type Env = Record<string, any>

export type ResolvedEnv = Record<string, string>

export type StdinResponses = Record<string, string>

// script types

export interface CmdScript {
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
}
export type Script = CmdScript | StdinScript | EnvScript | ResolveScript
