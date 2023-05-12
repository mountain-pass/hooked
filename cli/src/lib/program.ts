import { Command } from 'commander'
import fs from 'fs'
import { cyan, red } from './colour.js'
import {
  findScript,
  internalResolveEnv,
  loadConfig,
  resolveEnv,
  stripProcessEnvs
} from './config.js'
import { CONFIG_PATH, LOGS_MENU_OPTION } from './defaults.js'
import { addHistory, displaySuccessfulScript, printHistory } from './history.js'
import { init } from './init.js'
import { resolveCmdScript, resolveInternalScript } from './scriptExecutors/ScriptExector.js'
import { isCmdScript, isDefined, isInternalScript, type SuccessfulScript } from './types.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'
import { generateScripts } from './plugins/AbiPlugin.js'
import logger from './utils/logger.js'

const packageJson = loadRootPackageJsonSync()

export interface Options {
  env: string
  stdin: string
  printenv?: boolean
  init?: boolean
  log?: boolean
  batch?: boolean
  pull?: boolean
}

export default async (argv: string[] = process.argv): Promise<Command> => {
  const program = new Command()

  program
    .name('hooked')
    .description('CLI execute preconfigured scripts')
    .version(packageJson.version, '-v, --version')
    .option('--init', 'provides options for initialising a config file')
    .option('-e, --env <env>', 'specify environment', 'default')
    .option('-in, --stdin <json>', 'specify stdin responses', '{}')
    .option('--printenv', 'print the resolved environment')
    .option('-l, --log', 'print the log of previous scripts')
    .option('-p, --pull', 'force download all imports from remote to local cache')
    .option('-b, --batch', 'batch mode - errors if an interactive prompt is required')
    .argument('[scriptPath...]', 'the script path to run')
    .usage('[options]')
    .action(async (scriptPath: string[], options: Options) => {
      if (options.init === true) {
        await init(options)
        return
      }
      if (!fs.existsSync(CONFIG_PATH)) {
        logger.debug('No config file found. Launching setup...')
        await init(options)
        return
      }
      if (options.log === true) {
        printHistory()
        return
      }
      let successfulScript: SuccessfulScript | undefined
      try {
        const config = loadConfig(CONFIG_PATH)

        // setup defaults...
        config.plugins = { ...{ abi: false, icons: true }, ...(config.plugins ?? {}) }

        // check for plugins
        if (config.plugins.abi) {
          config.scripts = {
            ...(await generateScripts()),
            ...config.scripts
          }
        }

        const envNames = options.env.split(',')
        const stdin = JSON.parse(options.stdin)
        const globalEnv = { ...process.env as any }
        const [env, , resolvedEnvNames] = await resolveEnv(
          config,
          envNames,
          stdin,
          globalEnv,
          options
        )

        // find script...
        const [script, resolvedScriptPath] = await findScript(config, scriptPath, options)

        // check script is executable...
        if (!isCmdScript(script) && !isInternalScript(script)) {
          throw new Error(`Unknown script type #2: ${JSON.stringify(script)}`)
        }

        // resolve script env vars (if any)
        if (isCmdScript(script) && isDefined(script.$env)) {
          await internalResolveEnv(script.$env, stdin, env, options)
        }

        // generate rerun command
        successfulScript = {
          ts: Date.now(),
          scriptPath: resolvedScriptPath,
          envNames: resolvedEnvNames,
          stdin
        }
        logger.debug(`rerun: ${displaySuccessfulScript(successfulScript)}`)

        if (options.printenv === true) {
          // print environment variables
          const envString = JSON.stringify(stripProcessEnvs(env, process.env as any))
          logger.info(envString)
        } else {
          // execute script
          if (isCmdScript(script)) {
            await resolveCmdScript(undefined, script, stdin, env, options, false)
          } else if (isInternalScript(script)) {
            await resolveInternalScript('-', script, stdin, env, options)
          }

          // store in history (if successful and not the _logs_ option!)
          if (resolvedScriptPath[0] !== LOGS_MENU_OPTION) addHistory(successfulScript)
        }
      } catch (err: any) {
        logger.error(err)
        logger.error('Use "--debug" to see stack trace.')
        // print the rerun command for easy re-execution
        if (isDefined(successfulScript)) logger.debug(`rerun: ${displaySuccessfulScript(successfulScript)}`)
        process.exit(1)
      }
    })

  return await program.parseAsync(argv)
}
