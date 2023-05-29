/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-len */
import child_process from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isDefined, isDockerCmdScript, isSSHCmdScript, type CmdScript, type ResolvedEnv } from '../types.js'
import { resolveResolveScript } from './ScriptExector.js'
import logger from '../utils/logger.js'

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

const envToDockerEnvfile = (env: ResolvedEnv): string => {
  // TODO make this configurable via ENVIRONMENT?
  return Object.entries(env).map(([k, v]) => `${k}=${v}\n`).join('')
}

const envToShellExports = (env: ResolvedEnv): string => {
  // TODO make this configurable via ENVIRONMENT?
  return '\n' + Object.entries(env).map(([k, v]) => `export ${k}="${v}"\n`).join('') + '\n'
}

const writeShellScript = (filepath: string, content: string, env?: ResolvedEnv): void => {
  // inject environment exports into content
  if (isDefined(env)) {
    const patt = /^#[^\n]+\n/gm
    const envexports = envToShellExports(env)
    const match = patt.exec(content)
    if (match != null) {
      content = content.substring(0, patt.lastIndex) + envexports + content.substring(patt.lastIndex)
    } else {
      content = envexports + content
    }
  }
  fs.writeFileSync(filepath, content, 'utf-8')
  fs.chmodSync(filepath, 0o755)
}

/**
 * Executes the provided multiline command, and returns the stdout as a string.
 * @param multilineCommand
 * @param dockerImage - optional - if provided, runs the command in a docker container.
 * @param opts
 * @returns
 */
export const executeCmd = (
  script: CmdScript,
  opts: any = undefined,
  env: ResolvedEnv,
  timeoutMs?: number // TODO implement?
): string => {
  try {
    // N.B. use randomString to stop script clashes (e.g. when calling another hooked command, from this command!)
    const rand = randomString()
    const filepath = path.resolve(`.tmp-${rand}.sh`)
    const envfile = path.resolve(`.env-${rand}.txt`)
    const parent = path.dirname(filepath)
    let output = '' as any
    const additionalOpts = { timeout: isDefined(timeoutMs) ? timeoutMs : undefined }

    // run script based on underlying implementation
    if (isDockerCmdScript(script)) {
      // run on docker
      writeShellScript(filepath, script.$cmd)
      writeShellScript(envfile, envToDockerEnvfile(opts.env))
      const DEFAULT_DOCKER_SCRIPT = 'docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"'
      const { DOCKER_SCRIPT: dockerScript = DEFAULT_DOCKER_SCRIPT } = env
      const cmd = resolveResolveScript('-', { $resolve: dockerScript }, { envfile, filepath, dockerImage: script.$image, parent }, false)
      output = child_process.execSync(cmd, { ...additionalOpts, ...opts })
    } else if (isSSHCmdScript(script)) {
      // run on remote machine
      writeShellScript(filepath, script.$cmd, opts.env)
      const DEFAULT_SSH_SCRIPT = 'ssh "${user_at_server}" < "${filepath}"'
      const { SSH_SCRIPT: sshScript = DEFAULT_SSH_SCRIPT } = env
      const cmd = resolveResolveScript('-', { $resolve: sshScript }, { envfile, filepath, user_at_server: script.$ssh, parent }, false)
      output = child_process.execSync(cmd, { ...additionalOpts, ...opts })
    } else {
      // otherwise fallback to local machine
      writeShellScript(filepath, script.$cmd, opts.env)
      output = child_process.execSync(filepath, { ...additionalOpts, ...opts })
    }
    // deliberately do not delete files on cleanup - so user has visibility for debugging.
    // plus scripts are cleaned up on startup...
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
