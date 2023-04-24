import child_process from 'child_process'
import fs from 'fs'
import path from 'path'
import { yellow } from '../colour.js'

export const executeCmd = (
  multilineCommand: string,
  opts: any = undefined
): string => {
  try {
    const filepath = path.resolve('.tmp.sh')
    fs.writeFileSync(filepath, multilineCommand, 'utf-8')
    fs.chmodSync(filepath, 0o755)
    const output = child_process.execSync(filepath, opts)
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    } else {
      console.warn(yellow(`warn: Could not delete ${filepath}`))
    }
    return output !== null ? output.toString() : ''
  } catch (err: any) {
    const status = err.status as string
    const message = err.message as string
    err.message = `Command failed with status code ${status}\n` +
    `Underlying error: "${message}"\n` +
    'Consider adding a "set -ve" to your $cmd to see which line errored.'
    throw err
  }
}
