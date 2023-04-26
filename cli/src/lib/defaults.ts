/* eslint-disable no-template-curly-in-string */
import path from 'path'
import { type TopLevelScripts, type Config } from './types.js'
import { type PackageJson } from './utils/packageJson.js'

export const HISTORY_PATH = path.resolve('.hooked_history.log')
export const CONFIG_PATH = path.resolve('hooked.yaml')

export const LOGS_MENU_OPTION = '_logs_'

export const CONFIG_BLANK = (): Config => {
  return {
    env: { default: { HELLO: 'Hola' } },
    scripts: {
      say: {
        $cmd: 'echo "${HELLO} world!"'
      }
    }
  }
}
export const CONFIG_NPM = (): Config => {
  return {
    env: { default: { PATH: { $cmd: 'echo ${PATH}:`pwd`/node_modules/.bin' } } },
    scripts: {
      install: { $cmd: 'npm install' }
    }
  }
}
export const CONFIG_NPM_EXIST = (packageJson: PackageJson): Config => {
  const scripts: TopLevelScripts = {}
  if (typeof packageJson.scripts !== 'undefined') {
    for (const [key, value] of Object.entries(packageJson.scripts)) {
      scripts[key] = { $cmd: value }
    }
  }
  const config: Config = {
    env: { default: { PATH: { $cmd: 'echo ${PATH}:`pwd`/node_modules/.bin' } } },
    scripts
  }
  return config
}

// env:
//   default:
//     PATH:
//       $cmd: echo ${PATH}:`pwd`/node_modules/.bin

export const DEFAULT_CONFIG_2: Config = {
  env: {
    default: {
      username: { $env: 'USER' },
      GIT_COMMIT: { $cmd: 'git rev-parse --short HEAD || echo "NOT_AVAILABLE"' }
    },
    english: {
      HELLO: { $cmd: 'printf "Hello"' },
      WORLD: 'world',
      FIRSTNAME: {
        $stdin: 'What is your name?',
        $default: 'Bob'
      },
      NAME: { $resolve: '${FIRSTNAME} (${username})' }
    },
    spanish: {
      HELLO: 'Hola',
      WORLD: 'Mundo',
      NAME: 'Amigo'
    }
  },
  scripts: {
    say: {
      hello: {
        // eslint-disable-next-line no-template-curly-in-string
        $cmd: 'echo "${HELLO} ${WORLD}, ${NAME}!"\necho "git commit is -> ($GIT_COMMIT)"\n'
      }
    }
  }
}
