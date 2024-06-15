/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import path from 'path'
import { resolveResolveScript } from '../scriptExecutors/ScriptExecutor.js'
import { isDefined } from '../types.js'
import { Environment } from '../utils/Environment.js'
import { loadPackageJsonSync } from '../utils/packageJson.js'
import defaults from '../defaults.js'

export const generateNpmScripts = (env: Environment): any => {
  // environment variables, that can be overridden by the user
  const {
    NPM_FILE: packageJsonFile = 'package.json',
    NPM_SCRIPT: npmScript = 'npm run ${NPM_COMMAND}'
  } = env.global

  if (fs.existsSync(path.resolve(defaults.getDefaults().HOOKED_DIR, packageJsonFile))) {
    const packageJson = loadPackageJsonSync(packageJsonFile)
    if (isDefined(packageJson.scripts) && Object.keys(packageJson.scripts).length > 0) {
      const npmScripts = {
        install: { $cmd: 'npm install' },
        'clean install production': { $cmd: 'npm ci --production' }
      }
      const npm = Object.keys(packageJson.scripts).reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: npmScript }, new Environment().putAllGlobal({ NPM_COMMAND: curr }), false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, npmScripts)
      return { '🪚  npm': npm }
    }
  }
  return {}
}
