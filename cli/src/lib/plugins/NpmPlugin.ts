/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import { type ResolvedEnv, isDefined } from '../types.js'
import { resolveResolveScript } from '../scriptExecutors/ScriptExector.js'

export const generateNpmScripts = (env: ResolvedEnv): any => {
  // environment variables, that can be overridden by the user
  const {
    NPM_FILE: packageJsonFile = 'package.json',
    NPM_SCRIPT: npmScript = 'npm run ${NPM_COMMAND}'
  } = env

  if (fs.existsSync(packageJsonFile)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'))
    if (isDefined(packageJson.scripts) && Object.keys(packageJson.scripts).length > 0) {
      const npm = Object.keys(packageJson.scripts).reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: npmScript }, { NPM_COMMAND: curr }, false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, {})
      return { npm }
    }
  }
  return {}
}
