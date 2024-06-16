/* eslint-disable no-template-curly-in-string */
import os from 'os'
import fs from 'fs'
import path from 'path'
import { isString, type YamlConfig } from './types.js'
import fileUtils from './utils/fileUtils.js'
import logger from './utils/logger.js'

/**
 * Look for hooked.yaml in local dir and home.
 * @returns
 */
const findHookedYaml = (): string => {
  // local first (NOTE - do NOT use HOOKED_DIR or fileUtils.resolvePath here!)
  let tmp = path.resolve('hooked.yaml')
  if (fs.existsSync(tmp)) {
  // resolve real path - might be a symbolic link!
    tmp = fs.realpathSync(tmp)
  } else {
  // allow a global hooked.yaml
    const global = fileUtils.resolvePath('~/hooked.yaml')
    if (fs.existsSync(global)) {
    // resolve real path - might be a symbolic link!
      tmp = fs.realpathSync(global)
    }
  }
  return tmp
}

interface Defaults {
  HOOKED_FILE: string
  HOOKED_DIR: string
  HISTORY_PATH: string
  PAGE_SIZE: number
  LOGS_MENU_OPTION: string
  LOCAL_CACHE_PATH: string
}

const defaults: Defaults = {
  HOOKED_FILE: '/tmp/hooked.yaml',
  HOOKED_DIR: '/tmp',
  HISTORY_PATH: '/tmp/.hooked_history.log',
  PAGE_SIZE: 10,
  LOGS_MENU_OPTION: '🪵  _logs_',
  LOCAL_CACHE_PATH: path.join(os.homedir(), '.hooked', 'imports')
}

/**
 * Ability to set the hooked file path defaults.
 * @param hookedFilepath
 */
const setDefaultConfigurationFilepath = (hookedFilepath: string | undefined): void => {
  const filepath = isString(hookedFilepath) ? fileUtils.resolvePath(hookedFilepath) : findHookedYaml()
  logger.debug(`Setting config file: ${filepath}`)
  defaults.HOOKED_FILE = filepath
  defaults.HOOKED_DIR = path.dirname(defaults.HOOKED_FILE)
  defaults.HISTORY_PATH = path.resolve(defaults.HOOKED_DIR, '.hooked_history.log')
}

const getDefaults = (): Defaults => defaults

const getLocalImportsCachePath = (filename: string): string => path.join(getDefaults().LOCAL_CACHE_PATH, filename)

const CONFIG_BLANK = (): YamlConfig => {
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

const CONFIG_ADVANCED_GREETING = (): YamlConfig => {
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

const CONFIG_ENVIRONMENTS_EXAMPLE: YamlConfig = {
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

export default {
  getDefaults,
  setDefaultConfigurationFilepath,
  getLocalImportsCachePath,
  CONFIG_BLANK,
  CONFIG_ENVIRONMENTS_EXAMPLE,
  CONFIG_ADVANCED_GREETING
}
