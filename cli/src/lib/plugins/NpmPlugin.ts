/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import { type ResolvedEnv, isDefined } from '../types.js'
import { resolveResolveScript } from '../scriptExecutors/ScriptExector.js'
import { loadPackageJsonSync } from '../utils/packageJson.js'

export const generateNpmScripts = (env: ResolvedEnv): any => {
  // environment variables, that can be overridden by the user
  const {
    NPM_FILE: packageJsonFile = 'package.json',
    NPM_SCRIPT: npmScript = 'npm run ${NPM_COMMAND}'
  } = env

  if (fs.existsSync(packageJsonFile)) {
    const packageJson = loadPackageJsonSync(packageJsonFile)
    if (isDefined(packageJson.scripts) && Object.keys(packageJson.scripts).length > 0) {
      const npmScripts = {
        install: { $cmd: 'npm install' },
        'clean install production': { $cmd: 'npm ci --production' }
      }
      const npm = Object.keys(packageJson.scripts).reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: npmScript }, { NPM_COMMAND: curr }, false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, npmScripts)
      return { '🪚  npm': npm }
    }
  }
  return {}
}
