
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'
import { isString, type Dictionary } from '../types.js'

export interface PackageJson {
  name: string
  description: string
  version: string
  scripts?: Dictionary<string>
}

export const findFileInAncestors = (dirname: string, filename: string): string => {
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
    throw new Error(`Could not find ${filename} in parent directories! baseDir=${dirname}`)
  }
  return filepath
}

// all this just to load a json file... sigh ESM
export const loadRootPackageJsonSync = (): PackageJson => {
  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const filepath = findFileInAncestors(dirname, 'package.json')
  return loadPackageJsonSync(filepath)
}

export const loadPackageJsonSync = (packageJsonPath: string): PackageJson => {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
}
