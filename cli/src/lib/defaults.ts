/* eslint-disable no-template-curly-in-string */
import path from 'path'
import { type Config } from './types.js'

export const HISTORY_PATH = path.resolve('.hooked_history.log')
export const CONFIG_PATH = path.resolve('hooked.yaml')

export const DEFAULT_CONFIG: Config = {
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
