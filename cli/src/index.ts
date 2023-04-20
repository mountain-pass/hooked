#!/usr/bin/env node
import { program } from 'commander'
import {
  executeScript,
  findScript,
  loadConfig,
  parseConfig,
  resolveEnv
} from './lib/config.js'
import { cyan, red } from './lib/colour.js'
import { type SuccessfulScript, type ResolvedEnv } from './lib/types.js'
import fs from 'fs'
import path from 'path'
import { addHistory, displaySuccessfulScript, printHistory } from './lib/history.js'

// all this just to load a json file... sigh ESM
import { fileURLToPath } from 'url'
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
}

program
  .name('hooked')
  .description('CLI execute preconfigured scripts')
  .version(packageJson.version, '-v, --version')
  .option('-e, --env <env>', 'specify environment', 'default')
  .option('-in, --stdin <json>', 'specify stdin responses', '{}')
  .option('--printenv', 'print the resolved environment')
  .option('-l, --log', 'print the log of previous scripts')
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
      const globalEnv = process.env as unknown as ResolvedEnv
      const [env, stdinResponses, resolvedEnvNames] = await resolveEnv(
        config,
        envNames,
        stdin,
        globalEnv
      )
      if (options.printenv === true) {
        console.log(cyan(JSON.stringify(env, null, 2)))
      } else {
        // find script and execute
        const [script, resolvedScriptPath] = await findScript(config, scriptPath)

        // generate rerun command
        const successfulScript: SuccessfulScript = {
          ts: Date.now(),
          scriptPath: resolvedScriptPath,
          envNames: resolvedEnvNames,
          stdin: stdinResponses
        }
        console.log(cyan(`rerun: j ${displaySuccessfulScript(successfulScript)}`))

        // execute script
        await executeScript(script, { ...globalEnv, ...env })

        // store in history (if successful!)
        addHistory(successfulScript)
      }
    } catch (err: any) {
      console.error(red(err.message))
      process.exit(1)
    }
  })

program.parse(process.argv)
