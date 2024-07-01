
export const isJobsSerialScript = (script: any): boolean => {
    return Array.isArray((script as any).$jobs_serial)
}

export const isWritePathScript = (script: any): boolean => {
    return typeof (script as any).$path === 'string'
}

export const isCmdScript = (script: any): boolean => {
    return typeof (script as any).$cmd === 'string'
}

export const isDockerCmdScript = (script: any): boolean => {
    return typeof (script as any).$cmd === 'string' && typeof (script as any).$image === 'string'
}

export const isSSHCmdScript = (script: any): boolean => {
    return typeof (script as any).$cmd === 'string' && typeof (script as any).$ssh === 'string'
}

export const isEnvScript = (script: any): boolean => {
    return typeof (script as any).$env !== 'undefined'
}

export const isResolveScript = (script: any): boolean => {
    return typeof (script as any).$resolve === 'string'
}

export const isStdinScript = (script: any): boolean => {
    return typeof (script as any).$ask === 'string'
}

export const isInternalScript = (script: any): boolean => {
    return typeof (script as any).$internal === 'function'
}

export const isScript = (script: any): boolean => {
    return (typeof script === 'object' || typeof script === 'function') &&
        script !== null &&
        (
            isWritePathScript(script) ||
            isCmdScript(script) ||
            isJobsSerialScript(script) ||
            isStdinScript(script) ||
            isEnvScript(script) ||
            isResolveScript(script) ||
            isInternalScript(script)
        )
}


export interface CronTrigger {
    $cron: string
    $job: string
  }
  
  export interface Triggers extends Record<string, CronTrigger> {}