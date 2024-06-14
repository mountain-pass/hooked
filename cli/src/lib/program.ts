import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import HJSON from 'hjson'
import { cyan, yellow } from './colour.js'
import {
  fetchGlobalEnvVars,
  findScript,
  loadConfig
} from './config.js'
import { CONFIG_PATH, LOGS_MENU_OPTION } from './defaults.js'
import exitHandler from './exitHandler.js'
import { addHistory, displaySuccessfulScript, printHistory } from './history.js'
import { init } from './init.js'
import { generateAbiScripts } from './plugins/AbiPlugin.js'
import { generateMakefileScripts } from './plugins/MakefilePlugin.js'
import { generateNpmScripts } from './plugins/NpmPlugin.js'
import { resolveCmdScript, resolveInternalScript } from './scriptExecutors/ScriptExecutor.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import {
  isCmdScript,
  isDefined,
  isInternalScript,
  type EnvironmentVariables,
  type SuccessfulScript
} from './types.js'
import { Environment, type RawEnvironment } from './utils/Environment.js'
import { mergeEnvVars } from './utils/envVarUtils.js'
import logger from './utils/logger.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'

const packageJson = loadRootPackageJsonSync()

export interface ProgramOptions {
  env: string
  stdin: string
  printenv?: boolean
  pretty?: boolean
  listenvs?: boolean
  init?: boolean
  log?: boolean
  batch?: boolean
  pull?: boolean
  update?: boolean
}

export const newProgram = (systemProcessEnvs: RawEnvironment, exitOnError = true): Command => {
  const program = new Command()

  program
    .name('hooked')
    .description('CLI to execute preconfigured scripts.\n\nUpdate: npm i -g --prefer-online --force @mountainpass/hooked-cli')
    .version(packageJson.version, '-v, --version')
    .option('--init', 'runs the initialisation wizard')
    .option('-e, --env <env>', 'accepts a comma separated list of environment names ("default" is always on)', 'default')
    .option('-in, --stdin <json>', 'allows predefining stdin responses', '{}')
    .option('--printenv', 'print the resolved environment, and exits')
    .option('--pretty', 'prints the output (printenv) in pretty format')
    .option('--listenvs', 'lists the available environments, and exits')
    .option('-l, --log', 'print the log of previous scripts')
    .option('-p, --pull', 'force download all imports from remote to local cache')
    .option('-u, --update', 'updates to the latest version of hooked')
    .option('-b, --batch', 'non-interactive "batch" mode - errors if an interactive prompt is required (also enabled using CI environment variable)')
    .argument('[scriptPath...]', 'the script path to run')
    .usage('[options]')
    .action(async (scriptPath: string[], options: ProgramOptions) => {
      const env = new Environment()
      env.doNotResolveList = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']
      env.putAllGlobal(systemProcessEnvs)
      env.putResolved('HOOKED_DIR', path.dirname(CONFIG_PATH))
      env.putResolved('HOOKED_FILE', CONFIG_PATH)

      // if CI env var is set, then set batch mode...
      if (env.isResolvableByKey('CI') && options.batch !== true) {
        logger.debug('CI environment variable detected. Setting batch mode...')
        options.batch = true
      }

      // initialise a new project...
      if (options.init === true) {
        await init(options)
        return
      }

      // no config? initialise a new project...
      if (!fs.existsSync(CONFIG_PATH)) {
        logger.debug('No config file found. Launching setup...')
        await init(options)
        return
      }

      // show logs
      if (options.log === true) {
        printHistory()
        return
      }

      // load imports...
      const config = await loadConfig(CONFIG_PATH, options.pull)

      // show update command...
      if (options.update === true) {
        logger.info(`Please run the command: ${cyan('npm i -g --prefer-online --force @mountainpass/hooked-cli')}`)
      }

      // exit if pull or update...
      if (options.pull === true || options.update === true) {
        return
      }

      // load default env...
      const envVars: EnvironmentVariables = {}
      await fetchGlobalEnvVars(
        config,
        ['default'],
        options,
        envVars
      )

      // setup default plugins...
      config.plugins = { ...{ abi: false, icons: true, npm: true, make: true }, ...(config.plugins ?? {}) }

      // check for newer versions
      if (options.batch !== true && !env.isResolvableByKey('SKIP_VERSION_CHECK') && !isDefined(envVars.SKIP_VERSION_CHECK)) {
        await verifyLocalRequiredTools.verifyLatestVersion(env)
      } else {
        logger.debug('Skipping version check...')
      }

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
          ...generateNpmScripts(env),
          ...config.scripts
        }
      }

      // check for Makefile
      if (config.plugins?.make) {
        config.scripts = {
          ...generateMakefileScripts(env),
          ...config.scripts
        }
      }

      // show environment names...
      if (options.listenvs === true) {
        logger.info(`Available environments: ${yellow(Object.keys(config.env).join(', '))}`)
        return
      }

      // find the script to execute...
      const [script, resolvedScriptPath] = await findScript(config, scriptPath, options)

      // check the script is executable...
      if (!isCmdScript(script) && !isInternalScript(script)) {
        throw new Error(`Unknown script type "${typeof script}" : ${JSON.stringify(script)}`)
      }

      // merge in the stdin...
      const stdin: RawEnvironment = HJSON.parse(options.stdin)
      mergeEnvVars(envVars, stdin)

      const providedEnvNames = options.env.split(',')
      // fetch the environment variables...
      const [, resolvedEnvNames] = await fetchGlobalEnvVars(
        config,
        providedEnvNames,
        options,
        envVars
      )

      // resolve script env vars (if any)
      if (isCmdScript(script) && isDefined(script.$env)) {
        // execute script...
        mergeEnvVars(envVars, script.$env)
      }

      // generate rerun command
      const successfulScript: SuccessfulScript = {
        ts: Date.now(),
        scriptPath: resolvedScriptPath,
        envNames: [...new Set(['default', ...resolvedEnvNames])],
        stdin
      }
      // store and log "Rerun" command in history (if successful and not the _logs_ option!)
      const isRoot = !env.isResolvableByKey('HOOKED_ROOT') && !isDefined(envVars.HOOKED_ROOT)
      const notRequestingLogs = resolvedScriptPath[0] !== LOGS_MENU_OPTION
      if (isRoot && notRequestingLogs) {
        logger.debug(`Rerun: ${displaySuccessfulScript(successfulScript)}`)
      }

      // execute script
      if (isCmdScript(script)) {
        // run cmd script
        await resolveCmdScript('-', script, stdin, env, config, options, envVars, true)
      } else if (isInternalScript(script)) {
        // run internal script
        await resolveInternalScript('-', script, stdin, env, config, options, envVars, true)
      } else if (options.printenv === true) {
        throw new Error(`Cannot print environment variables for this script type - script="${JSON.stringify(script)}"`)
      }

      // NOTE - update history file AFTER script is run... (otherise `git porcelain` complains about file changes)
      if (isRoot && notRequestingLogs) {
        addHistory(successfulScript)
      }
    })

  return program
}

export default async (argv: string[] = process.argv): Promise<Command> => {
  const program = newProgram(process.env as RawEnvironment)

  exitHandler.onExit()

  return await program.parseAsync(argv)
}
