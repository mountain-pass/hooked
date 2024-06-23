
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

// all this just to load a json file... sigh ESM
export const loadRootPackageJsonSync = (): PackageJson => {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  // find package.json
  let i = 0
  let filepath
  for (; i < 5; i++) {
    const tmp = path.resolve(dirname, '../'.repeat(i), 'package.json')
    if (!fs.existsSync(tmp)) continue
    filepath = tmp
  }
  if (!isString(filepath)) {
    throw new Error(`Could not find package.json in parent directories! baseDir=${dirname}`)
  }
  return loadPackageJsonSync(filepath)
}

export const loadPackageJsonSync = (packageJsonPath: string): PackageJson => {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
}
