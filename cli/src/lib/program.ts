import { Command, Option } from 'commander'
import fs from 'fs'
import HJSON from 'hjson'
import { cyan, yellow } from './colour.js'
import common from './common/invoke.js'
import loaders from './common/loaders.js'
import defaults from './defaults.js'
import exitHandler from './exitHandler.js'
import { init, writeBlankConfig } from './init.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import server from './server/server.js'
import {
  isNumber,
  isString
} from './types.js'
import { type RawEnvironment } from './utils/Environment.js'
import logger from './utils/logger.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'

const packageJson = loadRootPackageJsonSync()

export interface ProgramOptions {
  env: string
  stdin: string
  listenvs?: boolean
  logLevel?: string
  //
  // skipCleanup?: boolean
  // skipVersionCheck?: boolean
  // dockerHookedDir?: string
  //
  tz?: string
  init?: boolean
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
  scriptPath?: string
}

export const newProgram = (systemProcessEnvs: RawEnvironment): Command => {
  const program = new Command()

  program
    .name('hooked')
    .description('CLI to execute preconfigured scripts.\n\nUpdate: npm i -g --prefer-online --force @mountainpass/hooked-cli')
    .version(packageJson.version, '-v, --version')

    .addOption(new Option('-i, --init', 'Runs the initialisation wizard')
      .env('INIT'))

    .addOption(new Option('-f, --force', 'Forces the operation - usually with regard to overwriting a file')
      .default(false).env('FORCE'))

    .addOption(new Option('-e, --env <env>', 'Accepts a comma separated list of environment names ("default" is always on)')
      .default('default').env('ENV'))

    .addOption(new Option('-in, --stdin <json>', 'Allows predefining stdin responses')
      .default('{}').env('STDIN'))

    .addOption(new Option('-ls, --listenvs', 'Lists the available environments, and exits')
      .env('LISTENVS'))

    .addOption(new Option('-ll, --logLevel <logLevel>', '<info|debug|warn|error> Specifies the log level. (default: "debug").')
      .default('info').env('LOG_LEVEL'))

  // .addOption(new Option('-sc, --skipCleanup', "If 'true', doesn't cleanup old *.sh files. Useful for debugging.")
  //   .env('SKIP_CLEANUP'))

  // .addOption(new Option('-svc, --skipVersionCheck', 'If present, skips the version check at startup.')
  //   .env('SKIP_VERSION_CHECK'))

  // .addOption(new Option(
  //   '-dhd, --dockerHookedDir <dockerHookedDir>',
  //   'Used to specify the HOOKED directory in relation to the Docker host. (Note: Required for Docker jobs!)')
  //   .env('DOCKER_HOOKED_DIR'))

    .addOption(new Option('-tz, --timezone <timezone>', "The timezone to use for Cron triggers. e.g. 'Australia/Sydney'")
      .default(Intl.DateTimeFormat().resolvedOptions().timeZone).env('TZ'))

    .addOption(new Option('-p, --pull', 'Force download all imports from remote to local cache')
      .env('PULL'))

    .addOption(new Option('-u, --update', 'Prints the command to update to the latest version of hooked')
      .env('UPDATE'))

    .addOption(new Option('-b, --batch', 'Non-interactive "batch" mode - errors if an interactive prompt is required.')
      .env('CI'))

    .addOption(new Option('-c, --config <config>', 'Specify the hooked configuration file to use')
      .env('CONFIG'))

    .addOption(new Option('-sp, --scriptPath', 'A space-delimited script path to execute (supercedes the argument).')
      .env('SCRIPTPATH'))

    .addOption(new Option('-s, --server [port]', 'Runs hooked in server mode. Enables cron jobs, rest api and web ui.')
      .argParser(parseInt)
      .implies({ batch: true })
      .env('SERVER')
      .preset(4000)
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
    )

    .addOption(new Option('--ssl', 'Enable SSL, using the default hooked-cert.pem and hooked-key.pem files.')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
      .env('SSL')
      .implies({
        sslKey: 'hooked-key.pem',
        sslCert: 'hooked-cert.pem'
      })
    )

    .addOption(new Option('--ssl-key [sslKey]', 'The private keys in PEM format. (todo: add passphrase support?)')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
      .env('SSL_KEY')
      .preset('hooked-key.pem')
    )

    .addOption(new Option('--ssl-cert [sslCert]', 'The certificate chains in PEM format.')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
      .env('SSL_CERT')
      .preset('hooked-cert.pem')
    )

    .addOption(new Option('--api-key <apiKey>', 'The "Authorization" Bearer token, that must be present to access API endpoints.')
      .env('API_KEY')
      .conflicts(['version', 'env', 'stdin', 'printenv', 'pretty', 'listenvs', 'log', 'update'])
    )
    .argument('[scriptPath...]', 'the script path to run', '')
    .addHelpText('afterAll', `
Environment Variables:
  LOG_LEVEL              <info|debug|warn|error> Specifies the log level. (default: "debug").
  SKIP_CLEANUP           If 'true', doesn't cleanup old *.sh files. Useful for debugging.
  SKIP_VERSION_CHECK     If present, skips the version check at startup.
  DOCKER_HOOKED_DIR      Used to specify the HOOKED directory in relation to the Docker host. (Note: Required for Docker jobs!)
  TZ                     The timezone to use for Cron triggers. e.g. 'Australia/Sydney'

Provided Environment Variables:
  HOOKED_FILE            The root hooked.yaml file that was run.
  HOOKED_DIR             The parent directory of the HOOKED_FILE.
  HOOKED_ROOT            <true|false> True if the current script is the root file.
    `)
    .usage('[options]')
    .action(async (scriptPath: string[], options: ProgramOptions) => {
      logger.setLogLevel(options.logLevel)

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
        defaults.setDefaultConfigurationFilepath('hooked.yaml')
        await init(options)
      }

      const defaultInstance = defaults.getDefaults()
      // no config? initialise a new project...
      if (!fs.existsSync(defaultInstance.HOOKED_FILE)) {
        if (isServerMode) {
          await writeBlankConfig()
        } else if (options.batch === true) {
          throw new Error(`Interactive prompts not supported in batch mode. [1] No config file found - "${defaultInstance.HOOKED_FILE}".`)
        } else {
          logger.error(`No config file found at '${defaultInstance.HOOKED_FILE}'. Launching setup...`)
          await init(options)
          return
        }
      } else {
        logger.debug(`Using config file: ${defaultInstance.HOOKED_FILE}`)
      }

      // show logs
      // if (options.log === true) {
      //   printHistory()
      //   return
      // }

      // check for newer versions
      if (options.batch !== true && isString(process.env.SKIP_VERSION_CHECK)) {
        await verifyLocalRequiredTools.verifyLatestVersion()
      } else {
        logger.debug('Skipping version check...')
      }

      // load configuration (after init, in case the config file was just created!)
      const config = await loaders.loadConfiguration(systemProcessEnvs, options)

      // show environment names...
      if (options.listenvs === true) {
        logger.info(`Available environments: ${yellow(Object.keys(config.env).join(', '))}`)
        return
      }

      // otherwise execute the script...
      if (isString(options.scriptPath) && options.scriptPath.trim().length > 0) {
        scriptPath = options.scriptPath.trim().split(' ')
      } else if (isString(scriptPath) && scriptPath.trim().length > 0) {
        if (scriptPath.trim().length > 0) {
          scriptPath = scriptPath.split(' ')
        } else {
          // blank string = don't run anything
          scriptPath = []
        }
      }

      // invoke script if provided
      if (Array.isArray(scriptPath) && scriptPath.length > 0) {
        const providedEnvNames = options.env.split(',')
        const stdin: RawEnvironment = HJSON.parse(options.stdin)
        await common.invoke(systemProcessEnvs, options, config, providedEnvNames, scriptPath, stdin, true, false)
      }

      // run the api server...
      if (isServerMode) {
        await server.startServer(port, systemProcessEnvs, options)
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

  exitHandler.onExit()

  return await program.parseAsync(argv)
}
