import child_process from 'child_process'
import fs from 'fs'
import path from 'path'
import { yellow } from '../colour.js'
import crypto from 'crypto'
import { type ResolvedEnv } from '../types.js'

export const randomString = (): string => crypto.randomBytes(20).toString('hex')

export const cleanupOldTmpFiles = (env: ResolvedEnv): void => {
  // if the root, clean up old .tmp-*.sh files
  const isRoot = env.HOOKED_ROOT !== 'false'
  if (isRoot) {
    // set HOOKED_ROOT for child invocations
    env.HOOKED_ROOT = 'false'
    fs.readdirSync('.').forEach((file) => {
      if (file.startsWith('.tmp-') && file.endsWith('.sh')) {
        fs.unlinkSync(file)
      }
    })
  }
}

/**
 * Executes the provided multiline command, and returns the stdout as a string.
 * @param multilineCommand
 * @param dockerImage - optional - if provided, runs the command in a docker container.
 * @param opts
 * @returns
 */
export const executeCmd = (
  multilineCommand: string,
  dockerImage: string | undefined = undefined,
  opts: any = undefined
): string => {
  try {
    // N.B. use randomString to stop script clashes (e.g. when calling another hooked command, from this command!)
    const rand = randomString()
    const filepath = path.resolve(`.tmp-${rand}.sh`)
    const envfile = path.resolve(`.env-${rand}.txt`)
    const parent = path.dirname(filepath)
    const runInDocker = typeof dockerImage !== 'undefined'
    fs.writeFileSync(filepath, multilineCommand, 'utf-8')
    fs.chmodSync(filepath, 0o755)
    if (runInDocker) {
      fs.writeFileSync(envfile, Object.entries(opts.env).map(([k, v]) => `${k}=${v as string}`).join('\n'), 'utf-8')
      fs.chmodSync(filepath, 0o644)
    }
    const cmd = runInDocker
      // eslint-disable-next-line max-len
      ? `docker run -t --rm --network host --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"`
      : filepath
    const output = child_process.execSync(cmd, opts)
    if (runInDocker && fs.existsSync(envfile)) {
      fs.unlinkSync(envfile)
    }
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    } else {
      console.warn(yellow(`warn: Could not delete ${filepath}`))
    }
    return output !== null ? output.toString() : ''
  } catch (err: any) {
    const status = err.status as string
    const message = err.message as string
    err.message = `Command failed with status code ${status}\n` +
    `Underlying error: "${message}"\n` +
    'Consider adding a "set -ve" to your $cmd to see which line errored.'
    throw err
  }
}
