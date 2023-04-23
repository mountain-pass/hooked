
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'
import { type Dictionary } from '../types'

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
  return loadPackageJsonSync(path.resolve(dirname, '../../../package.json'))
}

export const loadPackageJsonSync = (packageJsonPath: string): PackageJson => {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
}
