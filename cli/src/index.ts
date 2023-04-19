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
import { type ResolvedEnv } from './lib/types.js'
import fs from 'fs'
import path from 'path'

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
}

program
  .name('hooked')
  .description('CLI execute preconfigured scripts')
  .version(packageJson.version, '-v, --version')
  .option('-e, --env <env>', 'specify environment', 'default')
  .option('-in, --stdin <json>', 'specify stdin responses', '{}')
  .option('--printenv', 'print the resolved environment')
  .argument('[scriptPath...]', 'the script path to run')
  .usage('[options]')
  .action(async (scriptPath: string[], options: Options) => {
    try {
      const stdin = JSON.parse(options.stdin)
      const globalEnv = process.env as unknown as ResolvedEnv
      const [env, stdinResponses, resolvedEnvName] = await resolveEnv(
        config,
        options.env,
        stdin,
        globalEnv
      )
      if (options.printenv === true) {
        console.log(cyan(JSON.stringify(env, null, 2)))
      } else {
        // find script and execute
        const [script, resolvedScriptPath] = await findScript(config, scriptPath)
        console.log(cyan(`rerun: j ${resolvedScriptPath.join(' ')} -e ${resolvedEnvName} -in '${JSON.stringify(stdinResponses)}'`))
        await executeScript(script, { ...globalEnv, ...env })
      }
    } catch (err: any) {
      console.error(red(err.message))
      process.exit(1)
    }
  })

program.parse(process.argv)
