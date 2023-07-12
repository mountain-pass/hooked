import { isDefined } from '../types.js'
import { Environment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import { loadRootPackageJsonSync } from '../utils/packageJson.js'
import { executeCmd } from './$cmd.js'

// lazy initialise variable, but then cache it for future invocations
let lazyCheckDockerExists: boolean | undefined

const packageJson = loadRootPackageJsonSync()

const verifyLatestVersion = async (env: Environment): Promise<void> => {
  try {
    // eslint-disable-next-line no-template-curly-in-string
    logger.debug('Checking if latest version...')
    // eslint-disable-next-line max-len
    const latestPublishedVersion = (await executeCmd(
      { $cmd: `\${NPM_BIN=npm} view ${packageJson.name} version 2>/dev/null || true` },
      { env: env.getAll() },
      env,
      { printStdio: false, captureStdout: true },
      5000
    )).trim()
    if (latestPublishedVersion.trim().length === 0) {
      logger.warn(`Unable to check latest version for package '${packageJson.name}'.`)
    } else if (latestPublishedVersion !== packageJson.version) {
      // eslint-disable-next-line max-len
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

const verifyDockerExists = async (env: Environment): Promise<void> => {
  if (!isDefined(lazyCheckDockerExists)) {
    try {
      const version = await executeCmd(
        // eslint-disable-next-line no-template-curly-in-string
        { $cmd: '${DOCKER_BIN=docker} -v' },
        { env: env.resolved },
        env,
        { printStdio: false, captureStdout: true },
        5000
      )
      logger.debug(`Found docker: ${version.trim()}`)
      lazyCheckDockerExists = true
    } catch (e: any) {
      // logger.warn(e.message)
      // eslint-disable-next-line max-len
      throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
    }
  } else if (lazyCheckDockerExists !== true) {
    // I don't if the previous error will ever be ignored, but here it is again just in case!
    // eslint-disable-next-line max-len
    throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
  }
}

const verifyDockerKilled = async (dockerName: string): Promise<string> => {
  return await executeCmd({ $cmd: `docker kill ${dockerName} 2>/dev/null || true` }, {},
    new Environment(), { printStdio: false, captureStdout: false }, 5000)
}

export default {
  verifyLatestVersion,
  verifyDockerExists,
  verifyDockerKilled
}
