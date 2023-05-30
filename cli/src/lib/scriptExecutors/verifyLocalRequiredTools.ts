import { isDefined, type ResolvedEnv } from '../types.js'
import logger from '../utils/logger.js'
import { loadRootPackageJsonSync } from '../utils/packageJson.js'
import { executeCmd } from './$cmd.js'

// lazy initialise variable, but then cache it for future invocations
let lazyCheckDockerExists: boolean | undefined

const packageJson = loadRootPackageJsonSync()

const verifyLatestVersion = async (onetimeEnvironment: ResolvedEnv, env: ResolvedEnv): Promise<void> => {
  try {
    // eslint-disable-next-line no-template-curly-in-string
    logger.debug('Checking if latest version...')
    // eslint-disable-next-line max-len
    const latestPublishedVersion = (await executeCmd({ $cmd: `\${NPM_BIN=npm} view ${packageJson.name} version` }, { env: onetimeEnvironment, stdio: ['ignore', 'pipe', 'ignore'] }, env, 2000)).trim()
    if (latestPublishedVersion !== packageJson.version) {
      logger.warn(`Not using latest ${packageJson.name}. Please consider upgrading to ${latestPublishedVersion} (current: ${packageJson.version})\n` +
      `Run: npm i -g --prefer-online --force ${packageJson.name}`)
    } else {
      logger.debug(`Found self: ${packageJson.version} (LATEST)`)
    }
  } catch (e: any) {
    // ignore errors - this is purely informational
    // logger.warn(e.message)
  }
}

const verifyDockerExists = async (onetimeEnvironment: ResolvedEnv, env: ResolvedEnv): Promise<void> => {
  if (!isDefined(lazyCheckDockerExists)) {
    try {
      // eslint-disable-next-line no-template-curly-in-string
      const version = await executeCmd({ $cmd: '${DOCKER_BIN=docker} -v' }, { env: onetimeEnvironment, stdio: ['ignore', 'pipe', 'ignore'] }, env)
      logger.debug(`Found docker: ${version}`)
      lazyCheckDockerExists = true
    } catch (e: any) {
      // logger.warn(e.message)
      // eslint-disable-next-line max-len
      throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
    }
  } else {
    // I don't if the previous error will ever be ignored, but here it is again just in case!
    // eslint-disable-next-line max-len
    throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
  }
}

export default {
  verifyLatestVersion,
  verifyDockerExists
}
