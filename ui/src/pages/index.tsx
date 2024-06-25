import { BlackButton, GreyText, ListItem, OutputPre, Section } from "@/components/components";
import { useExecuteScript, useGet } from "@/hooks/ReactQuery";
import { useRunTimer } from "@/hooks/useRunTimer";
import React from "react";
import { isScript } from "../components/types";

export default function Home() {

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  // state

  const [searchScripts, setSearchScripts] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [showLogin, setShowLogin] = React.useState(true)

  // hooks

  const doExecute = useExecuteScript(baseUrl, apiKey)
  const runTimer = useRunTimer()

  const executeScript = (
    scriptPath: string,
    envNames: string = 'default',
    env: Record<string, string> = {}

  ) => {
    if (runTimer.isRunning) {
      runTimer.stop()
    }
    runTimer.start()
    doExecute.mutateAsync({ scriptPath, envNames, env }).then(() => {
      runTimer.stop()
    })
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
      console.log('Re-evaluating filteredScripts...')
      const parentPath: string[] = []
      const filters = searchScripts.trim().split(' ').filter(f => f.length > 0)
      let current: Record<string, any> = useScripts.data
      for (const filter of filters) {
        const filtered = Object.entries(current).filter(([name, groupOrJob]) => {
          return name.toLowerCase().startsWith(filter.toLowerCase())
        })
        if (filtered.length === 1) {
          parentPath.push(filter)
          const tmp = filtered[0][1]
          if (isScript(tmp)) {
            current = Object.fromEntries(filtered)
            break
          } else {
            current = tmp
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
      <div className="bg-blue-800 dark:bg-gray-500/25 text-white w-full flex justify-center">
        <div className="flex items-center justify-between w-full max-w-[1000px] p-4">
          <div className="flex flex-col gap-0">
            <h1 className="truncate">mountainpass / hooked</h1>
            <div className="text-xs">{process.env.NEXT_PUBLIC_VERSION}</div>
          </div>
          <BlackButton className="bg-transparent border-white/20" onClick={() => setShowLogin(ps => !ps)}>🔑</BlackButton>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 w-full px-4 pb-4 max-w-[1000px]">

        {/* Api Key */}
        <Section visible={showLogin}>
          <div className="w-full flex items-center justify-between">
            <h2>Api Key</h2>
            {useScripts.isSuccess
              ? <div>✅</div>
              : <div className="flex gap-3 items-center">
                <GreyText className="max-w-[200px] truncate">{useScripts.error?.message}</GreyText>
                <div>❌</div>
              </div>}
          </div>
          <input
            type="text"
            className="border border-gray-200 dark:border-gray-800 w-full p-4 text-sm"
            placeholder="API Key"
            spellCheck={false}
            value={apiKey}
            onKeyUp={e => setApiKey((e.target as any).value)}
            onChange={e => setApiKey((e.target as any).value)}
          />
        </Section>

        {/* Scripts */}
        <Section visible={useScripts.isSuccess}>
          <h2>Scripts</h2>
          <div className="flex">
            <input
              type="text"
              autoFocus
              className="border border-gray-200 dark:border-gray-800 w-full p-4 text-sm"
              placeholder="Search scripts"
              spellCheck={false}
              value={searchScripts}
              onChange={e => setSearchScripts(e.target.value)}
              // on escape key, clear searc
              onKeyDown={e => {
                if (e.key === 'Escape') setSearchScripts('')
              }}
            />
            <BlackButton className="text-xl min-w-[54px] border-l-0" onClick={() => setSearchScripts('')}>&times;</BlackButton>
          </div>

          <div className="flex flex-col gap-1 h-[400px] overflow-auto [color-scheme:light_dark]">
            {useScripts.isSuccess && Object.entries(filteredObjects.scripts).map(([name, groupOrJob]) => {
              if (isScript(groupOrJob)) {
                // executable Script
                return (
                  <ListItem key={name} className="justify-between">
                    <span className="truncate">{name}</span>
                    <BlackButton onClick={() => executeScript([...filteredObjects.parentPath, name.split(' ')[0]].join(' '))}>Execute</BlackButton>
                  </ListItem>
                )
              } else {
                // Script Group
                return (
                  <ListItem key={name} className="cursor-pointer" onClick={() => setSearchScripts(ps => `${ps} ${name}`.trim())}>
                    <span className="truncate">{name}</span>
                    <span className="text-gray-300">({Object.values(groupOrJob).length})</span>
                  </ListItem>
                )
              }
            })}
            {useScripts.isLoading && <GreyText>Loading...</GreyText>}
            {useScripts.isSuccess && Object.keys(useScripts.data).length === 0 && <GreyText>No data</GreyText>}
            {useScripts.isError && <GreyText>{useScripts.error.message}</GreyText>}
          </div>
        </Section>

        {/* Results */}
        <Section visible={doExecute.isSuccess || doExecute.isPending || doExecute.isError}>
          <div className="flex items-center justify-between">
            <h2>Results</h2>
            <div className="flex gap-3 items-center">
              <GreyText>{`${runTimer.isRunning ? Math.round(runTimer.durationMs / 1000) : runTimer.durationMs / 1000} seconds`}</GreyText>
              <BlackButton onClick={() => doExecute.reset()}>Clear</BlackButton>
            </div>
          </div>

          {/* shimmer */}
          <div className={`${doExecute.isPending ? 'visible' : 'hidden'} animate-pulse flex space-x-4`}>
            <div className="min-h-[44px] w-full bg-slate-200 dark:bg-slate-900"></div>
          </div>

          {/* results - success */}
          <OutputPre visible={doExecute.isSuccess} className="text-blue-700">
            {'Success:\n'}
            {(doExecute.data?.outputs ?? []).join('\n')}
          </OutputPre>

          {/* results - error */}
          <OutputPre visible={doExecute.isError} className="text-red-700">
            {'Error:\n'}
            {(doExecute.error as Error)?.message}
            {'\n'}
            {(doExecute.error as any)?.body?.message}
          </OutputPre>
        </Section>

      </div>
    </main>
  );
}
