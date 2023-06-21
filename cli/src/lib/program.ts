import { Command } from 'commander'
import fs from 'fs'
import HJSON from 'hjson'
import { yellow } from './colour.js'
import {
  fetchGlobalEnvVars,
  findScript,
  loadConfig,
  resolveEnvironmentVariables
} from './config.js'
import { CONFIG_PATH, LOGS_MENU_OPTION } from './defaults.js'
import exitHandler from './exitHandler.js'
import { addHistory, displaySuccessfulScript, printHistory } from './history.js'
import { init } from './init.js'
import { generateAbiScripts } from './plugins/AbiPlugin.js'
import { generateMakefileScripts } from './plugins/MakefilePlugin.js'
import { generateNpmScripts } from './plugins/NpmPlugin.js'
import { resolveCmdScript, resolveInternalScript } from './scriptExecutors/ScriptExector.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import {
  isCmdScript,
  isDefined,
  isInternalScript,
  type EnvironmentVariables,
  type SuccessfulScript,
  type SystemEnvironmentVariables
} from './types.js'
import { Environment } from './utils/Environment.js'
import { mergeEnvVars } from './utils/envVarUtils.js'
import { cleanUpOldScripts } from './utils/fileUtils.js'
import logger from './utils/logger.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'

const packageJson = loadRootPackageJsonSync()

export interface ProgramOptions {
  env: string
  stdin: string
  printenv?: boolean
  listenvs?: boolean
  init?: boolean
  log?: boolean
  batch?: boolean
  pull?: boolean
}

export const newProgram = (systemProcessEnvs: SystemEnvironmentVariables, exitOnError = true): Command => {
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
    .option('-b, --batch', 'non-interactive "batch" mode - errors if an interactive prompt is required')
    .argument('[scriptPath...]', 'the script path to run')
    .usage('[options]')
    .action(async (scriptPath: string[], options: ProgramOptions) => {
      // cleanup previous files
      cleanUpOldScripts()
      const env = new Environment()
      env.doNotResolveList = ['DOCKER_SCRIPT', 'NPM_SCRIPT', 'MAKE_SCRIPT']
      env.putAllGlobal(systemProcessEnvs)

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
        // load imports and consolidate configuration...
        const config = await loadConfig(CONFIG_PATH, options.pull)

        // setup default plugins...
        config.plugins = { ...{ abi: false, icons: true, npm: true, make: true }, ...(config.plugins ?? {}) }

        // check for newer versions
        await verifyLocalRequiredTools.verifyLatestVersion(env)

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

        // use relaxed json to parse the stdin
        const stdin = HJSON.parse(options.stdin)

        const envVars: EnvironmentVariables = {}

        // fetch the environment variables...
        const [, resolvedEnvNames] = await fetchGlobalEnvVars(
          config,
          options.env.split(','),
          options,
          envVars
        )

        // TODONICK accumulate envVars

        // resolve script env vars (if any)
        if (isCmdScript(script) && isDefined(script.$env)) {
          // execute script...
          mergeEnvVars(envVars, script.$env)
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
          // actually resolve the environment variables...
          await resolveEnvironmentVariables(config, envVars, stdin, env, options)
          // print environment variables
          logger.info(JSON.stringify(env.resolved))
        } else {
          // execute script
          if (isCmdScript(script)) {
            await resolveCmdScript(undefined, script, stdin, env, config, options, false, envVars)
          } else if (isInternalScript(script)) {
            // TODONICK does this need to resolve environment variables? probably
            await resolveInternalScript('-', script, stdin, env, config, options, envVars)
          }

          // store in history (if successful and not the _logs_ option!)
          if (resolvedScriptPath[0] !== LOGS_MENU_OPTION) addHistory(successfulScript)
        }
      } catch (err: any) {
        // try {
        // logger.error(err)
        // print the rerun command (even on error) for easy re-execution
        if (isDefined(successfulScript)) logger.debug(`rerun: ${displaySuccessfulScript(successfulScript)}`)
        throw err
        // } catch (error) {
        //   console.error(err)
        // } finally {
        //   // only bypassed for testing...
        //   process.exit(1)
        // }
      }
    })

  return program
}

export default async (argv: string[] = process.argv): Promise<Command> => {
  const program = newProgram(process.env as SystemEnvironmentVariables)

  exitHandler.onExit()

  return await program.parseAsync(argv)
}
