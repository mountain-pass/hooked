/* eslint-disable no-template-curly-in-string */
/* eslint-disable max-len */
import child_process, { type ChildProcess, type ExecSyncOptions } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { CaptureWritableStream } from '../common/CaptureWritableStream.js'
import { type ProgramOptions } from '../program.js'
import { isDefined, isDockerCmdScript, isSSHCmdScript, type CmdScript, type DockerCmdScript, type SSHCmdScript } from '../types.js'
import { Environment } from '../utils/Environment.js'
import fileUtils from '../utils/fileUtils.js'
import logger from '../utils/logger.js'
import { resolveResolveScript } from './ScriptExecutor.js'
import ApplicationMode from '../utils/ApplicationMode.js'

export const randomString = (): string => crypto.randomBytes(20).toString('hex')

export const injectEnvironmentInScript = (content: string, env?: Environment): string => {
  // inject environment exports into content, IF provided
  if (isDefined(env)) {
    const REGEX_HAS_HASHBANG_LEADINGLINE = /^#![^\n]+\n/gm
    const envexports = env.envToShellExports()
    // inject environment variables at the head of the file...
    const match = REGEX_HAS_HASHBANG_LEADINGLINE.exec(content)
    if (match != null) {
      content = content.substring(0, REGEX_HAS_HASHBANG_LEADINGLINE.lastIndex) + envexports + content.substring(REGEX_HAS_HASHBANG_LEADINGLINE.lastIndex)
    } else {
      // NOTE: hashbang required, otherwise -> Underlying error: "spawn Unknown system error -8"
      content = "#!/bin/sh\n" + envexports + content
    }
  }
  return content.endsWith('\n') ? content : (content + '\n')
}

/**
 * Writes an executable file. Optional injects environment variables into the file.
 * @param filepath
 * @param content
 * @param env - optional
 */
const writeScript = (filepath: string, content: string, env?: Environment): void => {
  const newContent = injectEnvironmentInScript(content, env)
  logger.debug(`Writing file - ${filepath}`)
  fs.writeFileSync(filepath, newContent, 'utf-8')
  fs.chmodSync(filepath, 0o755)
}

export const childProcesses: ChildProcess[] = []
export const dockerNames: string[] = []

export interface CustomOptions {
  captureStdout: boolean
  printStdio: boolean
}

// type ExecCallback = (error: ExecException | null, stdout: string, stderr: string) => void
// interface ExecOutput { error: ExecException | null, stdout: string, stderr: string }

// /**
//  * Internal function for running a process.
//  * @param cmd
//  * @param opts
//  * @param customOpts
//  * @returns
//  */
// export const createProcessAsync = async (cmd: string, opts: ExecSyncOptions, customOpts: CustomOptions): Promise<string> => {
//   logger.debug(`Creating process async - ${cmd}`)
//   // const buffer = child_process.execSync(cmd, { ...opts, stdio: customOpts.captureStdout ? undefined : customOpts.printStdio ? 'inherit' : 'ignore' })
//   // const stdout = buffer !== null ? buffer.toString() : ''
//   const { stdout } = await new Promise<ExecOutput>((resolve, reject) => {
//     child_process.exec(cmd, { ...opts }, (error, stdout, stderr) => {
//       if (error != null) {
//         reject(error)
//       } else {
//         resolve({ error, stdout, stderr })
//       }
//     })
//   })
//   if (!customOpts.captureStdout && customOpts.printStdio) {
//     logger.info(stdout)
//   }
//   return customOpts.captureStdout ? stdout : ''
// }

export const createProcess = async (cmdFilePath: string, stdoutFilePath: string, stderrFilePath: string, opts: ExecSyncOptions, customOpts: CustomOptions): Promise<string> => {
  logger.debug(`Creating process sync - ${cmdFilePath}`)
  // const stdout = new CaptureWritableStream(customOpts.printStdio ? process.stdout : undefined)
  // const stderr = new CaptureWritableStream(customOpts.printStdio ? process.stderr : undefined)
  const fd1 = fs.openSync(stdoutFilePath, 'a')
  const fd2 = fs.openSync(stderrFilePath, 'a')
  // const stdout = fs.createWriteStream('', { fd: fd1 })
  // const stderr = fs.createWriteStream('', { fd: fd2 })
  // const stdout = new CaptureWritableStream(customOpts.printStdio ? process.stdout : undefined)
  // const stderr = new CaptureWritableStream(customOpts.printStdio ? process.stderr : undefined)
  // const child = child_process.spawn(cmd, { ...opts, stdio: 'inherit' })
  const child = child_process.spawn(cmdFilePath, { ...opts, stdio: !customOpts.captureStdout && customOpts.printStdio && ApplicationMode.getApplicationMode() !== 'test' ? 'inherit' : ['ignore', fd1, fd2] })
  // child.stdout?.pipe(stdout)
  // child.stderr?.pipe(stderr)
  const exitCode = await new Promise(resolve => child.on('close', resolve))
  // stdout.end()
  // stderr.end()
  if (exitCode !== 0) {
    const error: any = new Error(`Command failed: ${cmdFilePath}`)
    error.status = exitCode
    throw error
  }
  // to facilitate testing...
  const stdoutContent = await fsPromises.readFile(stdoutFilePath, { encoding: 'utf-8' })
  const tmp = new CaptureWritableStream()
  tmp.whenUpdated(stdoutContent)
  tmp.whenFinished(stdoutContent)

  // logger.debug(stdout.getCaptured())
  return customOpts.captureStdout ? stdoutContent : ''
}

/**
 * Executes the provided multiline command, and returns the stdout as a string.
 * @param paths - the script paths
 * @param multilineCommand
 * @param dockerImage - optional - if provided, runs the command in a docker container.
 * @param opts
 * @returns
 */
export const executeCmd = async (
  key: string,
  script: CmdScript | DockerCmdScript | SSHCmdScript,
  options: ProgramOptions,
  opts: any = undefined,
  env: Environment,
  customOpts: CustomOptions,
  timeoutMs?: number // TODO implement?
): Promise<string> => {
  // keep track of files that need to be cleaned up post run.
  const cleanupFiles = []

  try {
    // N.B. use randomString to stop script clashes (e.g. when calling another hooked command, from this command!)
    const rand = randomString()
    const scriptName = `${key.replace(/[^\w\d-]+/g, '')}-${rand}`
    const filepath = fileUtils.resolvePath(`.tmp-${scriptName}.sh`)
    const stdoutpath = `${filepath}.stdout`
    const stderrpath = `${filepath}.stderr`
    const envfile = fileUtils.resolvePath(`.env-${scriptName}.txt`)
    const parent = options.dockerHookedDir ?? path.dirname(filepath)
    const additionalOpts = { timeout: isDefined(timeoutMs) ? timeoutMs : undefined }
    cleanupFiles.push(filepath)
    cleanupFiles.push(envfile)
    cleanupFiles.push(stdoutpath)
    cleanupFiles.push(stderrpath)

    // add "HOOKED_ROOT=false" to all child environments...
    env.putResolved('HOOKED_ROOT', 'false')

    // run script based on underlying implementations
    if (isDockerCmdScript(script)) {
      // write a docker file, and an env file...
      const dockerfilepath = fileUtils.resolvePath(`.tmp-docker-${scriptName}.sh`)
      cleanupFiles.push(dockerfilepath)
      writeScript(dockerfilepath, script.$cmd)
      writeScript(envfile, env.envToDockerEnvfile())
      const dockerName = rand
      const DEFAULT_DOCKER_SCRIPT = 'docker run -t --rm --network host --entrypoint "" --env-file "${envfile}" -w "${parent}" -v "${parent}:${parent}" --name ${dockerName} ${dockerImage} /bin/sh -c "${filepath}"'
      const { DOCKER_SCRIPT: dockerScript = DEFAULT_DOCKER_SCRIPT } = env.global
      const cmd = resolveResolveScript('-', { $resolve: dockerScript }, new Environment().putAllGlobal({
        envfile,
        filepath: path.join(parent, path.basename(dockerfilepath)),
        dockerImage: script.$image,
        dockerName,
        parent
      }), false)
      dockerNames.push(dockerName)

      // write a script to run the docker (include system env vars - these may be required e.g. DOCKER_HOST)...
      const tmp = env.clone().putAllResolved(process.env as any, false)
      writeScript(filepath, cmd, tmp)
      return await createProcess(filepath, stdoutpath, stderrpath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else if (isSSHCmdScript(script)) {
      // run on remote machine
      const sshfilepath = fileUtils.resolvePath(`.tmp-ssh-${scriptName}.sh`)
      cleanupFiles.push(sshfilepath)
      writeScript(sshfilepath, script.$cmd, env)
      const DEFAULT_SSH_SCRIPT = 'ssh -q -T "${user_at_server}" < "${filepath}"'
      const { SSH_SCRIPT: sshScript = DEFAULT_SSH_SCRIPT } = env.global
      const sshConnection = resolveResolveScript('-', { $resolve: script.$ssh }, env, false)
      const cmd = resolveResolveScript('-', { $resolve: sshScript }, new Environment().putAllGlobal({
        envfile,
        filepath: sshfilepath,
        user_at_server: sshConnection,
        parent
      }), false)
      // write a script to execute the shell script on the remote machine... (include system env vars - these may be required e.g. DOCKER_HOST)...
      const tmp = env.clone().putAllResolved(process.env as any, false)
      writeScript(filepath, cmd, tmp)
      return await createProcess(filepath, stdoutpath, stderrpath, { ...additionalOpts, ...opts }, customOpts)
      // end
    } else {
      // otherwise fallback to running a script on the local machine
      writeScript(filepath, script.$cmd, env)
      return await createProcess(filepath, stdoutpath, stderrpath, { ...additionalOpts, ...opts }, customOpts)
      // end
    }
  } catch (err: any) {
    const status = isDefined(err.status) ? err.status : err.code
    const message = err.message as string
    err.message = `Command failed with status code ${status}\n` +
      `Underlying error: "${message}"\n` +
      'Consider adding a "set -ve" to your $cmd to see which line errored.'
    throw err
  } finally {
    // cleanup files... (if enabled!)
    if (options.skipCleanup !== true) {
      await Promise.all(cleanupFiles.map(async (f) => {
        logger.debug(`Removing file - ${f}`)
        if (fs.existsSync(f)) {
          try {
            await fsPromises.unlink(f)
          } catch (err: any) {
            const message = err.message as string
            if (!message.startsWith('ENOENT: no such file or directory')) {
              logger.warn(`WARN: could not delete file - ${f} Reason: ${err.message as string}`)
            }
          }
        }
      }))
    }
  }
}
