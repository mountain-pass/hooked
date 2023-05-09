import os from 'os'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { type IncomingMessage } from 'http'
import { isDefined } from '../types.js'
import { cyan } from '../colour.js'

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
export const downloadFile = async (url: string, destination: string, debugLogs: boolean = false, timeoutMs: number = 30000): Promise<any> => {
  return await new Promise((resolve, reject) => {
    if (debugLogs) console.log(cyan(`Downloading ${url} -> ${destination}...`))
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

export default {
  resolvePath,
  downloadFile
}
