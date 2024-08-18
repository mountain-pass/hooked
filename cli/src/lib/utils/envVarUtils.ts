import { isStdinScript, isString, type EnvironmentVariables } from '../types.js'
import logger from './logger.js'

/**
 * Merges the "add" env vars into the "base" env vars.
 * @param baseEnvVars1
 * @param addEnvVars2
 */
export const mergeEnvVars = (baseEnvVars1: EnvironmentVariables, addEnvVars2: EnvironmentVariables): void => {
  for (const [key, value] of Object.entries(addEnvVars2)) {
    // NOTE don't overwrite a resolved string value, with a stdin script.
    // We want to be about to input environment variable "answers" to stdin scripts,
    // to facilitate server/batch mode.
    if (isString(baseEnvVars1[key]) && isStdinScript(value)) {
      // don't overwrite key... continue...
      logger.debug(`Not overwriting ${key} value=${baseEnvVars1[key]} with stdin script ${JSON.stringify(value)}`)
      continue
    } else {
      logger.debug(`Overwriting ${key} value=${baseEnvVars1[key] as string} with stdin script ${JSON.stringify(value)}`)
      baseEnvVars1[key] = value
    }
  }
}
