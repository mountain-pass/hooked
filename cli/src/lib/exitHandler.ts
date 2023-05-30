
import nodeCleanup from 'node-cleanup'
import logger from './utils/logger.js'
import { childProcesses, dockerNames, executeCmd } from './scriptExecutors/$cmd.js'

const onExit = (): void => {
  nodeCleanup((exitCode, signal) => {
    const newExitCode = exitCode !== null ? exitCode : typeof signal === 'string' ? 99 : 0
    logger.debug(`Shutting down with exit code ${newExitCode}...`)
    // kill child processes
    logger.debug('Cleaning up child processes...')
    for (const child of childProcesses) {
      child.kill('SIGKILL') // SIGKILL 9 / SIGTERM 15
    }
    // kill docker containers
    logger.debug('Cleaning up docker containers...')
    Promise.all(dockerNames.map(async (dockerName) => {
      return await executeCmd({ $cmd: `docker kill ${dockerName} || true` }, {}, {})
    }))
      .then(() => {
        process.exit(newExitCode)
        // process.kill(process.pid, 'SIGINT')
      })
      .catch((err) => {
        logger.error(err)
        process.exit(newExitCode)
        // process.kill(process.pid, 'SIGINT')
      })
    nodeCleanup.uninstall() // don't call cleanup handler again, allow promises to cleanup!
    return false
  })
}

export default { onExit }
