import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
export const useGet = (url: string, bearerToken: string) => {
  console.debug('Use get script...', { url })
    const queryClient = useQueryClient()
    return useQuery({
      queryKey: [bearerToken, url],
      queryFn: () => {
        return fetch(url, { method: 'get', headers: { 'Authorization': `Bearer ${bearerToken}` } }).then(async res => {
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
    })
  }
  
  export const useExecuteScript = (baseUrl: string, bearerToken: string) => {
    console.debug('Use execute script...', { baseUrl })
    return useMutation({
      mutationKey: [bearerToken, baseUrl],
      mutationFn: (postData: any) => {
        const url = `${baseUrl}/api/run/${postData.envNames ?? 'default'}/${postData.scriptPath}`
        return fetch(url, {
          method: 'post',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
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