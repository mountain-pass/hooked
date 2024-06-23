import { Command, Option } from 'commander'
import fs from 'fs'
import HJSON from 'hjson'
import { cyan, yellow } from './colour.js'
import {
  fetchGlobalEnvVars,
  findScript,
  loadConfig
} from './config.js'
import defaults from './defaults.js'
import exitHandler from './exitHandler.js'
import { addHistory, displaySuccessfulScript, printHistory } from './history.js'
import { init } from './init.js'
import { generateAbiScripts } from './plugins/AbiPlugin.js'
import { generateMakefileScripts } from './plugins/MakefilePlugin.js'
import { generateNpmScripts } from './plugins/NpmPlugin.js'
import { executeScriptsSequentially, resolveScripts, verifyScriptsAreExecutable } from './scriptExecutors/ScriptExecutor.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import {
  type ScriptAndPaths,
  isDefined,
  isJobsSerialScript,
  isNumber,
  type EnvironmentVariables,
  type Script,
  type SuccessfulScript
} from './types.js'
import { Environment, type RawEnvironment } from './utils/Environment.js'
import { mergeEnvVars } from './utils/envVarUtils.js'
import logger from './utils/logger.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'
import express from 'express'
import router from './server/router.js'
import common from './runtime/common.js'

const packageJson = loadRootPackageJsonSync()

export interface ProgramOptions {
  env: string
  stdin: string
  printenv?: boolean
  pretty?: boolean
  listenvs?: boolean
  init?: boolean
  log?: boolean
  pull?: boolean
  update?: boolean
  batch?: boolean
  config?: string
  help?: boolean
  server?: number
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
    .option('-c, --config <config>', 'specify the hooked configuration file to use')
    .addOption(new Option('-s, --server [port]', 'runs hooked in server mode. Enables cron jobs, rest api and web ui.')
      .argParser(parseInt)
      .implies({ batch: true })
      .preset(4000)
      .conflicts(['version', 'init', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
    )
    .argument('[scriptPath...]', 'the script path to run', '')
    .addHelpText('afterAll', `
Environment Variables:
  LOG_LEVEL            <info|debug|warn|error> Specifies the log level. (default: "debug")
  SKIP_CLEANUP         If 'true', doesn't cleanup old *.sh files. Useful for debugging.
  SKIP_VERSION_CHECK   If present, skips the version check at startup.

Provided Environment Variables:
  HOOKED_FILE          The root hooked.yaml file that was run.
  HOOKED_DIR           The parent directory of the HOOKED_FILE.
  HOOKED_ROOT          <true|false> True if the current script is the root file.
    `)
    .usage('[options]')
    .action(async (scriptPath: string[], options: ProgramOptions) => {
      // set the default configuration location
      defaults.setDefaultConfigurationFilepath(options.config)

      const env = new Environment()
      env.doNotResolveList = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']
      env.putAllGlobal(systemProcessEnvs)
      env.putResolved('HOOKED_DIR', defaults.getDefaults().HOOKED_DIR)
      env.putResolved('HOOKED_FILE', defaults.getDefaults().HOOKED_FILE)

      if (options.help === true) {
        program.help()
        return
      }

      // if CI env var is set, then set batch mode...
      if (env.isResolvableByKey('CI') && options.batch !== true) {
        logger.debug('CI environment variable detected. Setting batch mode...')
        options.batch = true
      }

      // initialise a new project...
      if (options.init === true) {
        // ensure the default configuration file path is ${HOOKED_DIR}/hooked.yaml, and not ~/hooked.yaml!
        defaults.setDefaultConfigurationFilepath('hooked.yaml')
        await init(options)
        return
      }

      // no config? initialise a new project...
      if (!fs.existsSync(defaults.getDefaults().HOOKED_FILE)) {
        logger.debug(`No config file found at '${defaults.getDefaults().HOOKED_FILE}'. Launching setup...`)
        await init(options)
        return
      } else {
        logger.debug(`Using config file: ${defaults.getDefaults().HOOKED_FILE}`)
      }

      // show logs
      if (options.log === true) {
        printHistory()
        return
      }

      // load imports...
      const config = await loadConfig(defaults.getDefaults().HOOKED_FILE, options.pull)

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
      config.plugins = { ...{ abi: false, icons: true, npm: true, makefile: true }, ...(config.plugins ?? {}) }

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
      if (config.plugins?.makefile) {
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

      // check if we should run a server
      const port = options.server
      if (isNumber(port)) {
        const app = express()
        app.use(express.json())
        app.use(await router.router(options, config, envVars, env))
        const server = app.listen(port, () => { logger.info(`Server listening: http://localhost:${port}`) })
        const shutdownServer = (): void => {
          if (server.listening) {
            logger.debug('Server shutting down...')
            server.close((err) => {
              if (err != null) {
                console.error(`Error stopping server: ${err.message}`)
                process.exit(1)
              } else {
                logger.debug('Server shutdown successfully.')
              }
            })
          }
        }
        process.on('SIGINT', shutdownServer)
        return
      }

      // merge in the stdin...
      const providedEnvNames = options.env.split(',')
      const stdin: RawEnvironment = HJSON.parse(options.stdin)

      const result = await common.invoke(options, config, envVars, env, providedEnvNames, scriptPath, stdin, true, false)

      // generate rerun command (do before running script - reason: if errors, won't know how to re-run?)
      // Or should we ONLY store succesful scripts? I mean... it's in there in the name.
      const successfulScript: SuccessfulScript = {
        ts: Date.now(),
        scriptPath: result.paths,
        envNames: [...new Set(['default', ...result.env])],
        stdin
      }
      // store and log "Rerun" command in history (if successful and not the _logs_ option!)
      const isRoot = !env.isResolvableByKey('HOOKED_ROOT') && !isDefined(envVars.HOOKED_ROOT)
      const notRequestingLogs = result.paths.join(' ') !== defaults.getDefaults().LOGS_MENU_OPTION
      if (isRoot && notRequestingLogs) {
        logger.debug(`Rerun: ${displaySuccessfulScript(successfulScript)}`)
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
