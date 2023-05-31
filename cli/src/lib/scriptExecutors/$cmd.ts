/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-len */
import child_process, { type SpawnOptionsWithoutStdio, type ChildProcess, type ExecException } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { yellow } from '../colour.js'
import { isDefined, isDockerCmdScript, isSSHCmdScript, type CmdScript, type ResolvedEnv } from '../types.js'
import { resolveResolveScript } from './ScriptExector.js'
import logger from '../utils/logger.js'
import { type StdioPipe } from 'child_process'

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
export const createProcess = async (cmd: string, opts: SpawnOptionsWithoutStdio, customOpts: CustomOptions): Promise<string> => {
  // let callback: any
  // const promise = new Promise<ExecResponse>((resolve, reject) => {
  //   callback = (error: ExecException | null, stdout: string | Buffer, stderr: string | Buffer): void => {
  //     if (error !== null) {
  //       reject(error)
  //     } else {
  //       resolve({ error, stdout, stderr })
  //     }
  //   }
  // })
  // const { env = {} } = opts
  // opts.env = { ...process.env, ...env } as any
  // const path = opts.env?.PATH as string
  // console.log(`cmd: ${cmd}, opts: ${JSON.stringify(opts)}, \n\npath: ${path}`)
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
    const error: any = new Error('Process exited with non-zero value')
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
  env: ResolvedEnv,
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
      const { DOCKER_SCRIPT: dockerScript = DEFAULT_DOCKER_SCRIPT } = env
      const cmd = resolveResolveScript('-', { $resolve: dockerScript }, { envfile, filepath: dockerfilepath, dockerImage: script.$image, dockerName, parent }, false)
      dockerNames.push(dockerName)
      writeShellScript(filepath, cmd, opts.env)
      return await createProcess(filepath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else if (isSSHCmdScript(script)) {
      // run on remote machine
      const sshfilepath = path.resolve(`.tmp-docker-${rand}.sh`)
      writeShellScript(sshfilepath, script.$cmd, opts.env)
      const DEFAULT_SSH_SCRIPT = 'ssh "${user_at_server}" < "${filepath}"'
      const { SSH_SCRIPT: sshScript = DEFAULT_SSH_SCRIPT } = env
      const sshConnection = resolveResolveScript('-', { $resolve: script.$ssh }, env, false)
      const cmd = resolveResolveScript('-', { $resolve: sshScript }, { envfile, filepath: sshfilepath, user_at_server: sshConnection, parent }, false)
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
