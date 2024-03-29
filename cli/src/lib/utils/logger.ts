import { grey, red, yellow } from '../colour.js'
import { isString } from '../types.js'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export const isLogLevel = (level: string | undefined): level is LogLevel => {
  return ['error', 'warn', 'info', 'debug'].includes(level as string)
}

const logLevel = isLogLevel(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'debug'

const logError = ['debug', 'info', 'warn', 'error'].includes(logLevel)
const logWarn = ['debug', 'info', 'warn'].includes(logLevel)
const logInfo = ['debug', 'info'].includes(logLevel)
const logDebug = ['debug'].includes(logLevel)

// Level = E W I D
// error   Y - - -
// warn    Y Y - -
// info    Y Y Y -
// debug   Y Y Y Y

const error = (str: string | Error): void => {
  if (logError) {
    if (isString(str)) {
      console.error(red(str))
    } else {
      if (isString(str.stack)) {
        console.error(red(str.stack))
      } else {
        console.error(red(str.message))
      }
    }
  }
}

const warn = (str: any): void => {
  if (logWarn) console.error(yellow(str))
}

const info = (str: any): void => {
  if (logInfo) console.log(str)
}

const writeInfo = (str: any): void => {
  if (logDebug) process.stdout.write(str)
}

const debug = (str: any): void => {
  if (logDebug) console.error(grey(str))
}

const writeDebug = (str: any): void => {
  if (logDebug) process.stderr.write(grey(str))
}

export interface Logger {
  info: (str: any) => void
  debug: (str: any) => void
  warn: (str: any) => void
  error: (str: string | Error) => void
  writeInfo: (str: any) => void
  writeDebug: (str: any) => void
}

const logger: Logger = {
  error,
  warn,
  debug,
  info,
  writeDebug,
  writeInfo
}

export default logger
