/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import { type ResolvedEnv } from '../types.js'
import { resolveResolveScript } from '../scriptExecutors/ScriptExector.js'

export const generateMakefileScripts = (env: ResolvedEnv): any => {
  // environment variables, that can be overridden by the user
  const {
    MAKE_FILE: makefile = 'Makefile',
    MAKE_SCRIPT: makeScript = 'make -s -f ${MAKE_FILE} ${MAKE_COMMAND}'
  } = env

  if (fs.existsSync(makefile)) {
    const scriptNames = fs.readFileSync(makefile, 'utf8').match(/^\w[^:]+/gm)
    if (scriptNames !== null && Array.isArray(scriptNames) && scriptNames.length > 0) {
      const makefileScripts = scriptNames.reduce((prev: any, curr: string) => {
        const cmd = resolveResolveScript('-', { $resolve: makeScript }, { MAKE_FILE: makefile, MAKE_COMMAND: curr }, false)
        prev[curr] = { $cmd: cmd }
        return prev
      }, {})
      return { '🔧 makefile': makefileScripts }
    }
  }
  return {}
}
