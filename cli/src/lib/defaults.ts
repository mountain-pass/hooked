/* eslint-disable no-template-curly-in-string */
import path from 'path'

export const CONFIG_PATH = path.resolve('hooked.yaml')

export const DEFAULT_CONFIG = {
  env: {
    default: {
      username: { $env: 'USER' },
      GIT_COMMIT: { $cmd: 'git rev-parse --short HEAD || echo "NOT_AVAILABLE"' },
      HELLO: { $cmd: 'printf "Hello"' },
      WORLD: 'world',
      FIRSTNAME: {
        $stdin: 'What is your name?',
        $default: 'Bob'
      },
      NAME: { $resolve: '${FIRSTNAME} (${username})' }
    },
    spanish: {
      GIT_COMMIT: { $cmd: 'git rev-parse --short HEAD || echo "NOT_AVAILABLE"' },
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
