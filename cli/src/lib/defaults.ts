/* eslint-disable no-template-curly-in-string */
import os from 'os'
import fs from 'fs'
import path from 'path'
import { isString, type YamlConfig } from './types.js'
import fileUtils from './utils/fileUtils.js'
import logger from './utils/logger.js'
import { randomString } from './scriptExecutors/$cmd.js'
import bcrypt from './server/bcrypt.js'

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
  DOCKER_COMPOSE_FILE: string
  HISTORY_PATH: string
  PAGE_SIZE: number
  LOGS_MENU_OPTION: string
  LOCAL_CACHE_PATH: string
}

const defaults: Defaults = {
  HOOKED_FILE: '',
  HOOKED_DIR: '',
  DOCKER_COMPOSE_FILE: '',
  HISTORY_PATH: '',
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
  defaults.DOCKER_COMPOSE_FILE = path.resolve(defaults.HOOKED_DIR, 'docker-compose.yml')
  defaults.HISTORY_PATH = path.resolve(defaults.HOOKED_DIR, '.hooked_history.log')
}

const getDefaults = (): Defaults => {
  return defaults
}

const getLocalImportsCachePath = (filename: string): string => path.join(getDefaults().LOCAL_CACHE_PATH, filename)

const CONFIG_BLANK = (saltOverride?: string): YamlConfig => {
  return {
    imports: [
      './imports/*.{yaml,yml}?'
    ],
    env: {
      default: {
        GREETING: 'Hello'
      }
    },
    scripts: {
      say_hello: {
        $cmd: 'echo "${GREETING}!"'
      },
      docker_test: {
        $image: 'alpine',
        $cmd: 'echo "Docker worked - Alpine $(cat /etc/alpine-release)!"'
      }
    },
    server: {
      auth: {
        type: 'bcrypt',
        salt: saltOverride ?? bcrypt.generateSalt()
      },
      users: [
        {
          username: 'admin',
          password: '<HASH_YOUR_PASSWORD>',
          accessRoles: ['admin']
        }
      ],
      dashboards: [
        {
          title: 'My Dashboard',
          accessRoles: ['admin'],
          sections: [
            {
              title: 'My Section',
              fields: [
                {
                  label: 'Say Hello',
                  type: 'button',
                  $script: 'say_hello'
                },
                {
                  label: 'Show Docker Output',
                  type: 'display',
                  $script: 'docker_test'
                }
              ]
            }
          ]
        }
      ]
    }
  }
}

export default {
  getDefaults,
  setDefaultConfigurationFilepath,
  getLocalImportsCachePath,
  CONFIG_BLANK
}
