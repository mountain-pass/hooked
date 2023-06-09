/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-len */
import child_process, { type ChildProcess, type ExecSyncOptions, type SpawnOptionsWithoutStdio } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isDefined, isDockerCmdScript, isSSHCmdScript, type CmdScript, type ResolvedEnv } from '../types.js'
import logger from '../utils/logger.js'
import { resolveResolveScript } from './ScriptExector.js'
import { Environment } from '../utils/Environment.js'

export const randomString = (): string => crypto.randomBytes(20).toString('hex')

export const cleanupOldTmpFiles = (env: Environment): void => {
  // if the root, clean up old .tmp-*.sh files
  const isRoot = env.getResolved('HOOKED_ROOT') !== 'false'
  if (isRoot) {
    // set HOOKED_ROOT for child invocations
    env.putResolved('HOOKED_ROOT', 'false')
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

export const childProcesses: ChildProcess[] = []
export const dockerNames: string[] = []

export interface CustomOptions {
  captureStdout: boolean
  printStdio: boolean
}

/**
 * Internal function for running a process.
 * @param cmd
 * @param opts
 * @param customOpts
 * @returns
 */
export const createProcess = async (cmd: string, opts: ExecSyncOptions, customOpts: CustomOptions): Promise<string> => {
  const buffer = child_process.execSync(cmd, { ...opts, stdio: customOpts.captureStdout ? undefined : customOpts.printStdio ? 'inherit' : 'ignore' })
  const stdout = buffer !== null ? buffer.toString() : ''
  return customOpts.captureStdout ? stdout : ''
}

export const spawnProcess = async (cmd: string, opts: SpawnOptionsWithoutStdio, customOpts: CustomOptions): Promise<string> => {
  const child: ChildProcess = child_process.spawn(cmd, { ...opts, stdio: ['inherit', 'pipe', 'pipe'] })
  childProcesses.push(child)
  // type StdioNull = 'inherit' | 'ignore' | Stream;
  // type StdioPipeNamed = 'pipe' | 'overlapped';
  // const [, stdout, stderr] = opts.stdio as StdioPipe[]

  // print / capture stdout only [stdin, stdout, stderr]
  let stdout = ''
  child.stdout?.on('data', (data: string | Buffer) => {
    if (customOpts.printStdio) logger.writeInfo(data.toString())
    if (customOpts.captureStdout) stdout += data.toString()
  })
  if (customOpts.printStdio) child.stderr?.on('data', (data: string | Buffer) => { logger.writeDebug(data.toString()) })
  // wait for process to finish
  const exitCode = await new Promise(resolve => child.on('close', resolve))
  if (exitCode !== 0) {
    const error: any = new Error(`Command failed: ${cmd}`)
    error.status = exitCode
    throw error
  }
  return stdout
}

/**
 * Executes the provided multiline command, and returns the stdout as a string.
 * @param multilineCommand
 * @param dockerImage - optional - if provided, runs the command in a docker container.
 * @param opts
 * @returns
 */
export const executeCmd = async (
  script: CmdScript,
  opts: any = undefined,
  env: Environment,
  customOpts: CustomOptions,
  timeoutMs?: number // TODO implement?
): Promise<string> => {
  try {
    // N.B. use randomString to stop script clashes (e.g. when calling another hooked command, from this command!)
    const rand = randomString()
    const filepath = path.resolve(`.tmp-${rand}.sh`)
    const envfile = path.resolve(`.env-${rand}.txt`)
    const parent = path.dirname(filepath)
    const additionalOpts = { timeout: isDefined(timeoutMs) ? timeoutMs : undefined }

    // run script based on underlying implementations
    if (isDockerCmdScript(script)) {
      // run on docker
      const dockerfilepath = path.resolve(`.tmp-docker-${rand}.sh`)
      writeShellScript(dockerfilepath, script.$cmd)
      writeShellScript(envfile, envToDockerEnvfile(opts.env))
      const dockerName = rand
      const DEFAULT_DOCKER_SCRIPT = 'docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" --name ${dockerName} ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"'
      const { DOCKER_SCRIPT: dockerScript = DEFAULT_DOCKER_SCRIPT } = env.global
      const cmd = resolveResolveScript('-', { $resolve: dockerScript }, new Environment({ envfile, filepath: dockerfilepath, dockerImage: script.$image, dockerName, parent }), false)
      dockerNames.push(dockerName)
      writeShellScript(filepath, cmd, opts.env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else if (isSSHCmdScript(script)) {
      // run on remote machine
      const sshfilepath = path.resolve(`.tmp-docker-${rand}.sh`)
      writeShellScript(sshfilepath, script.$cmd, opts.env)
      const DEFAULT_SSH_SCRIPT = 'ssh -T "${user_at_server}" < "${filepath}"'
      const { SSH_SCRIPT: sshScript = DEFAULT_SSH_SCRIPT } = env.global
      const sshConnection = resolveResolveScript('-', { $resolve: script.$ssh }, env, false)
      const cmd = resolveResolveScript('-', { $resolve: sshScript }, new Environment({ envfile, filepath: sshfilepath, user_at_server: sshConnection, parent }), false)
      writeShellScript(filepath, cmd, opts.env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else {
      // otherwise fallback to local machine
      writeShellScript(filepath, script.$cmd, opts.env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    }
  } catch (err: any) {
    const status = err.status as string
    const message = err.message as string
    err.message = `Command failed with status code ${status}\n` +
    `Underlying error: "${message}"\n` +
    'Consider adding a "set -ve" to your $cmd to see which line errored.'
    throw err
  }
}
