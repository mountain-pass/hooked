import { getLocalImportsCachePath } from '../defaults.js'
import { type TopLevelImports } from '../types.js'
import fileUtils from './fileUtils.js'
import logger from './logger.js'
import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

/**
 * Fetches the imports into the local cache.
 * @param imports
 * @param pull
 */
export const fetchImports = async (imports: TopLevelImports | undefined, pull: boolean = false): Promise<string[]> => {
  const removeOptionalTrailingQuestion = (url: string): string => url.replace(/\?$/, '')

  if (Array.isArray(imports) && imports.length > 0) {
    const remotes = imports.filter(i => i.startsWith('https://'))
    const localGlobs: string[] = imports.filter(i => !i.startsWith('https://')).map(str => fileUtils.resolveHomePath(str))
    let locals: string[] = []
    for (const globPath of localGlobs) {
      const tmp = await glob(globPath, { signal: AbortSignal.timeout(1000) })
      if (tmp.length > 0) {
        locals = [...locals, ...tmp]
      } else {
        logger.debug(`No files matching glob path "${globPath}", treating as file reference.`)
        locals = [...locals, globPath]
      }
    }
    const remotesCache = remotes.map(i => getLocalImportsCachePath(removeOptionalTrailingQuestion(path.basename(i))))
    const allLocal: string[] = []
    // const allLocal = imports.map(i => i.startsWith('https://')
    //   ? getLocalImportsCachePath(removeOptionalTrailingQuestion(path.basename(i)))
    //   : i)

    // force-pull remotes
    if (pull) {
      await Promise.all(remotes.map(async (url, i) => {
        logger.debug(`Downloading remote import: ${url} -> ${remotesCache[i]}`)
        try {
          await fileUtils.downloadFile(removeOptionalTrailingQuestion(url), remotesCache[i])
          allLocal.push(remotesCache[i])
        } catch (e) {
          if (url.endsWith('?')) {
            logger.debug(`Optional import file not found: ${url}`)
          } else {
            throw e
          }
        }
      }))
    } else {
      // pull remotes if not cached
      await Promise.all(remotes.map(async (url, i) => {
        if (!fs.existsSync(remotesCache[i])) {
          logger.debug(`Downloading remote import : ${url} -> ${remotesCache[i]}`)
          try {
            await fileUtils.downloadFile(removeOptionalTrailingQuestion(url), remotesCache[i])
            allLocal.push(remotesCache[i])
          } catch (e) {
            if (url.endsWith('?')) {
              logger.debug(`Optional import file not found: ${url}`)
            } else {
              throw e
            }
          }
        } else {
          allLocal.push(remotesCache[i])
        }
      }))
    }
    // report (and error) if any required files are missing
    const missingLocalFiles = locals.filter(i => !fs.existsSync(fileUtils.resolvePath(removeOptionalTrailingQuestion(i))))
    const notMissingLocalFiles = locals.filter(i => fs.existsSync(fileUtils.resolvePath(removeOptionalTrailingQuestion(i))))
      .map(i => removeOptionalTrailingQuestion(i))
    const missingOptionalFiles = missingLocalFiles.filter(i => i.endsWith('?'))
    const missingRequiredFiles = missingLocalFiles.filter(i => !i.endsWith('?'))
    for (const file of missingOptionalFiles) {
      logger.debug(`Optional import file not found: ${file}`)
    }
    if (missingRequiredFiles.length > 0) {
      throw new Error(`Missing import files: ${missingLocalFiles.join(', ')}`)
    }
    allLocal.push(...notMissingLocalFiles)
    return allLocal
  } else {
    logger.debug('No imports found')
    return []
  }
}
