import os from 'os'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { type IncomingMessage } from 'http'
import { isDefined } from '../types.js'
import { cyan } from '../colour.js'
import logger from './logger.js'

/**
 * Resolves a path, including home directories.
 * @param filepath
 * @returns
 */
export const resolvePath = (filepath: string): string => {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1))
  } else {
    return path.resolve(filepath)
  }
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
    const request = https.get(url, (res: IncomingMessage) => {
      const code = isDefined(res) && isDefined(res.statusCode) ? res.statusCode : -1
      if (code < 200 || code >= 300) {
        request.destroy()
      }
      request.setTimeout(timeoutMs, function () {
        request.destroy()
      })
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
export const cleanUpOldScripts = (): void => {
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
