/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import path from 'path'
import { resolveResolveScript } from '../scriptExecutors/ScriptExecutor.js'
import { isDefined } from '../types.js'
import { Environment, type RawEnvironment } from '../utils/Environment.js'
import { loadPackageJsonSync } from '../utils/packageJson.js'
import defaults from '../defaults.js'
import logger from '../utils/logger.js'

export const generateNpmScripts = (systemProcessEnvs: RawEnvironment): any => {
  // environment variables, that can be overridden by the user
  const {
    NPM_FILE: packageJsonFile = 'package.json',
    NPM_SCRIPT: npmScript = 'npm run ${NPM_COMMAND}'
  } = systemProcessEnvs

  if (fs.existsSync(path.resolve(defaults.getDefaults().HOOKED_DIR, packageJsonFile))) {
    logger.debug('plugin: Loading NPM package.json...')
    const packageJson = loadPackageJsonSync(packageJsonFile)
    if (isDefined(packageJson.scripts) && Object.keys(packageJson.scripts).length > 0) {
      const npmScripts = {
        install: { _scriptPath: 'npm install', $cmd: 'npm install' },
        ci_production: { _scriptPath: 'npm ci_production', $cmd: 'npm ci --production' }
      }
      const npm = Object.keys(packageJson.scripts).reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: npmScript }, new Environment().putAllGlobal({ NPM_COMMAND: curr }), false)
        prev[curr] = { _scriptPath: `npm ${curr}`, $cmd: cmd }
        return prev
      }, npmScripts)
      return { npm }
    }
  }
  return {}
}
