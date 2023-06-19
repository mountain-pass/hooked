/* eslint-disable no-template-curly-in-string */
import os from 'os'
import path from 'path'
import { type YamlConfig } from './types.js'

export const HISTORY_PATH = path.resolve('.hooked_history.log')
export const CONFIG_PATH = path.resolve('hooked.yaml')

export const PAGE_SIZE = 10

export const LOGS_MENU_OPTION = '🪵  _logs_'
export const LOCAL_CACHE_PATH = path.join(os.homedir(), '.hooked', 'imports')

export const getLocalImportsCachePath = (filename: string): string => path.join(LOCAL_CACHE_PATH, filename)

export const CONFIG_BLANK = (): YamlConfig => {
  return {
    env: { default: { HELLO: 'Hola' } },
    scripts: {
      say: {
        $cmd: 'echo "${HELLO} world!"'
      }
    }
  }
}

export const DEFAULT_CONFIG_2: YamlConfig = {
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
