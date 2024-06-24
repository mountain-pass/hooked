import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { isScript } from "../utils/types";

/**
 * Fetches data from the given URL using a GET request with the given bearer token.
 * @param url 
 * @param bearerToken 
 * @returns 
 */
const useGet = (url: string, bearerToken: string) => {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: [bearerToken, url],
    queryFn: () => {
      return fetch(url, { method: 'get', headers: { 'Authorization': `Bearer ${bearerToken}` } }).then(async res => {
        if (res.status !== 200) {
          throw new Error(`Failed to fetch data from ${url}: ${res.statusText}`)
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
    refetchInterval: 6000,
    retry: 0,
  })
}

const useExecuteScript = (baseUrl: string, bearerToken: string) => {
  return useMutation({
    // mutationKey: [bearerToken, url],
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
          throw new Error(`Failed to post data to ${url}: ${res.statusText}`)
        }
        return res.json()
      })
    }
  })
}

export default function Home() {

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  const [searchScripts, setSearchScripts] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [showLogin, setShowLogin] = React.useState(true)

  const doExecute = useExecuteScript(baseUrl, apiKey)

  const executeScript = (
    scriptPath: string,
    envNames: string = 'default',
    env: Record<string, string> = {}

  ) => {
    doExecute.mutate({ scriptPath, envNames, env })
  }

  // const envs = useGet(`${baseUrl}/api/env`, bearerToken)
  // const triggers = useGet(`${baseUrl}/api/triggers`, bearerToken)
  const scripts = useGet(`${baseUrl}/api/scripts`, apiKey)

  interface FilteredObjects {
    parentPath: string[]
    scripts: Record<string, any>
  }

  // filters the visible scripts
  const filteredObjects: FilteredObjects = React.useMemo(() => {
    if (scripts.isSuccess) {
      console.log('Reevaluating filteredScripts...')
      const parentPath: string[] = []
      const filters = searchScripts.split(' ').filter(f => f.length > 0)
      let current: Record<string, any> = scripts.data
      for (const filter of filters) {
        const filtered = Object.entries(current).filter(([name, groupOrJob]) => {
          return name.toLowerCase().startsWith(filter.toLowerCase())
        })
        if (filtered.length === 1) {
          parentPath.push(filter)
          current = filtered[0][1]
          if (isScript(current)) {
            break
          }
        } else {
          current = Object.fromEntries(filtered)
        }
      }
      return { parentPath, scripts: current }
    }
    return { parentPath: [], scripts: {} }
  }, [scripts, searchScripts])

  return (
    <main className="flex flex-col items-center gap-4">
      <div className="banner-colour text-white w-full flex justify-center">
        <div className="flex items-center justify-between w-full max-w-[1000px] p-4">
          <h1>mountainpass / hooked</h1>
          <button className="block p-2 w-[40px] h-[40px] bg-blue-900 hover:bg-white/10 dark:bg-black dark:border card-border" onClick={() => setShowLogin(ps => !ps)}>🔑</button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 w-full px-4 pb-4 max-w-[1000px]">

        {/* Login */}
        <section className={`border card-border w-full p-4 flex flex-col gap-4 ${showLogin ? 'visible' : 'hidden'}`}>
          <div className="w-full flex items-center justify-between">
            <h2>Api Key</h2>
            {/* <span>🔑</span> */}
          </div>
          <input
            type="text"
            className="border border-gray-200 w-full p-4 text-sm"
            placeholder="API Key"
            spellCheck={false}
            value={apiKey}
            onKeyUp={e => setApiKey((e.target as any).value)}
            onChange={e => setApiKey((e.target as any).value)}
          />
        </section>

        {/* Scripts */}
        <section className="border card-border w-full p-4 flex flex-col gap-4">
          <h2>Scripts</h2>
          <input
            type="search"
            className="border card-border w-full p-4 text-sm"
            placeholder="Search scripts"
            spellCheck={false}
            value={searchScripts}
            onChange={e => setSearchScripts(e.target.value)}
          />
          <div className="flex flex-col gap-1 max-h-[400px] overflow-scroll">
            {scripts.isSuccess && Object.entries(filteredObjects.scripts).map(([name, groupOrJob]) => {
              if (isScript(groupOrJob)) {
                return (
                  <div key={name} className="border card-border w-full px-4 py-3 text-sm text-left flex gap-2 items-center justify-between hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="truncate">{name}</span>
                    <button className="border card-border px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10" onClick={() => executeScript([...filteredObjects.parentPath, name.split(' ')[0]].join(' '))}>Execute</button>
                  </div>
                )
              } else {
                return (
                  <button key={name} className="border card-border w-full p-4 text-sm text-left flex gap-2 items-center hover:bg-black/5 dark:hover:bg-white/5"
                    onClick={() => setSearchScripts(ps => `${ps} ${name}`.trim())}>
                    <span className="truncate">{name}</span>
                    <span className="text-gray-300">({Object.values(groupOrJob).length})</span>
                  </button>
                )
              }
            })}
            {scripts.isLoading && <i className="text-gray-400 text-sm">Loading...</i>}
            {scripts.isSuccess && Object.keys(scripts.data).length === 0 && <i className="text-gray-400 text-sm">No data</i>}
            {scripts.isError && <i className="text-gray-400 text-sm">{scripts.error.message}</i>}
          </div>
        </section>

        {/* Results */}
        <section className={`border card-border w-full p-4 flex flex-col gap-4 ${doExecute.isSuccess || doExecute.isPending || doExecute.isError ? 'visible' : 'hidden'}`}>
          <h2>Results</h2>
          {/* spinner */}
          <div role="status" className={`flex items-center gap-3 ${doExecute.isPending ? 'visible' : 'hidden'}`}>
            <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
            <span>Loading...</span>
          </div>
          {/* results - success */}
          <pre className={`${doExecute.isSuccess ? 'visible' : 'hidden'} text-sm text-blue-700 p-3 bg-black/5 dark:bg-white/5 overflow-scroll`}>
            {doExecute.data?.outputs.join('\n')}
          </pre>
          {/* results - error */}
          <pre className={`${doExecute.isError ? 'visible' : 'hidden'} text-sm text-red-700 overflow-scroll`}>
            {(doExecute.error as Error)?.message}
          </pre>
        </section>

        <i className="text-gray-400 text-sm">{process.env.NEXT_PUBLIC_VERSION}</i>
      </div>
    </main>
  );
}
