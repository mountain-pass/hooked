/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import { resolveResolveScript } from '../scriptExecutors/ScriptExecutor.js'
import { Environment } from '../utils/Environment.js'

export const generateMakefileScripts = (env: Environment): any => {
  // environment variables, that can be overridden by the user
  const {
    MAKE_FILE: makefile = 'Makefile',
    MAKE_SCRIPT: makeScript = 'make -s -f ${MAKE_FILE} ${MAKE_COMMAND}'
  } = env.global

  if (fs.existsSync(makefile)) {
    const scriptNames = fs.readFileSync(makefile, 'utf8').match(/^\w[^:]+/gm)
    if (scriptNames !== null && Array.isArray(scriptNames) && scriptNames.length > 0) {
      const makefileScripts = scriptNames.reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: makeScript }, new Environment({ MAKE_FILE: makefile, MAKE_COMMAND: curr }), false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, {})
      return { '🔧 makefile': makefileScripts }
    }
  }
  return {}
}
