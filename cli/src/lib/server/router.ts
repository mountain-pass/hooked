import { CronJob } from 'cron'
import express, { type Router } from 'express'
import fs from 'fs'
import fsPromise from 'fs/promises'
import common from '../common/invoke.js'
import loaders from '../common/loaders.js'
import { findScript } from '../config.js'
import defaults from '../defaults.js'
import { type ProgramOptions } from '../program.js'
import { type HookedServerDashboardSchemaType } from '../schema/HookedSchema.js'
import { StdinChoicesResolver } from '../scriptExecutors/resolvers/StdinChoicesResolver.js'
import {
  isDefined,
  isStdinScript,
  sortCaseInsensitive,
  type YamlConfig
} from '../types.js'
import { type RawEnvironment } from '../utils/Environment.js'
import logger from '../utils/logger.js'
import { globalErrorHandler, hasRole } from './globalErrorHandler.js'

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

  if (isDefined(config.server?.triggers)) {
    for (const [name, cronJob] of Object.entries(config.server?.triggers)) {
      const { $cron: cronTime, $script } = cronJob
      const scriptPath = $script.split(' ')
      // resolve script path
      const job = CronJob.from({
        context: { name },
        cronTime,
        onTick: async function () {
          logger.debug(`Running cron job - "${name}" - nextRun=${job.nextDate().toISO() ?? '<unknown>'}`)
          await common.invoke(null, systemProcessEnvs, options, config, ['default'], scriptPath, {}, true, false)
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

  app.get('/me', globalErrorHandler(async (req, res) => {
    res.json(req.user)
  }))

  /**
   * Reloads all configuration from disk.
   */
  app.get('/reload', hasRole('admin'), globalErrorHandler(async (req, res) => {
    await reloadConfiguration()
    res.json({ message: 'Successfully reloaded configuration.' })
  }))

  /**
   * Prints the different environments available (and their environment variable names).
   */
  app.get('/env', hasRole('admin'), globalErrorHandler(async (req, res) => {
    const result = Object.entries(config.env ?? {}).reduce<Record<string, string[]>>((prev, curr) => {
      const [key, env] = curr
      prev[key] = Object.keys(env).sort(sortCaseInsensitive)
      return prev
    }, {})
    res.json(result)
  }))

  // app.get('/imports', globalErrorHandler(async (req, res) => {
  //   res.json(config.imports ?? [])
  // }))

  app.get('/dashboard/list', globalErrorHandler(async (req, res) => {
    const user = req.user
    if (isDefined(config.server)) {
      const dashboardsList: HookedServerDashboardSchemaType[] = config.server.dashboards ?? []
      const dashboards = dashboardsList
        .filter((d) => {
          // has access
          return (d.accessRoles ?? ['admin']).some((r) => user.accessRoles.includes(r))
        })
        .map((d) => {
          const { title } = d
          return { title }
        })
      res.json(dashboards)
    }
  }))

  app.get('/dashboard/get/:dashboard', globalErrorHandler(async (req, res) => {
    const user = req.user
    const dashboard = (config.server?.dashboards ?? [])
      .find((d) => d.title === req.params.dashboard && (d.accessRoles ?? ['admin']).some((r) => user.accessRoles.includes(r)))
    if (isDefined(dashboard)) {
      res.json(dashboard)
    } else {
      res.sendStatus(403)
    }
  }))

  app.get('/triggers', hasRole('admin'), globalErrorHandler(async (req, res) => {
    res.json(config.server?.triggers ?? [])
  }))

  // app.get('/plugins', globalErrorHandler(async (req, res) => {
  //   res.json(config.plugins ?? {})
  // }))

  /**
   * Get all script configs.
   */
  app.get('/scripts', hasRole('admin'), globalErrorHandler(async (req, res) => {
    res.json(config.scripts ?? {})
  }))

  /**
   * Get a specific script config.
   */
  app.get('/scripts/:scriptPath', hasRole('admin'), globalErrorHandler(async (req, res) => {
    if (!req.user.accessRoles.includes('admin')) {
      return res.status(401).json({ message: 'Not an admin user.' })
    }
    const scriptPath = req.params.scriptPath.split(' ')
    const [script] = await findScript(config, scriptPath, options)
    res.json(script) // { script, paths }
  }))

  /**
   * Fetch a single, script's, environment value config (with resolved choices, by env name)
   */
  app.get('/resolveEnvValue/:env/script/:scriptPath/env/:envKeyName', globalErrorHandler(async (req, res) => {
    const envKeyName = req.params.envKeyName
    const scriptPath = req.params.scriptPath.split(' ')

    // setup
    const { env, envVars } = await loaders.initialiseEnvironment(systemProcessEnvs, options, config)

    // find the script to execute...
    const rootScriptAndPaths = await findScript(config, scriptPath, options)
    const script: any = rootScriptAndPaths[0]
    if (isDefined(script.$env)) {
      const envValueScript = script.$env[envKeyName]

      if (isStdinScript(envValueScript)) {
        const choices = await StdinChoicesResolver(envKeyName, envValueScript, {
          config,
          env,
          envVars,
          options,
          stdin: req.body ?? {}
        })

        return res.json({ ...envValueScript, $choices: choices })
      } else if (isDefined(envValueScript)) {
        return res.json({ ...envValueScript })
      }
    }
    return res.json({ message: 'Invalid script or environment key name.' }).status(400).end()
  }))

  /**
   * Runs the given script.
   */
  app.get('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    res.json(await common.invoke(req.user, systemProcessEnvs, options, config, providedEnvNames, scriptPath, {}, false, false))
  }))

  /**
   * Runs the given script with environment variables.
   */
  app.post('/run/:env/:scriptPath', globalErrorHandler(async (req, res) => {
    const providedEnvNames = req.params.env.split(',')
    const scriptPath = req.params.scriptPath.split(' ')
    res.json(await common.invoke(req.user, systemProcessEnvs, options, config, providedEnvNames, scriptPath, req.body ?? {}, false, false))
  }))

  return app
}

export default { router }
