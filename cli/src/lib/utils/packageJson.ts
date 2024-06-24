
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'
import { isString, type Dictionary } from '../types.js'
import logger from './logger.js'

export interface PackageJson {
  name: string
  description: string
  version: string
  scripts?: Dictionary<string>
}

export const findFileInAncestors = (dirname: string, filename: string, throwError: boolean = true): string => {
  // find filename
  let i = 0
  let filepath
  const maxDepth = 5
  for (; i < maxDepth; i++) {
    const tmp = path.resolve(dirname, '../'.repeat(i), filename)
    if (!fs.existsSync(tmp)) continue
    filepath = tmp
  }
  if (!isString(filepath)) {
    if (throwError) {
      throw new Error(`Could not find '${filename}' in parent directories! baseDir=${dirname}`)
    } else {
      logger.error(`Could not find '${filename}' in parent directories! baseDir=${dirname}`)
      return dirname
    }
  }
  return filepath
}

// all this just to load a json file... sigh ESM
export const loadRootPackageJsonSync = (): PackageJson => {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const filepath = findFileInAncestors(dirname, 'package.json', true)
  return loadPackageJsonSync(filepath)
}

export const loadPackageJsonSync = (packageJsonPath: string): PackageJson => {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
}
