import os from 'os'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { type IncomingMessage } from 'http'
import { isDefined } from '../types.js'
import logger from './logger.js'
import defaults from '../defaults.js'

/**
 * Resolves a path.
 * - if starts with tilde, prepend the home directory
 * - if starts with forward slash, treat as absolute
 * - if not starts with forward slash, prepend HOOKED_DIR
 * @param filepath
 * @returns
 */
export const resolvePath = (filepath: string): string => {
  let tmp = filepath
  if (tmp[0] === '~') {
    tmp = path.join(os.homedir(), filepath.slice(1))
  } else if (tmp[0] !== '/') {
    tmp = path.join(defaults.getDefaults().HOOKED_DIR, filepath)
  }
  // is the resolve here necessary?
  return path.resolve(tmp)
}

export const getDirnameFilename = (filepath: string): string => {
  return new URL(filepath, import.meta.url).toString()
}

/**
 * Downloads a file to the given path.
 * @param url
 * @param destination
 * @param debugLogs
 * @param timeoutMs
 * @returns
 */
export const downloadFile = async (url: string, destination: string, timeoutMs: number = 30000): Promise<any> => {
  return await new Promise((resolve, reject) => {
    logger.debug(`Downloading ${url} -> ${destination}...`)
    // ensure parent directory exists!
    if (!fs.existsSync(path.dirname(destination))) {
      fs.mkdirSync(path.dirname(destination), { recursive: true })
    }
    const request = https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, (res: IncomingMessage) => {
      const code = isDefined(res) && isDefined(res.statusCode) ? res.statusCode : -1
      if (code < 200 || code >= 300) {
        request.destroy()
      }
      request.setTimeout(timeoutMs, function () {
        request.destroy()
      })
      fs.unlinkSync(destination)
      const fileStream = fs.createWriteStream(destination)
      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close((err) => {
          if (isDefined(err)) {
            reject(err)
          } else {
            resolve(true)
          }
        })
      })
    }).on('error', (err) => {
      fs.unlink(destination, () => {})
      reject(err)
    })
  })
}

/**
 * Removes old .env and .tmp files.
 */
export const cleanupOldTmpFiles = (): void => {
  fs.readdirSync('./').forEach((file) => {
    if (/^\.env-.*\.txt/.test(file) || /^\.tmp-.*\.sh/.test(file)) {
      fs.unlinkSync(file)
    }
  })
}

export default {
  resolvePath,
  downloadFile
}
