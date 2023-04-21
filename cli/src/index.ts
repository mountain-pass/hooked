#!/usr/bin/env node
import { program } from 'commander'
import fs from 'fs'
import path from 'path'
import { cyan, red } from './lib/colour.js'
import {
  findScript,
  internalResolveEnv,
  loadConfig,
  parseConfig,
  resolveEnv,
  stripProcessEnvs
} from './lib/config.js'
import { addHistory, displaySuccessfulScript, printHistory } from './lib/history.js'
import { isCmdScript, type SuccessfulScript } from './lib/types.js'

// all this just to load a json file... sigh ESM
import { fileURLToPath } from 'url'
import { isDefined, resolveCmdScript } from './lib/scriptExecutors/ScriptExector.js'
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const packageJson = JSON.parse(fs.readFileSync(path.resolve(dirname, '../package.json'), 'utf-8'))

const configStr = loadConfig()
const config = parseConfig(configStr)

export interface Options {
  env: string
  stdin: string
  printenv?: boolean
  log?: boolean
  debug?: boolean
}

program
  .name('hooked')
  .description('CLI execute preconfigured scripts')
  .version(packageJson.version, '-v, --version')
  .option('-e, --env <env>', 'specify environment', 'default')
  .option('-in, --stdin <json>', 'specify stdin responses', '{}')
  .option('--printenv', 'print the resolved environment')
  .option('-l, --log', 'print the log of previous scripts')
  .option('-d, --debug', 'show error stacks, show debug logs')
  .argument('[scriptPath...]', 'the script path to run')
  .usage('[options]')
  .action(async (scriptPath: string[], options: Options) => {
    if (options.log === true) {
      printHistory()
      return
    }
    try {
      const envNames = options.env.split(',')
      const stdin = JSON.parse(options.stdin)
      const globalEnv = process.env as any
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
        console.log(JSON.stringify(stripProcessEnvs(env, process.env as any), null, 2))
      } else {
        // execute script
        await resolveCmdScript(undefined, script, stdin, env, false)

        // store in history (if successful!)
        addHistory(successfulScript)
      }
    } catch (err: any) {
      if (options.debug === true) {
        console.error(err)
      } else {
        console.error(red(err.message))
      }
      process.exit(1)
    }
  })

program.parse(process.argv)
