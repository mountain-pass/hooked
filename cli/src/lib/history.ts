
import fs from 'fs'
import { HISTORY_PATH } from './defaults.js'
import { type SuccessfulScript } from './types.js'

/**
 * Prints a history of previous commands.
 */
export const printHistory = (): void => {
  const filepath = HISTORY_PATH
  const lines = fs.readFileSync(filepath, 'utf-8').split(/\r?\n/g)
  for (const line of lines) {
    if (line.length > 0) {
      const script = JSON.parse(line)
      console.log(displaySuccessfulScript(script, true))
    }
  }
}

/**
 * Formats the given timestamp as a local ISO string.
 * @param ts
 * @param tzoffsetMinutes
 * @returns
 */
export const formatLocalISOString = (ts: number, tzoffsetMinutes = new Date().getTimezoneOffset()): string => {
  const tzoffsetMs = tzoffsetMinutes * 60000 // offset in milliseconds
  const localISOTime = (new Date(ts - tzoffsetMs)).toISOString().slice(0, -5) +
  (tzoffsetMinutes > 0 ? '-' : '+') +
  (`0${Math.abs(tzoffsetMinutes / 60)}`).slice(-2) +
  ':' +
  (`0${Math.abs(tzoffsetMinutes % 60)}`).slice(-2)
  return localISOTime
}

/**
 * Show the rerunnable script.
 * @param script
 * @param showTimestamp
 * @returns
 */
export const displaySuccessfulScript = (
  script: SuccessfulScript,
  showTimestamp = false,
  tzoffsetMinutes = new Date().getTimezoneOffset()
): string => {
  const { ts, scriptPath, envNames, stdin } = script
  const timestamp = formatLocalISOString(ts, tzoffsetMinutes)
  const scriptstr = scriptPath.map(s => s.includes(' ') ? `"${s}"` : s).join(' ')
  const envstr = envNames.length > 1 ? `--env ${envNames.join(',')}` : ''
  const stdinstr = Object.keys(stdin).length > 0 ? `--stdin '${JSON.stringify(stdin)}'` : ''
  return `${showTimestamp ? `${timestamp}: ` : ''}j ${scriptstr} ${envstr} ${stdinstr}`
}

/**
 * Append a line onto the end of a file.
 * @param script
 */
export const addHistory = (script: SuccessfulScript): void => {
  const filepath = HISTORY_PATH
  fs.writeFileSync(
    filepath,
    JSON.stringify(script) + '\n',
    { flag: 'a', encoding: 'utf-8' }
  )
}
