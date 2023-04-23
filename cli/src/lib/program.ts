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
import { CONFIG_PATH } from './defaults.js'
import { addHistory, displaySuccessfulScript, printHistory } from './history.js'
import { init } from './init.js'
import { isDefined, resolveCmdScript } from './scriptExecutors/ScriptExector.js'
import { isCmdScript, type SuccessfulScript } from './types.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'

const packageJson = loadRootPackageJsonSync()

export interface Options {
  env: string
  stdin: string
  printenv?: boolean
  init?: boolean
  log?: boolean
  debug?: boolean
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
    .option('-d, --debug', 'show error stacks, show debug logs')
    .argument('[scriptPath...]', 'the script path to run')
    .usage('[options]')
    .action(async (scriptPath: string[], options: Options) => {
      if (options.init === true) {
        await init()
        return
      }
      if (!fs.existsSync(CONFIG_PATH)) {
        console.log(cyan('No config file found. Launching setup...'))
        await init()
        return
      }
      if (options.log === true) {
        printHistory()
        return
      }
      try {
        const config = loadConfig(CONFIG_PATH)

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
        if (!isCmdScript(script)) {
          throw new Error(`Unknown script type: ${JSON.stringify(script)}`)
        }

        // resolve script env vars (if any)
        if (isDefined(script.$env)) {
          await internalResolveEnv(script.$env, stdin, env)
        }

        // generate rerun command
        const successfulScript: SuccessfulScript = {
          ts: Date.now(),
          scriptPath: resolvedScriptPath,
          envNames: resolvedEnvNames,
          stdin
        }
        if (options.debug === true) console.log(cyan(`rerun: ${displaySuccessfulScript(successfulScript)}`))

        if (options.printenv === true) {
          // print environment variables
          const envString = JSON.stringify(stripProcessEnvs(env, process.env as any))
          console.log(envString)
        } else {
          // execute script
          await resolveCmdScript(undefined, script, stdin, env, false)

          // store in history (if successful!)
          addHistory(successfulScript)
        }
      } catch (err: any) {
        const message: string = err.message
        if (typeof message === 'string' && message.startsWith('Command failed:')) {
          console.error(red(JSON.stringify(err)))
          console.error(red(err.message.split('\n')[0]))
          console.error(red('Use "--debug" to see stack trace.'))
          return
        }
        if (options.debug === true) {
          console.error(err)
        } else {
          console.error(red(err.message))
          console.error(red('Use "--debug" to see stack trace.'))
        }
        process.exit(1)
      }
    })

  return await program.parseAsync(argv)
}
