import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    const error: any = new Error(data.message ?? `Failed to post data to /auth/login: ${res.statusText}`);
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

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
export const useGet = <ResponseDataType>(url: string, enabled: boolean) => {
    const queryClient = useQueryClient()
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
      refetchInterval: 10000,
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
  
  export const useExecuteScript = () => {
    console.debug('Use execute script...', { baseUrl })
    return useMutation({
      mutationKey: [baseUrl],
      mutationFn: (postData: any) => {
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