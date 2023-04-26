import os from 'os'
import path from 'path'

export const resolvePath = (filepath: string): string => {
  if (filepath[0] === '~') {
    return path.join(os.homedir(), filepath.slice(1))
  } else {
    return path.resolve(filepath)
  }
}
