import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRunTimer } from "./useRunTimer";
import { ExecuteScriptFunction, ExecuteScriptParam, Script, StdinScript, TopLevelScripts, hasEnvScript, isDefined, isStdinScript } from "@/components/types";
import React from "react";

export const KEYS = {
  // apiKey: () => ['apiKey'],
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
    console.debug('Use execute script...', { baseUrl })
    return useMutation<any, Error, UseExecuteScriptParams>({
      mutationKey: [baseUrl],
      mutationFn: (postData: UseExecuteScriptParams) => {
        const url = `${baseUrl}/api/run/${postData.envNames ?? 'default'}/${postData.scriptPath}`
        return fetch(url, {
          method: 'post',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData.env ?? {})
        }).then(async res => await errorHandler(res))
      }
    })
  }

  export type AskUserQuestionHandler = (config: StdinScript) => Promise<string>

  /** Wraps the execution in a timer, and ensure no parallel requests. */
  export const useExecuteScriptWrapper = (scripts: TopLevelScripts | undefined) => { //, askUserQuestionHandler: AskUserQuestionHandler) => {
    const doExecute = useExecuteScript()
    const runTimer = useRunTimer()
    /** Attempts to run the script. */
    const executeScript: ExecuteScriptFunction = React.useCallback(async (scriptPath: ExecuteScriptParam) => {
        // find the config for the provided script...
        let prev = scripts
        scriptPath.forEach(path => {
          if (prev) {
            const entryPair = Object.entries(prev).find(([k, v]) => {
              if (k.toLowerCase().startsWith(path.toLowerCase())) {
                return v;
              }
            });
            prev = isDefined(entryPair) ? entryPair[1] : undefined
          }
        })
        const scriptConfig = prev
        
        // ask user for inputs...
        const env: Record<string, string> = {}
        if (hasEnvScript(scriptConfig)) {
          for (const [k, v] of Object.entries(scriptConfig.$env)) {
            if (isStdinScript(v)) {
              const answer = prompt(v.$ask);
              if (!answer) return
              env[k] = answer
            }
          }
        }

        // execute the script
        console.debug(`Found script config scriptPath="${JSON.stringify(scriptPath)}"`, scriptConfig, scripts)
        if (doExecute.isPending) {
            console.debug('Already executing script, skipping...')
            return
        }
        if (runTimer.isRunning) {
            runTimer.stop()
        }
        runTimer.start()
        doExecute.mutateAsync({ scriptPath: scriptConfig!._scriptPath, envNames: 'default', env })
            .then(runTimer.stop)
            .catch(runTimer.stop)
    }, [doExecute, runTimer, scripts])

    return { executeScript, runTimer, doExecute}
  }