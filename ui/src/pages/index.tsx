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
  const useScripts = useGet(`${baseUrl}/api/scripts`, apiKey)

  interface FilteredObjects {
    parentPath: string[]
    scripts: Record<string, any>
  }

  // filters the visible scripts
  const filteredObjects: FilteredObjects = React.useMemo(() => {
    if (useScripts.isSuccess) {
      console.log('Reevaluating filteredScripts...')
      const parentPath: string[] = []
      const filters = searchScripts.split(' ').filter(f => f.length > 0)
      let current: Record<string, any> = useScripts.data
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
  }, [useScripts, searchScripts])

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
            {useScripts.isSuccess
              ? <span>✅</span>
              : <span><span className="text-gray-400">{useScripts.error?.message}</span> ❌</span>}
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
        <section className={`${useScripts.isSuccess ? 'visible' : 'hidden'} border card-border w-full p-4 flex flex-col gap-4`}>
          <h2>Scripts</h2>
          <input
            type="search"
            autoFocus
            className="border card-border w-full p-4 text-sm"
            placeholder="Search scripts"
            spellCheck={false}
            value={searchScripts}
            onChange={e => setSearchScripts(e.target.value)}
          />
          <div className="flex flex-col gap-1 max-h-[400px] overflow-auto [color-scheme:light_dark]">
            {useScripts.isSuccess && Object.entries(filteredObjects.scripts).map(([name, groupOrJob]) => {
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
            {useScripts.isLoading && <i className="text-gray-400 text-sm">Loading...</i>}
            {useScripts.isSuccess && Object.keys(useScripts.data).length === 0 && <i className="text-gray-400 text-sm">No data</i>}
            {useScripts.isError && <i className="text-gray-400 text-sm">{useScripts.error.message}</i>}
          </div>
        </section>

        {/* Results */}
        <section className={`border card-border w-full p-4 flex flex-col gap-4 ${doExecute.isSuccess || doExecute.isPending || doExecute.isError ? 'visible' : 'hidden'}`}>
          <h2>Results</h2>
          {/* shimmer */}
          <div className={`${doExecute.isPending ? 'visible' : 'hidden'} animate-pulse flex space-x-4`}>
            <div className="min-h-[44px] w-full bg-slate-200 dark:bg-slate-900"></div>
          </div>
          {/* results - success */}
          <pre className={`${doExecute.isSuccess ? 'visible' : 'hidden'} text-sm text-blue-700 p-3 bg-slate-200 dark:bg-slate-900 overflow-auto [color-scheme:light_dark]`}>
            {doExecute.data?.outputs.join('\n')}
          </pre>
          {/* results - error */}
          <pre className={`${doExecute.isError ? 'visible' : 'hidden'} text-sm text-red-700 bg-slate-200 dark:bg-slate-900 overflow-auto [color-scheme:light_dark]`}>
            {(doExecute.error as Error)?.message}
          </pre>
        </section>

        <i className="text-gray-400 text-sm">{process.env.NEXT_PUBLIC_VERSION}</i>
      </div>
    </main>
  );
}
