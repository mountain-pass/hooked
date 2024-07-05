import fs from 'fs'
import inquirer from 'inquirer'
import YAML from 'yaml'
import defaults from './defaults.js'
import { type ProgramOptions } from './program.js'
import { executeCmd } from './scriptExecutors/$cmd.js'
import logger from './utils/logger.js'
import { Environment } from './utils/Environment.js'
import { loadRootPackageJsonSync } from './utils/packageJson.js'

const packageJson = loadRootPackageJsonSync()

const HEADER = `#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

`

/**
 * Generates a blank hooked.yaml file contents.
 */
export const generateBlankTemplateFileContents = (): string => {
  return `${HEADER}${YAML.stringify(defaults.CONFIG_BLANK(), { blockQuote: 'literal' })}`
}

/** Creates a blank hooked.yaml file. */
export const initialiseConfig = async (options: ProgramOptions): Promise<void> => {
  await writeFile(defaults.getDefaults().HOOKED_FILE, generateBlankTemplateFileContents(), options.force, false)
}

/** Runs openssl to generate the SSL certificates. */
export const initialiseSsl = async (options: ProgramOptions): Promise<void> => {
  logger.info('Generating SSL certificates...')
  await executeCmd('initialiseDocker', {
    $image: 'mountainpass/hooked',
    $cmd: `#!/bin/sh -ve
openssl req -x509 -newkey rsa:2048 -nodes -keyout hooked-key.pem -new -out hooked-cert.pem -subj /CN=localhost -days 3650
`
  }, options, {}, new Environment(), { printStdio: true, captureStdout: false }, 60000)
}

/** Writes a docker file, and "up's" the docker service. */
export const initialiseDocker = async (options: ProgramOptions): Promise<void> => {
  if (!fs.existsSync('/var/run/docker.sock')) {
    logger.warn('Docker socket file "/var/run/docker.sock" not found. Please update docker-compose.yml.')
  }
  // write docker compose
  const DOCKER_COMPOSE_CONTENTS = `
services:
  hooked:
    image: mountainpass/hooked:${packageJson.version}
    container_name: hooked_${options.server ?? '4000'}
    environment:
      - TZ=${options.timezone ?? 'UTC'}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${defaults.getDefaults().HOOKED_DIR}:${defaults.getDefaults().HOOKED_DIR}
    working_dir: ${defaults.getDefaults().HOOKED_DIR}
    command:
      - --initConfig
      - --initSsl
      - --config
      - ${defaults.getDefaults().HOOKED_FILE}
      - --server
      - --ssl
      - --api-key=${options.apiKey ?? 'abc'}
    ports:
      - ${options.server ?? '4000'}:4000
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-file: 5
        max-size: 10m`
  logger.info(`Writing docker compose file - ${defaults.getDefaults().DOCKER_COMPOSE_FILE}...`)
  await writeFile(defaults.getDefaults().DOCKER_COMPOSE_FILE, DOCKER_COMPOSE_CONTENTS, options.force, false)

  // run docker service
  logger.info('Running docker service...')
  await executeCmd('initialiseDocker', {
    $cmd: `#!/bin/sh -ve
docker stop hooked || true
docker rm hooked || true
docker compose -f "${defaults.getDefaults().DOCKER_COMPOSE_FILE}" up -d
`
  }, options, {}, new Environment(), { printStdio: true, captureStdout: false }, 60000)
}

/**
 * Writes a UTF-8 file.
 * @param filepath path to write to.
 * @param contents the contents of the file.
 * @param overwrite if true, overwrites the file if it exists.
 * @param errorIfExists if true, throws an error if the file exists.
 */
const writeFile = async (filepath: string, contents: string, overwrite: boolean, errorIfExists: boolean): Promise<void> => {
  if (fs.existsSync(filepath)) {
    if (overwrite) {
      logger.info(`Writing config file - ${filepath}`)
      fs.writeFileSync(filepath, contents, { encoding: 'utf-8' })
    } else if (errorIfExists) {
      throw new Error(`Cannot write, file already exists '${filepath}'. Force overwrite with the --force parameter.`)
    } else {
      logger.warn(`Cannot write, file already exists '${filepath}'. Force overwrite with the --force parameter.`)
    }
  } else {
    logger.info(`Writing config file - ${filepath}`)
    fs.writeFileSync(filepath, contents, { encoding: 'utf-8' })
  }
}

/**
 * Interactively choose an initialiser.
 */
export const init = async (options: ProgramOptions): Promise<void> => {
  // throw error
  if (options.batch === true) {
    throw new Error(`Interactive prompts not supported in batch mode. No config file found - "${defaults.getDefaults().HOOKED_FILE}".`)
  }

  // ask user which hooked.yaml template to use (NOTE: even if only one option, still ask user the chance to escape without creating a file!)
  await inquirer.prompt([
    {
      type: 'list',
      name: 'init',
      message: 'Create new config from:',
      pageSize: defaults.getDefaults().PAGE_SIZE,
      choices: [
        { name: 'New Blank template.', value: 'config' },
        { name: 'Create SSL certificates (requires "openssl").', value: 'ssl' },
        { name: 'Create docker compose file and run (requires "docker").', value: 'docker' }
      ],
      loop: true
    }
  ]).then(async (answers) => {
    switch (answers.init) {
      case 'ssl':
        await initialiseSsl(options)
        break
      case 'docker':
        await initialiseDocker(options)
        break
      case 'config':
        await initialiseConfig(options)
        break
    }
  })
}
