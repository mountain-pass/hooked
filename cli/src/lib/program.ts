import { Argument, Command, Option } from 'commander'
import fs from 'fs'
import HJSON from 'hjson'
import { cyan, yellow } from './colour.js'
import common from './common/invoke.js'
import loaders from './common/loaders.js'
import defaults from './defaults.js'
import exitHandler from './exitHandler.js'
import { init, initialiseConfig, initialiseDocker, initialiseSsl } from './initialisers.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import server from './server/server.js'
import {
  isNumber,
  isString,
  isUndefined
} from './types.js'
import { type RawEnvironment } from './utils/Environment.js'
import logger from './utils/logger.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'
import { HookedServerSchemaType } from './schema/HookedSchema.js'

const packageJson = loadRootPackageJsonSync()

export interface ProgramOptions {
  env: string
  stdin: string
  listEnvs?: boolean
  logLevel?: string
  skipCleanup?: boolean
  skipVersionCheck?: boolean
  dockerHookedDir?: string
  timezone?: string
  init?: boolean
  initConfig?: boolean
  initSsl?: boolean
  initDocker?: boolean
  pull?: boolean
  update?: boolean
  batch?: boolean
  config?: string
  help?: boolean
  server?: number
  sslCert?: string
  sslKey?: string
  apiKey?: string
  force: boolean
  scriptPath?: string[] // this is here because of the command args
}

export const newProgram = (systemProcessEnvs: RawEnvironment): Command => {
  const program = new Command()

  program
    .name('hooked')
    .description('CLI to execute preconfigured scripts.\n\nUpdate: npm i -g --prefer-online --force @mountainpass/hooked-cli')
    .version(packageJson.version, '-v, --version', 'Output the current version of hooked.')

    .addOption(new Option('-i, --init', 'Runs the initialisation wizard, and exits.')
      .env('INIT'))

    .addOption(new Option('-ic, --initConfig', 'Creates a basic configuration file (hooked.yaml) in the current directory.')
      .default(false).env('INIT_CONFIG'))

    .addOption(new Option('-is, --initSsl', 'Creates self signed SSL certificates (hooked-cert.pem and hooked-key.pem) in the current directory.')
      .default(false).env('INIT_SSL'))

    .addOption(new Option('-id, --initDocker', 'Initialises a Docker compose file, starts the service, and exits.')
      .default(false).env('INIT_DOCKER'))

    .addOption(new Option('-f, --force', 'Forces the operation - usually with regard to overwriting a file.')
      .default(false).env('FORCE'))

    .addOption(new Option('-e, --env <env>', 'Accepts a comma separated list of environment names (environment "default" is always on).')
      .default('default').env('ENV'))

    .addOption(new Option('-in, --stdin <json>', 'Allows predefining stdin responses.')
      .default('{}').env('STDIN'))

    .addOption(new Option('-ls, --listEnvs', 'Lists the available environments, and exits.')
      .env('LISTENVS'))

    .addOption(new Option('-ll, --logLevel <logLevel>', '<info|debug|warn|error> Specifies the log level.')
      .default('info').env('LOG_LEVEL'))

    .addOption(new Option('-sc, --skipCleanup', "If 'true', doesn't cleanup old *.sh files. Useful for debugging.")
      .default(false).env('SKIP_CLEANUP'))

    .addOption(new Option('-svc, --skipVersionCheck', 'If present, skips the version check at startup.')
      .default(false).env('SKIP_VERSION_CHECK'))

    .addOption(new Option(
      '-dhd, --dockerHookedDir <dockerHookedDir>',
      'Used to specify the HOOKED directory in relation to the Docker host.')
      .env('DOCKER_HOOKED_DIR'))

    .addOption(new Option('-tz, --timezone <timezone>', "The timezone to use for Cron triggers. e.g. 'Australia/Sydney'.")
      .default(Intl.DateTimeFormat().resolvedOptions().timeZone).env('TZ'))

    .addOption(new Option('-p, --pull', 'Force download all imports from remote to local cache.')
      .env('PULL'))

    .addOption(new Option('-u, --update', 'Prints the command to update to the latest version of hooked, and exits.')
      .env('UPDATE'))

    .addOption(new Option('-b, --batch', 'Non-interactive "batch" mode - errors if an interactive prompt is required.')
      .env('CI'))

    .addOption(new Option('-c, --config <config>', 'Specify the hooked configuration file to use.')
      .env('CONFIG'))

    .addOption(new Option('-sp, --scriptPath', 'A space-delimited script path to execute (supercedes the argument).')
      .argParser((val: string) => val.trim().split(' '))
      .env('SCRIPTPATH'))

    .addOption(new Option('-s, --server [port]', 'Runs hooked in server mode. Enables cron jobs, rest api and web ui.')
      .argParser(parseInt)
      .implies({ batch: true })
      .env('SERVER')
      .preset(4000)
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listEnvs', 'log', 'update'])
    )

    .addOption(new Option('--ssl', 'Enable SSL, using the default hooked-cert.pem and hooked-key.pem files.')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listEnvs', 'log', 'update'])
      .env('SSL')
      .implies({
        sslKey: 'hooked-key.pem',
        sslCert: 'hooked-cert.pem'
      })
    )

    .addOption(new Option('--sslKey [sslKey]', 'The no-passphrase private key in PEM format.')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listEnvs', 'log', 'update'])
      .env('SSL_KEY')
      .preset('hooked-key.pem')
    )

    .addOption(new Option('--sslCert [sslCert]', 'The certificate chains in PEM format.')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listEnvs', 'log', 'update'])
      .env('SSL_CERT')
      .preset('hooked-cert.pem')
    )

    .addOption(new Option('--api-key <apiKey>', 'The "Authorization" Bearer token, that must be present to access API endpoints.')
      .env('API_KEY')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listEnvs', 'log', 'update'])
    )
    .addArgument(new Argument('[scriptPath...]', 'The space delimited, path of the script to run.')
      .default([]))
    .addHelpText('afterAll', `
Provided Environment Variables:
  HOOKED_FILE            The root hooked.yaml file that was run.
  HOOKED_DIR             The parent directory of the HOOKED_FILE.
  HOOKED_ROOT            <true|false> True if the current script is the root file.
    `)
    .usage('[options]')
    .action(async (scriptPathArgs: string[], options: ProgramOptions) => {
      // exit handler
      exitHandler.onExit(options)

      // set log level
      logger.setLogLevel(options.logLevel)

      // set the script path from the command line arguments
      if (isUndefined(options.scriptPath)) {
        options.scriptPath = scriptPathArgs
      }

      // set the default configuration location (should be first step!)
      defaults.setDefaultConfigurationFilepath(options.config)

      // check for server mode
      const port = options.server
      const isServerMode = isNumber(port)

      // show update command...
      if (options.update === true) {
        logger.info(`Please run the command: ${cyan('npm i -g --prefer-online --force @mountainpass/hooked-cli')}`)
        return
      }

      // print help
      if (options.help === true) {
        program.help()
        return
      }

      // initialise a new project...
      if (options.init === true) {
        // ensure the default configuration file path is ${HOOKED_DIR}/hooked.yaml, and not ~/hooked.yaml!
        await init(options)
        return
      }
      if (options.initConfig === true) {
        await initialiseConfig(options)
      }
      if (options.initSsl === true) {
        await initialiseSsl(options)
      }
      if (options.initDocker === true) {
        await initialiseDocker(options)
        return // NOTE - exit after docker initialisation!
      }

      // no config? initialise a new project...
      const defaultInstance = defaults.getDefaults()
      if (!fs.existsSync(defaultInstance.HOOKED_FILE)) {
        logger.warn(`No config file found at '${defaultInstance.HOOKED_FILE}'. Launching setup...`)
        await init(options)
        return
      } else {
        logger.debug(`Using config file: ${defaultInstance.HOOKED_FILE}`)
      }

      // check for newer versions
      if (options.skipVersionCheck !== true) {
        await verifyLocalRequiredTools.verifyLatestVersion()
      } else {
        logger.debug('Skipping version check...')
      }

      // load configuration (after init, in case the config file was just created!)
      const config = await loaders.loadConfiguration(systemProcessEnvs, options)

      // show environment names...
      if (options.listEnvs === true) {
        logger.info(`Available environments: ${yellow(Object.keys(config.env ?? {}).join(', '))}`)
        return
      }

      if (isServerMode) {
        // server mode
        await server.startServer(port, systemProcessEnvs, options, config.server ?? {} as any)
      } else {
        // script mode
        const providedEnvNames = options.env.split(',')
        const stdin: RawEnvironment = HJSON.parse(options.stdin)
        await common.invoke(null, systemProcessEnvs, options, config, providedEnvNames, options.scriptPath, stdin, true, false)
      }

      // generate rerun command (do before running script - reason: if errors, won't know how to re-run?)
      // Or should we ONLY store succesful scripts? I mean... it's in there in the name.
      // const successfulScript: SuccessfulScript = {
      //   ts: Date.now(),
      //   scriptPath: result.paths,
      //   envNames: [...new Set(['default', ...result.envNames])],
      //   stdin: result.envVars
      // }
      // // store and log "Rerun" command in history (if successful and not the _logs_ option!)
      // const isRoot = result.envVars.HOOKED_ROOT === 'true'
      // const notRequestingLogs = result.paths.join(' ') !== defaults.getDefaults().LOGS_MENU_OPTION
      // if (isRoot && notRequestingLogs) {
      //   logger.debug(`Rerun: ${displaySuccessfulScript(successfulScript)}`)
      // }

      // // NOTE - update history file AFTER script is run... (otherise `git porcelain` complains about file changes)
      // if (isRoot && notRequestingLogs) {
      //   addHistory(successfulScript)
      // }
    })

  return program
}

export default async (argv: string[] = process.argv): Promise<Command> => {
  const program = newProgram(process.env as RawEnvironment)
  return await program.parseAsync(argv)
}
