import { grey, red, yellow } from '../colour.js'
import { isString } from '../types.js'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export const isLogLevel = (level: string | undefined): level is LogLevel => {
  return ['error', 'warn', 'info', 'debug'].includes(level as string)
}

let logLevel = 'info' // isLogLevel(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'info'

const logError = (): boolean => ['debug', 'info', 'warn', 'error'].includes(logLevel)
const logWarn = (): boolean => ['debug', 'info', 'warn'].includes(logLevel)
const logInfo = (): boolean => ['debug', 'info'].includes(logLevel)
const logDebug = (): boolean => ['debug'].includes(logLevel)

const setLogLevel = (level: LogLevel | string | undefined): void => {
  if (isLogLevel(level)) {
    logLevel = level
  } else if (isString(level)) {
    throw new Error(`Invalid log level: ${level}`)
  }
}

// Level = E W I D
// error   Y - - -
// warn    Y Y - -
// info    Y Y Y -
// debug   Y Y Y Y

const error = (str: string | Error): void => {
  if (logError()) {
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
  if (logWarn()) console.error(yellow(str))
}

const info = (str: any): void => {
  if (logInfo()) console.log(str)
}

const writeInfo = (str: any): void => {
  if (logDebug()) process.stdout.write(str)
}

const debug = (str: any): void => {
  if (logDebug()) console.error(grey(str))
}

const writeDebug = (str: any): void => {
  if (logDebug()) process.stderr.write(grey(str))
}

export interface Logger {
  log: (str: any) => void
  info: (str: any) => void
  debug: (str: any) => void
  warn: (str: any) => void
  error: (str: string | Error) => void
  writeInfo: (str: any) => void
  writeDebug: (str: any) => void
  setLogLevel: (level: LogLevel | string | undefined) => void
}

const logger: Logger = {
  error,
  warn,
  debug,
  log: info,
  info,
  writeDebug,
  writeInfo,
  setLogLevel
}

export default logger
