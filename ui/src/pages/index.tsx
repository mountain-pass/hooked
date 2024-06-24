import { useQuery } from "@tanstack/react-query";
import React from "react";

const useGet = (url: string, bearerToken: string) => {
  return useQuery({
    queryKey: [url],
    queryFn: () => fetch(url, { method: 'get', headers: { Authorization: `Bearer ${bearerToken}` } }).then(res => res.json()),
    refetchInterval: 6000,
    retry: 0,
  })
}

export default function Home() {

  const baseUrl = 'https://localhost:4000'
  const bearerToken = 'ABCD'

  const envs = useGet(`${baseUrl}/api/env`, bearerToken)
  const triggers = useGet(`${baseUrl}/api/triggers`, bearerToken)
  const scripts = useGet(`${baseUrl}/api/scripts`, bearerToken)

  const [searchScripts, setSearchScripts] = React.useState('')

  const filteredScripts: Record<string, any> = React.useMemo(() => {
    if (scripts.isSuccess) {
      const filters = searchScripts.split(' ').filter(f => f.length > 0)
      let current = scripts.data
      for (const filter of filters) {
        const filtered = Object.entries(current).filter(([name, groupOrJob]) => {
          return name.toLowerCase().startsWith(filter.toLowerCase())
        })
        if (filtered.length === 1) {
          current = filtered[0][1]
        }
      }
      return current

    }
    return []
  }, [scripts, searchScripts])

  return (
    <main className="flex flex-col items-center gap-4">
      <div className="text-xl banner-colour text-white w-full p-6">
        <h1>mountainpass / hooked</h1>
      </div>
      <div className="flex flex-col items-center gap-4 w-full px-4 pb-4">

        <section className="border card-border w-full p-4 flex flex-col gap-4">
          <div className="text-lg">Environments</div>
          <div className="flex flex-col gap-2">
            {envs.isSuccess && Object.entries(envs.data).map(([name, env]) => {
              return <div className="border card-border w-full px-4 py-4 text-sm">{name}</div>
            })}
            {envs.isLoading && <i className="text-gray-400 text-sm">Loading...</i>}
            {envs.isSuccess && Object.keys(envs.data).length === 0 && <i className="text-gray-400 text-sm">No data</i>}
            {envs.isError && <i className="text-gray-400 text-sm">{envs.error.message}</i>}
          </div>
        </section>

        {/* <section className="border card-border w-full p-4 flex flex-col gap-4">
          <div className="text-lg">Triggers</div>
          <div className="flex flex-col gap-2">
            {triggers.isSuccess && Object.entries(triggers.data).map(([name, trigger]) => {
              return <div className="border card-border w-full px-4 py-4 text-sm">{name}</div>
            })}
          </div>
        </section> */}

        <section className="border card-border w-full p-4 flex flex-col gap-4">
          <div className="text-lg">Scripts</div>
          {/* <div className="text-sm"><button className="px-3 py-1 border border-gray-200 hover:border-gray-400">Top</button></div> */}
          <input
            type="search"
            className="border border-gray-200 w-full px-4 py-4 text-sm"
            placeholder="Search scripts"
            value={searchScripts}
            onChange={e => setSearchScripts(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            {scripts.isSuccess && Object.entries(filteredScripts).map(([name]) => {
              return <button className="border border-gray-200 hover:border-gray-400 w-full px-4 py-4 text-sm text-left" onClick={() => setSearchScripts(ps => `${ps} ${name}`.trim())}>{name}</button>
            })}
            {scripts.isLoading && <i className="text-gray-400 text-sm">Loading...</i>}
            {scripts.isSuccess && Object.keys(scripts.data).length === 0 && <i className="text-gray-400 text-sm">No data</i>}
            {scripts.isError && <i className="text-gray-400 text-sm">{scripts.error.message}</i>}
          </div>
        </section>
      </div>
    </main>
  );
}
