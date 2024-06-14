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
    env: {
      default: {
        SKIP_VERSION_CHECK: 'true',
        GREETING: 'Hello'
      }
    },
    scripts: {
      say: {
        $cmd: 'echo "${GREETING}!"'
      }
    }
  }
}

export const CONFIG_ADVANCED_GREETING = (): YamlConfig => {
  return {
    env: {
      default: {
        GREETING: {
          $stdin: 'What country do you prefer?',
          $choices: {
            germany: 'Guten tag',
            france: 'Bonjour',
            spain: 'Hola',
            england: 'Good day'
          },
          $sort: 'alpha'
        },
        YOURNAME: {
          $stdin: 'What is your name? (Hint: set YOURNAME to avoid prompt):',
          $default: 'Bob'
        },
        HOMEPATH: {
          $cmd: 'set -u && echo $HOME'
        }
      }
    },
    scripts: {
      say: {
        $cmd: 'echo "${GREETING} ${YOURNAME}! There is no place like ${HOMEPATH}."'
      }
    }
  }
}

export const CONFIG_ENVIRONMENTS_EXAMPLE: YamlConfig = {
  env: {
    default: {
      username: { $env: 'USER' }
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
        $cmd: 'echo "${HELLO} ${WORLD}, ${NAME}!"'
      }
    }
  }
}
