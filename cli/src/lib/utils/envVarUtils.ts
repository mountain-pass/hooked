import { type EnvironmentVariables } from '../types'

/**
 * Merges the "add" env vars into the "base" env vars.
 * @param baseEnvVars1
 * @param addEnvVars2
 */
export const mergeEnvVars = (baseEnvVars1: EnvironmentVariables, addEnvVars2: EnvironmentVariables): void => {
  for (const [key, value] of Object.entries(addEnvVars2)) {
    baseEnvVars1[key] = value
  }
}
