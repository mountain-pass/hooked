import { Command } from 'commander'
import fs from 'fs'
import { cyan, red, yellow } from './colour.js'
import nodeCleanup from 'node-cleanup'
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
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import { isCmdScript, isDefined, isInternalScript, type SuccessfulScript } from './types.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'
import { generateAbiScripts } from './plugins/AbiPlugin.js'
import { generateNpmScripts } from './plugins/NpmPlugin.js'
import logger from './utils/logger.js'
import HJSON from 'hjson'
import { generateMakefileScripts } from './plugins/MakefilePlugin.js'
import { cleanUpOldScripts } from './utils/fileUtils.js'
import { childProcesses, dockerNames, executeCmd } from './scriptExecutors/$cmd.js'

const packageJson = loadRootPackageJsonSync()

export interface Options {
  env: string
  stdin: string
  printenv?: boolean
  listenvs?: boolean
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
    .option('--init', 'runs the initialisation wizard')
    .option('-e, --env <env>', 'accepts a comma separated list of environment names', 'default')
    .option('-in, --stdin <json>', 'allows predefining stdin responses', '{}')
    .option('--printenv', 'print the resolved environment, and exits')
    .option('--listenvs', 'lists the available environments, and exits')
    .option('-l, --log', 'print the log of previous scripts')
    .option('-p, --pull', 'force download all imports from remote to local cache')
    .option('-b, --batch', 'batch mode - errors if an interactive prompt is required')
    .argument('[scriptPath...]', 'the script path to run')
    .usage('[options]')
    .action(async (scriptPath: string[], options: Options) => {
      // cleanup previous files
      cleanUpOldScripts()

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
        config.plugins = { ...{ abi: false, icons: true, npm: true, make: true }, ...(config.plugins ?? {}) }

        const envNames = options.env.split(',')
        // use relaxed json to parse the stdin
        const stdin = HJSON.parse(options.stdin)
        // resolve environment variables...
        const globalEnv = { ...process.env as any }
        const [env, , resolvedEnvNames] = await resolveEnv(
          config,
          envNames,
          stdin,
          globalEnv,
          options
        )

        // check for newer versions
        await verifyLocalRequiredTools.verifyLatestVersion(globalEnv, globalEnv)

        // check for abi files?
        if (config.plugins?.abi) {
          config.scripts = {
            ...(await generateAbiScripts()),
            ...config.scripts
          }
        }

        // check for npm package.json?
        if (config.plugins?.npm) {
          config.scripts = {
            ...generateNpmScripts(env),
            ...config.scripts
          }
        }

        // check for Makefile?
        if (config.plugins?.make) {
          config.scripts = {
            ...generateMakefileScripts(env),
            ...config.scripts
          }
        }

        if (options.listenvs === true) {
          logger.info(`Available environments: ${yellow(Object.keys(config.env).join(', '))}`)
          return
        }

        // find script...
        const [script, resolvedScriptPath] = await findScript(config, scriptPath, options)

        // check script is executable...
        if (!isCmdScript(script) && !isInternalScript(script)) {
          throw new Error(`Unknown script type : ${JSON.stringify(script)}`)
        }

        // resolve script env vars (if any)
        if (isCmdScript(script) && isDefined(script.$env)) {
          await internalResolveEnv(script.$env, stdin, env, config, options)
        }

        // generate rerun command
        successfulScript = {
          ts: Date.now(),
          scriptPath: resolvedScriptPath,
          envNames: resolvedEnvNames,
          stdin
        }
        logger.debug(`Rerun: ${displaySuccessfulScript(successfulScript)}`)

        if (options.printenv === true) {
          // print environment variables
          const envString = JSON.stringify(stripProcessEnvs(env, process.env as any))
          logger.info(envString)
        } else {
          // execute script
          if (isCmdScript(script)) {
            await resolveCmdScript(undefined, script, stdin, env, config, options, false)
          } else if (isInternalScript(script)) {
            await resolveInternalScript('-', script, stdin, env, config, options)
          }

          // store in history (if successful and not the _logs_ option!)
          if (resolvedScriptPath[0] !== LOGS_MENU_OPTION) addHistory(successfulScript)
        }
      } catch (err: any) {
        logger.error(err)
        // print the rerun command for easy re-execution
        if (isDefined(successfulScript)) logger.debug(`rerun: ${displaySuccessfulScript(successfulScript)}`)
        process.exit(1)
      }
    })

  nodeCleanup((exitCode, signal) => {
    logger.debug(`Shutting down... ${JSON.stringify({ exitCode, signal })}`)
    const newExitCode = exitCode !== null ? exitCode : typeof signal === 'string' ? 99 : 0
    // kill child processes
    logger.debug('Cleaning up child processes...')
    for (const child of childProcesses) {
      child.kill('SIGKILL') // SIGKILL 9 / SIGTERM 15
    }
    // kill docker containers
    logger.debug('Cleaning up docker containers...')
    Promise.all(dockerNames.map(async (dockerName) => {
      return await executeCmd({ $cmd: `docker kill ${dockerName} || true` }, {}, {})
    }))
      .then(() => {
        process.exit(newExitCode)
        // process.kill(process.pid, 'SIGINT')
      })
      .catch((err) => {
        logger.error(err)
        process.exit(newExitCode)
        // process.kill(process.pid, 'SIGINT')
      })
    nodeCleanup.uninstall() // don't call cleanup handler again, allow promises to cleanup!
    return false
  })

  return await program.parseAsync(argv)
}
