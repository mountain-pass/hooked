import { CronJob } from 'cron'
import express, { type Router } from 'express'
import fs from 'fs'
import fsPromise from 'fs/promises'
import common from '../common/invoke.js'
import loaders from '../common/loaders.js'
import { findScript } from '../config.js'
import defaults from '../defaults.js'
import { type ProgramOptions } from '../program.js'
import {
  isDefined,
  sortCaseInsensitive,
  type YamlConfig
} from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import { globalErrorHandler } from './globalErrorHandler.js'

const getLastModifiedTimeMs = async (filepath: string): Promise<number> => {
  return (await fsPromise.stat(filepath)).mtimeMs
}

interface JobContext {
  /** The name of the job. */
  name: string
}

/** Rebuilds the cron jobs. */
const rebuildCronJobs = async (
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions,
  config: YamlConfig,
  previousJobs: Array<CronJob<any, JobContext>>
): Promise<Array<CronJob<any, JobContext>>> => {
  // stop existing jobs (what happens if running?)
  for (const job of previousJobs) {
    logger.debug(`Stopping cron job - ${job.context.name}`)
    job.stop()
  }

  // create new jobs
  const newJobs: Array<CronJob<any, JobContext>> = []

  if (isDefined(config.triggers)) {
    for (const [name, cronJob] of Object.entries(config.triggers)) {
      const { $cron: cronTime, $job } = cronJob
      const scriptPath = $job.split(' ')
      // resolve script path
      const job = CronJob.from({
        context: { name },
        cronTime,
        onTick: async function () {
          logger.debug(`Running cron job - "${name}" - nextRun=${job.nextDate().toISO() ?? '<unknown>'}`)
          await common.invoke(systemProcessEnvs, options, config, ['default'], scriptPath, {}, true, false)
            .catch((err: Error) => { logger.error(`Error occurred running cron job - ${err.message}`) })
        },
        start: true,
        timeZone: options.timezone ?? 'UTC'
      })
      logger.debug(`Created cron job - "${name}" - nextRun=${job.nextDate().toISO() ?? '<unknown>'}`)
      newJobs.push(job)
    }
  }

  if (newJobs.length === 0) {
    logger.debug('No cron jobs.')
  }
  return newJobs
}

const router = async (
  systemProcessEnvs: RawEnvironment,
  options: ProgramOptions
): Promise<Router> => {
  const app = express.Router()

  const filepath = defaults.getDefaults().HOOKED_FILE
  let config = {} as any as YamlConfig
  let lastModified = -1
  let cronJobs: Array<CronJob<any, JobContext>> = []

  // initial setup.
  config = await loaders.loadConfiguration(systemProcessEnvs, options)
  lastModified = await getLastModifiedTimeMs(filepath)
  cronJobs = await rebuildCronJobs(
    systemProcessEnvs,
    options,
    config,
    cronJobs
  )

  // watcher for file configuration changes
  const fileChangeListener = (curr: fs.Stats, prev: fs.Stats): void => {
    checkIfConfigurationHasChanged(curr)
      .catch((err: Error) => { logger.error(`Error occurred checking config change - ${err.message}`) })
  }
  // watch for changes
  fs.watchFile(filepath, { interval: 3000 }, fileChangeListener)
  process.on('SIGTERM', () => { fs.unwatchFile(filepath, fileChangeListener) })

  /** Force reloads of all configuration. */
  const reloadConfiguration = async (): Promise<void> => {
    config = await loaders.loadConfiguration(systemProcessEnvs, options)
    // and reconfigure cron jobs
    cronJobs = await rebuildCronJobs(
      systemProcessEnvs,
      options,
      config,
      cronJobs
    )
  }

  /** Checks whether the root config file modification time is newer, and reloads the configuration. (Max once per second) */
  const checkIfConfigurationHasChanged = async (curr: fs.Stats): Promise<void> => {
    // TODO extend to all files?
    if (curr.mtimeMs > lastModified) {
      // file has been modified, reload...
      logger.debug(`Configuration changed, reloading '${filepath}'`)
      lastModified = curr.mtimeMs
      await reloadConfiguration()
    }
  }

  /**
   * Reloads all configuration from disk.
   */
  app.get('/reload', globalErrorHandler(async (req, res) => {
    await reloadConfiguration()
    res.json({ message: 'Successfully reloaded configuration.' })
  }))

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/env', globalErrorHandler(async (req, res) => {
    const result = Object.entries(config.env).reduce<Record<string, string[]>>((prev, curr) => {
      const [key, env] = curr
      prev[key] = Object.keys(env).sort(sortCaseInsensitive)
      return prev
    }, {})
    res.json(result)
  }))

  app.get('/imports', globalErrorHandler(async (req, res) => {
    res.json(config.imports ?? [])
  }))

  app.get('/triggers', globalErrorHandler(async (req, res) => {
    res.json(config.triggers ?? [])
  }))

  app.get('/plugins', globalErrorHandler(async (req, res) => {
    res.json(config.plugins ?? {})
  }))

  app.get('/scripts', globalErrorHandler(async (req, res) => {
    res.json(config.scripts ?? {})
  }))

  app.get('/scripts/:scriptPath', globalErrorHandler(async (req, res) => {
    const scriptPath = req.params.scriptPath.split(' ')
    const [script, paths] = await findScript(config, scriptPath, options)
    res.json({ script, paths })
  }))

  /**
   * Runs the given script.
   */
  app.get('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    res.json(await common.invoke(systemProcessEnvs, options, config, providedEnvNames, scriptPath, {}, false, false))
  }))

  /**
   * Runs the given script with environment variables.
   */
  app.post('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    const stdin = req.body ?? {}
    res.json(await common.invoke(systemProcessEnvs, options, config, providedEnvNames, scriptPath, stdin, false, false))
  }))

  return app
}

export default { router }
