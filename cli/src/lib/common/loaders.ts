import { fetchGlobalEnvVars, loadConfig } from '../config.js'
import defaults from '../defaults.js'
import { generateAbiScripts } from '../plugins/AbiPlugin.js'
import { generateMakefileScripts } from '../plugins/MakefilePlugin.js'
import { generateNpmScripts } from '../plugins/NpmPlugin.js'
import { type ProgramOptions } from '../program.js'
import { type EnvironmentVariables, type YamlConfig } from '../types.js'
import { Environment, type RawEnvironment } from '../utils/Environment.js'

/**
 * Loads the configuration from file, and initialises plugins.
 * @param systemProcessEnvs
 * @param options
 * @returns
 */
const loadConfiguration = async (systemProcessEnvs: RawEnvironment, options: ProgramOptions): Promise<YamlConfig> => {
  // load imports...
  const config = await loadConfig(defaults.getDefaults().HOOKED_FILE, options.pull)

  // setup default plugins...
  config.plugins = { ...{ abi: false, icons: true, npm: true, makefile: true }, ...(config.plugins ?? {}) }

  // check for abi files
  if (config.plugins?.abi) {
    config.scripts = {
      ...(await generateAbiScripts()),
      ...config.scripts
    }
  }

  // check for package.json (npm)
  if (config.plugins?.npm) {
    config.scripts = {
      ...generateNpmScripts(systemProcessEnvs),
      ...config.scripts
    }
  }

  // check for Makefile
  if (config.plugins?.makefile) {
    config.scripts = {
      ...generateMakefileScripts(systemProcessEnvs),
      ...config.scripts
    }
  }

  return config
}

/**
 * Initialises a new environment for a script invocation.
 * @param systemProcessEnvs
 * @param options
 * @param config
 * @returns
 */
const initialiseEnvironment = async (
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions,
  config: YamlConfig

): Promise<{ envVars: EnvironmentVariables, env: Environment }> => {
  const env = new Environment()
  env.doNotResolveList = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']
  env.putAllGlobal(systemProcessEnvs)
  env.putResolved('HOOKED_DIR', defaults.getDefaults().HOOKED_DIR)
  env.putResolved('HOOKED_FILE', defaults.getDefaults().HOOKED_FILE)

  // load default env...
  const envVars: EnvironmentVariables = {}
  await fetchGlobalEnvVars(
    config,
    ['default'],
    options,
    envVars
  )

  return { env, envVars }
}

export default { loadConfiguration, initialiseEnvironment }
