/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import path from 'path'
import { resolveResolveScript } from '../scriptExecutors/ScriptExecutor.js'
import { Environment } from '../utils/Environment.js'
import defaults from '../defaults.js'
import logger from '../utils/logger.js'

export const generateMakefileScripts = (env: Environment): any => {
  // environment variables, that can be overridden by the user
  const {
    MAKE_FILE: makefile = 'Makefile',
    MAKE_SCRIPT: makeScript = 'make -s -f ${MAKE_FILE} ${MAKE_COMMAND}'
  } = env.global

  if (fs.existsSync(makefile)) {
    logger.debug('plugin: Loading Makefile...')
    const scriptNames = fs.readFileSync(path.join(defaults.getDefaults().HOOKED_DIR, makefile), 'utf8').match(/^\w[^:]+/gm)
    if (scriptNames !== null && Array.isArray(scriptNames) && scriptNames.length > 0) {
      const makefileScripts = scriptNames.reduce((prev: any, curr: string) => {
        const env = new Environment().putAllGlobal({ MAKE_FILE: makefile, MAKE_COMMAND: curr })
        const cmd = resolveResolveScript('-', { $resolve: makeScript }, env, false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, {})
      return { '🔧 makefile': makefileScripts }
    }
  }
  return {}
}
