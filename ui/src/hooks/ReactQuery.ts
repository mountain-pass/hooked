import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const KEYS = {
  apiKey: () => ['apiKey']
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
export const useGet = <ResponseDataType>(url: string, enabled: boolean) => {
  console.debug('Use get script...', { url })
    const queryClient = useQueryClient()
    const apiKey = useQuery({ queryKey: KEYS.apiKey() })
    return useQuery<any, Error, ResponseDataType, any[]>({
      queryKey: [apiKey.data, url],
      queryFn: () => {
        return fetch(`${baseUrl}${url}`, { method: 'get', headers: { 'Authorization': `Bearer ${apiKey.data}` } }).then(async res => {
          if (res.status !== 200) {
            const error: any = new Error(`Failed to fetch data from ${url}: ${res.statusText}`);
            error.body = await res.json();
            throw error
          }
          const newData = await res.json();
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
      // refetchInterval: 6000,
      retry: 0,
      enabled
    })
  }
  
  export const useExecuteScript = () => {
    console.debug('Use execute script...', { baseUrl })
    const apiKey = useQuery({ queryKey: KEYS.apiKey() })
    return useMutation({
      mutationKey: [apiKey.data, baseUrl],
      mutationFn: (postData: any) => {
        const url = `${baseUrl}/api/run/${postData.envNames ?? 'default'}/${postData.scriptPath}`
        return fetch(url, {
          method: 'post',
          headers: {
            'Authorization': `Bearer ${apiKey.data}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postData.env ?? {})
        }).then(async res => {
          if (res.status !== 200) {
            const error: any = new Error(`Failed to post data to ${url}: ${res.statusText}`);
            error.body = await res.json();
            console.error(error.message, error.body)
            throw error
          }
          return res.json()
        })
      }
    })
  }