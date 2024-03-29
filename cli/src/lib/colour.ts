// colour shortcuts for cyan, yellow, red and grey.
export const cyan = (text: string): string => `\x1b[36m${text}\x1b[0m`
export const yellow = (text: string): string => `\x1b[33m${text}\x1b[0m`
export const red = (text: string): string => `\x1b[31m${text}\x1b[0m`
export const grey = (text: string): string => `\x1b[90m${text}\x1b[0m`
