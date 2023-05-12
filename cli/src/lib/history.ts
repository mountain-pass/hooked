
import fs from 'fs'
import { HISTORY_PATH } from './defaults.js'
import { type SuccessfulScript } from './types.js'
import { cyan } from './colour.js'
import logger from './utils/logger.js'

/**
 * Retrieves the history log of previous commands.
 * @param max (default: 20) - max number of records to fetch
 * @returns
 */
export const fetchHistory = (max: number = 20): SuccessfulScript[] => {
  const filepath = HISTORY_PATH
  if (fs.existsSync(filepath)) {
    const lines = fs.readFileSync(filepath, 'utf-8').split(/\r?\n/g)
    return lines
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SuccessfulScript)
      .sort((a, b) => b.ts - a.ts)
      .filter((_, i) => i < max)
  } else {
    return []
  }
}

export const fetchHistoryAsRunnableLogs = (max: number = 20): string[] => {
  const history = fetchHistory(max)
  return history.map(script => displaySuccessfulScript(script, true))
}

/**
 * Prints a history of previous commands.
 */
export const printHistory = (max: number = 20): void => {
  const history = fetchHistoryAsRunnableLogs(max)
  if (history.length > 0) {
    history.forEach((line) => { logger.info(line) })
  } else {
    logger.debug('No history found.')
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
  const scriptstr = scriptPath.map(s => (/[^\w]/).test(s) ? `"${s}"` : s).join(' ')
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
