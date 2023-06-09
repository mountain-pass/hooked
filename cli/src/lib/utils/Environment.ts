
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

export class Environment {
  /** Used for resolving variables, but not intended to be "kept". */
  global: Record<string, string> = {}
  /** Used for resolved variables, intended to be "kept". */
  resolved: Record<string, string> = {}
  /** Transient variables, that can be explicitly purged. */
  secrets: Record<string, string> = {}
  /** All keys defined here, should be excluded from resolution. */
  doNotResolveList: string[] = []

  constructor (global: Record<string, string> = {}) {
    this.global = global
  }

  purgeSecrets (): void {
    this.secrets = {}
  }

  getAll (): Record<string, string> {
    // N.B. order is important, because resolved variables should override global variables
    return { ...this.global, ...this.resolved, ...this.secrets }
  }

  getResolved (key: string): string {
    return this.getAll()[key]
  }

  hasResolved (key: string): boolean {
    return typeof this.getResolved(key) === 'string'
  }

  isSecret (key: string): boolean {
    return /^.*secret.*$/i.test(key)
  }

  // put

  putGlobal (key: string, value: string): void {
    if (this.isSecret(key)) {
      this.secrets[key] = value
    } else {
      this.global[key] = value
    }
  }

  putResolved (key: string, value: string): void {
    if (this.isSecret(key)) {
      this.secrets[key] = value
    } else {
      this.resolved[key] = value
    }
  }

  putSecret (key: string, value: string): void {
    this.secrets[key] = value
  }

  // putAll

  putAllGlobal (env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      this.putGlobal(key, value)
    })
  }

  putAllResolved (env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      this.putResolved(key, value)
    })
  }

  putAllSecrets (env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      this.putSecret(key, value)
    })
  }

  willNotBeResolved (key: string): boolean {
    return this.doNotResolveList.includes(key)
  }

  getMissingRequiredKeys (resolveMe: string): string[] {
    const requiredKeys = getEnvVarRefs(resolveMe)
    const all = this.getAll()
    const missingKeys = requiredKeys.filter(key => typeof all[key] === 'undefined')
    return missingKeys
  }

  resolve (resolveMe: string, key: string = 'NOT_DEFINED'): string {
    // EXEMPT_ENVIRONMENT_KEYWORDS are special exemptions - that are internally resolved!
    if (this.willNotBeResolved(key)) return resolveMe

    // check for missing environment variables
    // const requiredKeys = getEnvVarRefs(resolveMe)
    const missingKeys = this.getMissingRequiredKeys(resolveMe)
    if (missingKeys.length > 0) {
      // eslint-disable-next-line max-len
      throw new Error(`Environment '${key}' is missing required environment variables: ${JSON.stringify(missingKeys)}. Found ${JSON.stringify(Object.keys(this.getAll()))}`)
    }

    // use string replacement to resolve from the resolvedEnv
    const all = this.getAll()
    const newValue = resolveMe.replace(/\${([^}]+)}/g, (match, p1) => all[p1])
    return newValue
  }

  resolvePutResolved (key: string, resolveMe: string): string {
    const value = this.resolve(resolveMe, key)
    this.putResolved(key, value)
    return value
  }

  clone (): Environment {
    const env = new Environment()
    env.global = { ...this.global }
    env.resolved = { ...this.resolved }
    env.secrets = { ...this.secrets }
    env.doNotResolveList = [...this.doNotResolveList]
    return env
  }
}
