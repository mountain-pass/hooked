
import { fetchGlobalEnvVars, findScript } from '../config.js'
import { type ProgramOptions } from '../program.js'
import { executeScriptsSequentially, resolveScripts, verifyScriptsAreExecutable } from '../scriptExecutors/ScriptExecutor.js'
import { type AuthorisedUser } from '../server/server.js'
import {
  isJobsSerialScript,
  isString,
  type EnvironmentVariables,
  type ScriptAndPaths,
  type StdinResponses,
  type YamlConfig
} from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import { mergeEnvVars } from '../utils/envVarUtils.js'
import logger from '../utils/logger.js'
import loaders from './loaders.js'

/**
 * Contains the result of invoking a script.
 *
 * (TODO Duplicates SuccessfulScript ?)
 */
export interface InvocationResult {
  /** True, if Script finished successfully. */
  success: boolean
  /** ISO Date when Script finished. */
  finishedAt: number
  /** The resolved Env Names. */
  envNames: string[]
  /** The resolved Script Path. */
  paths: string[]
  /** The resolved Environment Variables. */
  envVars: EnvironmentVariables
  /** Script outputs. */
  outputs: string[]
}

/**
   * Invokes a script with the provided environment names.
   * @param providedEnvNames
   * @param scriptPath
   * @returns
   */
const invoke = async (
  user: AuthorisedUser | null,
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions,
  config: YamlConfig,
  providedEnvNames: string[],
  scriptPath: string[],
  stdin: StdinResponses,
  isFinalScript: boolean,
  storeResultAsEnv: boolean
): Promise<InvocationResult> => {
  const { env, envVars } = await loaders.initialiseEnvironment(systemProcessEnvs, options, config)
  logger.debug(`Running script: env=${providedEnvNames.join(',')} script=${scriptPath.join(',')}`)

  // find the script to execute...
  const rootScriptAndPaths = await findScript(config, scriptPath, options)
  console.log('rootScriptAndPaths', rootScriptAndPaths)
  const [script, paths] = rootScriptAndPaths

  // verify user has access to invoke script
  if (user !== null) {
    const scriptAccessRoles: string[] = (script as any).accessRoles ?? ['admin']
    const canInvoke = scriptAccessRoles.some(role => user.accessRoles.includes(role))
    if (!canInvoke) {
      throw new Error('User is not allowed to invoke this script.')
    }
  }

  // merge in the stdin...
  mergeEnvVars(envVars, stdin)

  // fetch the environment variables...
  const [, resolvedEnvNames] = await fetchGlobalEnvVars(
    config,
    providedEnvNames,
    options,
    envVars
  )
  logger.debug(`Resolved environment: ${JSON.stringify(envVars)}`)

  // executable scripts
  let executableScriptsAndPaths: ScriptAndPaths[] = [rootScriptAndPaths]

  if (isJobsSerialScript(script)) {
    // resolve job definitions
    executableScriptsAndPaths = await resolveScripts(paths, script, config, options)
  }

  // check executable scripts are actually executable
  verifyScriptsAreExecutable(executableScriptsAndPaths)

  // execute scripts sequentially
  const outputs = await executeScriptsSequentially(
    executableScriptsAndPaths,
    stdin,
    env,
    config,
    options,
    envVars,
    isFinalScript,
    storeResultAsEnv
  )

  return {
    success: true,
    finishedAt: Date.now(),
    envNames: resolvedEnvNames,
    paths,
    envVars,
    outputs
  }
}

export default { invoke }
