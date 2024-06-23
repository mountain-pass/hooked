
import { fetchGlobalEnvVars, findScript } from '../config.js'
import { type ProgramOptions } from '../program.js'
import { executeScriptsSequentially, resolveScripts, verifyScriptsAreExecutable } from '../scriptExecutors/ScriptExecutor.js'
import {
  isJobsSerialScript,
  type EnvironmentVariables,
  type ScriptAndPaths,
  type StdinResponses,
  type YamlConfig
} from '../types.js'
import { type Environment } from '../utils/Environment.js'
import { mergeEnvVars } from '../utils/envVarUtils.js'
import logger from '../utils/logger.js'

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
  env: string[]
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
  options: ProgramOptions,
  config: YamlConfig,
  parentEnvVars: EnvironmentVariables,
  parentEnvironment: Environment,
  providedEnvNames: string[],
  scriptPath: string[],
  stdin: StdinResponses,
  isFinalScript: boolean,
  storeResultAsEnv: boolean
): Promise<InvocationResult> => {
  const envVars: EnvironmentVariables = { ...parentEnvVars }
  logger.debug(`Running script: env=${providedEnvNames.join(',')} script=${scriptPath.join(',')}`)

  // find the script to execute...
  const rootScriptAndPaths = await findScript(config, scriptPath, options)
  const [script, paths] = rootScriptAndPaths

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
    parentEnvironment.clone(),
    config,
    options,
    envVars,
    isFinalScript,
    storeResultAsEnv
  )

  return {
    success: true,
    finishedAt: Date.now(),
    env: resolvedEnvNames,
    paths,
    envVars,
    outputs
  }
}

export default { invoke }
