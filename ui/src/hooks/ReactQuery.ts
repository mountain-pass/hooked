import { QueryFilters, QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  getCategory: (category: UseGetCagtegories) => ['useGet', category],
  getCategoryAndUrl: (category: UseGetCagtegories, url: string) => ['useGet', category, url],
  getLastResults: () => ['doExecute', 'results', 'last'],
  executeScript: () => ['doExecute', 'results', 'current'],
  showExecuteModal: () => ['showExecuteScriptModal'],
  cachedFavourites: () => ['favourites']
}

export const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

/**
 * Generic watcher for a query cache value.
 */
export const useCacheValue = <DataType>(queryKey: QueryKey & QueryFilters) => {
  const queryClient = useQueryClient()
  return useQuery<DataType>({
    queryKey,
    queryFn: () => queryClient.getQueryData(queryKey) as DataType
  })
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

type UseGetCagtegories = 'auth' | 'meta' | 'execute' | 'display'

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
export const useGet = <ResponseDataType>(category: UseGetCagtegories, url: string, enabled: boolean, refetchInterval = 10_000) => {
    const queryClient = useQueryClient()
    if (enabled) {
      console.debug(`%cuseGet('${url}')`, "color:grey;")
    }
    return useQuery<any, Error, ResponseDataType, any[]>({
      queryKey: KEYS.getCategoryAndUrl(category, url),
      queryFn: ({ signal }) => {
        return fetch(`${baseUrl}${url}`, {
          method: 'get',
          credentials: 'include',
          signal
        }).then(async res => {
          // checks the data for equality, and if so, returns the old object, which prevents trigger a refresh.
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
      staleTime: refetchInterval * 2,
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
    return useMutation<any, Error, UseExecuteScriptParams>({
      mutationKey: [KEYS.executeScript()],
      mutationFn: (postData: UseExecuteScriptParams) => {
        const url = `${baseUrl}/api/run/${postData.envNames ?? 'default'}/${postData.scriptPath}`
        console.log(`%cuseExecuteScript('${url}')`, 'color:yellow;')
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
            const invResult: TimedInvocationResult = { ...result, durationMillis: Date.now() - startTime, isLoading: false };
            queryClient.setQueryData(KEYS.getLastResults(), invResult)
            // refetch display values
            queryClient.invalidateQueries({ queryKey: KEYS.getCategory('display') })
            return result
          })
          .catch(error => {
            const invResult: TimedInvocationResult = { success: false, outputs: [error.message], durationMillis: Date.now() - startTime, finishedAt: Date.now(), envNames: [], envVars: {}, isLoading: false, paths: [] };
            queryClient.setQueryData(KEYS.getLastResults(), invResult)
          })
      },
      retry: 0,
      // networkMode: "always"
    })
  }

export const useClearLastResult = () => {
  const queryClient = useQueryClient()
  const clear = React.useCallback(() => {
    queryClient.resetQueries({ queryKey: KEYS.getLastResults() })
  }, [queryClient])
  return { clear }
}

export const useLastResult = () => {
  return useCacheValue<TimedInvocationResult>(KEYS.getLastResults())
}