/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-len */
import child_process, { type ChildProcess, type ExecSyncOptions, type SpawnOptionsWithoutStdio } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isDefined, isDockerCmdScript, isSSHCmdScript, type CmdScript } from '../types.js'
import logger from '../utils/logger.js'
import { resolveResolveScript } from './ScriptExector.js'
import { Environment } from '../utils/Environment.js'

export const randomString = (): string => crypto.randomBytes(20).toString('hex')

export const cleanupOldTmpFiles = (env: Environment): void => {
  // if the root, clean up old .tmp-*.sh files
  const isRoot = env.isResolvableByKey('HOOKED_ROOT') ? env.resolveByKey('HOOKED_ROOT') !== 'false' : true
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

/**
 * Writes an executable file. Optional injects environment variables into the file.
 * @param filepath
 * @param content
 * @param env - optional
 */
const writeScript = (filepath: string, content: string, env?: Environment): void => {
  // inject environment exports into content, IF provided
  if (isDefined(env)) {
    const REGEX_HAS_HASHBANG_LEADINGLINE = /^#[^\n]+\n/gm
    const envexports = env.envToShellExports()
    // inject environment variables at the head of the file...
    const match = REGEX_HAS_HASHBANG_LEADINGLINE.exec(content)
    if (match != null) {
      content = content.substring(0, REGEX_HAS_HASHBANG_LEADINGLINE.lastIndex) + envexports + content.substring(REGEX_HAS_HASHBANG_LEADINGLINE.lastIndex)
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
      // write a docker file, and an env file...
      const dockerfilepath = path.resolve(`.tmp-docker-${rand}.sh`)
      writeScript(dockerfilepath, script.$cmd)
      writeScript(envfile, env.envToDockerEnvfile())
      const dockerName = rand
      const DEFAULT_DOCKER_SCRIPT = 'docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" --name ${dockerName} ${dockerImage} /bin/sh -c "chmod 755 ${filepath} && ${filepath}"'
      const { DOCKER_SCRIPT: dockerScript = DEFAULT_DOCKER_SCRIPT } = env.global
      const cmd = resolveResolveScript('-', { $resolve: dockerScript }, new Environment({ envfile, filepath: dockerfilepath, dockerImage: script.$image, dockerName, parent }), false)
      dockerNames.push(dockerName)
      // write a script to run the docker...
      writeScript(filepath, cmd, env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else if (isSSHCmdScript(script)) {
      // run on remote machine
      const sshfilepath = path.resolve(`.tmp-docker-${rand}.sh`)
      writeScript(sshfilepath, script.$cmd, env)
      const DEFAULT_SSH_SCRIPT = 'ssh -T "${user_at_server}" < "${filepath}"'
      const { SSH_SCRIPT: sshScript = DEFAULT_SSH_SCRIPT } = env.global
      const sshConnection = resolveResolveScript('-', { $resolve: script.$ssh }, env, false)
      const cmd = resolveResolveScript('-', { $resolve: sshScript }, new Environment({ envfile, filepath: sshfilepath, user_at_server: sshConnection, parent }), false)
      // write a script to execute the shell script on the remote machine...
      writeScript(filepath, cmd, env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else {
      // otherwise fallback to running a script on the local machine
      writeScript(filepath, script.$cmd, env)
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
