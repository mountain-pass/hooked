
import nodeCleanup from 'node-cleanup'
import logger from './utils/logger.js'
import { childProcesses, dockerNames } from './scriptExecutors/$cmd.js'
import verifyLocalRequiredTools from './scriptExecutors/verifyLocalRequiredTools.js'
import { cleanupOldTmpFiles } from './utils/fileUtils.js'
import { type ProgramOptions } from './program.js'

const onExit = (options: ProgramOptions): void => {
  nodeCleanup((exitCode, signal) => {
    const newExitCode = exitCode !== null ? exitCode : typeof signal === 'string' ? 1 : 0
    // delete tmp files...
    if (options.skipCleanup !== true) {
      logger.debug('Cleaning up .tmp and .env files...')
      cleanupOldTmpFiles()
    }
    // kill child processes
    logger.debug(`Cleaning up child processes... [${childProcesses.length}]`)
    for (const child of childProcesses) {
      child.kill('SIGKILL') // SIGKILL 9 / SIGTERM 15
    }
    // kill docker containers
    logger.debug(`Cleaning up docker containers... [${dockerNames.length}]`)
    Promise.all(dockerNames.map(async (dockerName): Promise<string> => {
      return await verifyLocalRequiredTools.verifyDockerKilled(dockerName)
    }))
      .then(() => {
        logger.debug(`Shutting down hooked with exit code [${newExitCode}]`)
        process.kill(process.pid, newExitCode)
      })
      .catch((err) => {
        logger.error(err)
        process.kill(process.pid, newExitCode)
      })
    nodeCleanup.uninstall() // don't call cleanup handler again, allow promises to cleanup!
    return false
  })
}

export default { onExit }
