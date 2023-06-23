import { isDefined, type EnvironmentVariables } from '../types.js'

/**
 * Retrieves all ${...} references from a string.
 * @param str e.g. 'hello ${name}'
 * @returns e.g. ['name']
 */
export const getEnvVarRefs = (str: string): string[] => {
  const regex = /\${([^}]+)}/g
  return Object.keys([...str.matchAll(regex)].reduce((prev: any, curr: string[]) => {
    // allow environment variable defaults (shell & bash syntax)
    const envvar = curr[1]
    // exclude env vars that have a fallback default value
    const hasDefault = envvar.includes(':') || envvar.includes('=')
    if (!hasDefault) {
      prev[envvar] = 1
    }
    return prev
  }, {}))
}

export function toJsonString (env: RawEnvironment | EnvironmentVariables, pretty: boolean = false): string {
  const sorted = Object.fromEntries(Object.entries(env).sort((a, b) => a[0].localeCompare(b[0])))
  return pretty ? JSON.stringify(sorted, null, 2) : JSON.stringify(sorted)
}

/**
 * Raw Key->Value (string -> string) environment object.
 */
export type RawEnvironment = Record<string, string>

export class Environment {
  /** Used for resolving variables, but not intended to be "kept". */
  global: RawEnvironment = {}
  /** Used for resolved variables, intended to be "kept". */
  resolved: RawEnvironment = {}
  /** Transient variables, that can be explicitly purged. */
  secrets: RawEnvironment = {}
  /** All keys defined here, should be excluded from resolution. */
  doNotResolveList: string[] = []

  constructor (global: RawEnvironment = {}) {
    this.global = global
  }

  purgeSecrets (): void {
    this.secrets = {}
  }

  /**
   * Returns all environment variables, excluding secret variables.
   * @returns
   */
  getAll (): RawEnvironment {
    // N.B. order is important, because resolved variables should override global variables
    return { ...this.global, ...this.resolved }
    // N.B. secrets go in... but secrets should not come out!
  }

  setDoNotResolve (keys: string[]): void {
    this.doNotResolveList = [...keys]
  }

  hasSecret (key: string): boolean {
    return typeof this.secrets[key] === 'string'
  }

  isSecret (key: string): boolean {
    return /^.*secret.*$/i.test(key)
  }

  // put

  putGlobal (key: string, value: string): Environment {
    if (this.isSecret(key)) {
      this.secrets[key] = value
    } else {
      this.global[key] = value
    }
    return this
  }

  putResolved (key: string, value: string): Environment {
    if (this.isSecret(key)) {
      this.secrets[key] = value
    } else {
      this.resolved[key] = value
    }
    return this
  }

  putSecret (key: string, value: string): Environment {
    this.secrets[key] = value
    return this
  }

  // putAll

  putAllGlobal (env: RawEnvironment): Environment {
    Object.entries(env).forEach(([key, value]) => {
      this.putGlobal(key, value)
    })
    return this
  }

  /**
   * Put's all values into the resolved environment.
   * @param env
   * @param overwrite if true, then overwrite existing values. if false, then keep existing values. (default = true)
   * @returns
   */
  putAllResolved (env: RawEnvironment, overwrite: boolean = true): Environment {
    Object.entries(env).forEach(([key, value]) => {
      if (isDefined(this.resolved[key]) && !overwrite) {
        // do nothing... keep existing value
      } else {
        this.putResolved(key, value)
      }
    })
    return this
  }

  putAllSecrets (env: RawEnvironment): Environment {
    Object.entries(env).forEach(([key, value]) => {
      this.putSecret(key, value)
    })
    return this
  }

  willNotBeResolved (key: string): boolean {
    return this.doNotResolveList.includes(key)
  }

  getMissingRequiredKeys (resolveMe: string): string[] {
    if (typeof resolveMe !== 'string') throw new Error(`resolveMe must be a string, but was ${typeof resolveMe}`)
    const requiredKeys = getEnvVarRefs(resolveMe)
    const all = { ...this.global, ...this.resolved, ...this.secrets }
    const missingKeys = requiredKeys.filter(key =>
      typeof all[key] === 'undefined' ||
      all[key] === null ||
      (typeof all[key] === 'string' && all[key] === '')
    )
    return missingKeys
  }

  // RESOLVING VARIABLES

  isResolvableByKey (key: string): boolean {
    const value = { ...this.global, ...this.resolved, ...this.secrets }[key]
    return typeof value === 'string'
  }

  resolveByKey (key: string): string {
    // OLD return this.getAll()[key] - we want to resolve JUST IN TIME now... not before!
    if (this.isResolvableByKey(key)) {
      const value = { ...this.global, ...this.resolved, ...this.secrets }[key]
      return this.resolve(value, key)
    } else {
      throw new Error(`Environment key '${key}' is not present.`)
    }
  }

  /**
   * Resolve the value of a string, using the current environment.
   * @param resolveMe
   * @param key
   * @returns
   */
  resolve (resolveMe: string, key: string = 'NOT_DEFINED'): string {
    if (typeof resolveMe !== 'string') throw new Error(`resolveMe must be a string, but was ${typeof resolveMe}`)

    // EXEMPT_ENVIRONMENT_KEYWORDS are special exemptions - that are internally resolved!
    if (this.willNotBeResolved(key)) return resolveMe

    // check for missing environment variables
    // const requiredKeys = getEnvVarRefs(resolveMe)
    const missingKeys = this.getMissingRequiredKeys(resolveMe)
    if (missingKeys.length > 0) {
      // eslint-disable-next-line max-len
      throw new Error(`Environment '${key}' is missing required environment variables: ${JSON.stringify(missingKeys.sort())}.\nFound: ${toJsonString(this.getAll(), true)}`)
    }

    // use string replacement to resolve from the resolvedEnv
    const all = { ...this.global, ...this.resolved, ...this.secrets }
    const newValue = resolveMe.replace(/\${([^}]+)}/g, (match, p1) => all[p1])
    return newValue
  }

  /**
   * Resolve the value, and put it in the resolved environment.
   * @param key
   * @param resolveMe
   * @returns
   */
  resolveAndPutResolved (key: string, resolveMe: string): string {
    const value = this.resolve(resolveMe, key)
    this.putResolved(key, value)
    return value
  }

  /**
   * Clones this object to a new instance. Includes secrets.
   * @returns
   */
  clone (): Environment {
    const env = new Environment()
    env.global = { ...this.global }
    env.resolved = { ...this.resolved }
    env.secrets = { ...this.secrets }
    env.doNotResolveList = [...this.doNotResolveList]
    return env
  }

  /**
   * Replaces the provided environment variables with this instance. Excludes secrets.
   * @param env
   */
  replace (env: Environment): void {
    this.global = { ...env.global }
    this.resolved = { ...env.resolved }
    // this.secrets = { ...env.secrets }
    this.doNotResolveList = [...env.doNotResolveList]
  }

  /**
   * Converts the resolved environment variables to a docker .env file string.
   * @returns
   */
  envToDockerEnvfile (): string {
    return Object.entries(this.resolved).map(([k, v]) => `${k}=${v}\n`).sort().join('')
  }

  /**
   * Converts the resolved environment variables to a shell exports string.
   * @returns
   */
  envToShellExports (): string {
    const entries = Object.entries(this.resolved)
    if (entries.length === 0) return ''
    return '\n' + entries.map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"\n`).sort().join('') + '\n'
  }

  toJsonStringResolved (pretty: boolean = false): string {
    return toJsonString(this.resolved, pretty)
  }
}
