import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRunTimer } from "./useRunTimer";
import { EnvironmentVariables, ExecuteScriptFunction, ExecuteScriptParam, Script, StdinScript, TopLevelScripts, hasEnvScript, isDefined, isStdinScript } from "@/components/types";
import React from "react";

export interface InvocationResult {
  /** True, if Script finished successfully. */
  success: boolean
  /** ISO Date when Script finished. */
  finishedAt: number
  /** The resolved Env Names. */
  envNames: string[]
  /** The resolved Script Path. */
  paths: string[]
  /** The resolved Environment Variables. */
  envVars: EnvironmentVariables
  /** Script outputs. */
  outputs: string[]
}

export interface TimedInvocationResult extends InvocationResult {
  isLoading: boolean
  durationMillis: number
}

export const KEYS = {
  // apiKey: () => ['apiKey'],
  getLastResults: () => ['doExecute', 'results', 'last']
}

export const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

export const useGetValue = (key: string[]) => {
  const queryClient = useQueryClient()
  return useQuery({ queryKey: key, queryFn: () => queryClient.getQueryData(key)})
}

const errorHandler = async (res: Response): Promise<any> => {
  const data = await res.json();
  if (res.status !== 200) {
    const error: any = new Error(data.message ?? `Request failed : ${res.statusText}`);
    error.body = data;
    throw error
  }
  return data
}

type LoginRequest = { username: string, password: string }

export const useLogin = () => {
  const queryClient = useQueryClient()
  return useMutation<any, Error, LoginRequest>({
    mutationFn: (postData: LoginRequest) => {
      return fetch(`${baseUrl}/auth/login`, {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      }).then(async res => await errorHandler(res))
      .catch(err => Promise.reject(new Error("Error contacting server")))
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    }
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation<any, Error>({
    mutationFn: () => {
      return fetch(`${baseUrl}/auth/logout`).then(async res => await errorHandler(res))
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    }
  })
}

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
export const useGet = <ResponseDataType>(url: string, enabled: boolean, refetchInterval = 10_000) => {
    const queryClient = useQueryClient()
    console.debug("useGet", url, enabled)
    return useQuery<any, Error, ResponseDataType, any[]>({
      queryKey: [url],
      queryFn: () => {
        return fetch(`${baseUrl}${url}`, {
          method: 'get',
          credentials: 'include',

        }).then(async res => {
          const newData = await errorHandler(res)
          const oldData = queryClient.getQueryData([url]);
          const newString = JSON.stringify(Object.entries(newData ?? {}).sort());
          const oldString = JSON.stringify(Object.entries(oldData ?? {}).sort());
          if (newString === oldString) {
            return oldData
          } else {
            // console.debug(`Using new data... <- ${url}`, { oldString, newString })
            return newData
          }
        })
      },
      refetchInterval,
      retry: 0,
      enabled
    })
  }

  /** Reloads the configuration on the backend. */
  export const useReloadConfiguration = () => {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: () => {
        return fetch(`${baseUrl}/api/reload`, {
          method: 'get',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        }).then(() => {
          queryClient.invalidateQueries()
        })
      }
    })
  }

  export type UseExecuteScriptParams = {
    scriptPath: string
    envNames?: string
    env: Record<string, string>
  }
  
  export const useExecuteScript = () => {
    const queryClient = useQueryClient()
    console.debug('Use execute script...', { baseUrl })
    return useMutation<any, Error, UseExecuteScriptParams>({
      mutationKey: [baseUrl],
      mutationFn: (postData: UseExecuteScriptParams) => {
        const url = `${baseUrl}/api/run/${postData.envNames ?? 'default'}/${postData.scriptPath}`
        const startTime = Date.now()
        queryClient.resetQueries({ queryKey: KEYS.getLastResults() })
        return fetch(url, {
          method: 'post',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData.env ?? {})
        }).then(async res => await errorHandler(res))
          .then(result => {
            queryClient.setQueryData(KEYS.getLastResults(), { ...result, durationMillis: Date.now() - startTime, isLoading: false})
          })
          .catch(error => {
            queryClient.setQueryData(KEYS.getLastResults(), { success: false, outputs: [error.message], durationMillis: Date.now() - startTime, isLoading: false})
          })
      }
    })
  }

  export type AskUserQuestionHandler = (config: StdinScript) => Promise<string>

  /** Wraps the execution in a timer, and ensure no parallel requests. */
  export const useExecuteScriptWrapper = (scripts: TopLevelScripts | undefined) => { //, askUserQuestionHandler: AskUserQuestionHandler) => {
    const queryClient = useQueryClient()
    const doExecute = useExecuteScript()
    const runTimer = useRunTimer()
    /** Attempts to run the script. */
    const executeScript: ExecuteScriptFunction = React.useCallback(async (scriptPath: ExecuteScriptParam) => {
      try {
        // find the config for the provided script...

        // TODO wrap this in backend call.
        let prev = scripts
        for (const path of scriptPath) {
          if (prev) {
            // look through children for a match
            const foundMatch = Object.entries(prev).find(([k, v]) => {
              if (k.toLowerCase().startsWith(path.toLowerCase())) {
                return v;
              }
            });
            prev = isDefined(foundMatch) ? foundMatch[1] : undefined
            if (isDefined(prev) && isDefined((prev as any).$cmd)) {
              break;
            }
          }
        }
        // scriptPath.forEach(path => {
        // })
        const scriptConfig = prev

        if (!isDefined(scriptConfig)) {
          throw new Error(`Script not found. Was it removed? - '${scriptPath}'`)
        } else {
          console.debug(`Found script config scriptPath="${JSON.stringify(scriptPath)}"`, scriptConfig, scripts)
        }
        
        // ask user for inputs...
        const env: Record<string, string> = {}
        if (hasEnvScript(scriptConfig)) {
          console.debug(`Running script modal: ${scriptPath}`)
          // show the modal
          queryClient.setQueryData(['showExecuteScriptModal'], scriptConfig)
        } else {
          console.debug(`Running script: ${scriptPath}`)

          // execute the script
          if (doExecute.isPending) {
              console.debug('Already executing script, skipping...')
              return
          }
          if (runTimer.isRunning) {
              runTimer.stop()
          }
          // runTimer.start()
          doExecute.mutateAsync({ scriptPath: scriptConfig!._scriptPath, envNames: 'default', env })
        }
      } catch (err: any) {
        queryClient.setQueryData(KEYS.getLastResults(), { success: false, durationMillis: 0, outputs: [err.message]})
      }
    }, [doExecute, runTimer, scripts, queryClient])

    return { executeScript, runTimer, doExecute}
  }

export const useClearLastResult = () => {
  const queryClient = useQueryClient()
  const clear = React.useCallback(() => {
    queryClient.resetQueries({ queryKey: KEYS.getLastResults() })
  }, [queryClient])
  return { clear }
}

export const useLastResult = () => {
  const queryClient = useQueryClient()
  return useQuery<TimedInvocationResult>({ queryKey: KEYS.getLastResults(), queryFn: () => {
    return queryClient.getQueryData(KEYS.getLastResults()) as TimedInvocationResult
  } })
}