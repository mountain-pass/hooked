import { BlackButton, GreyText, ListItem, OutputPre, Section } from "@/components/components";
import { useExecuteScript, useGet } from "@/hooks/ReactQuery";
import { useRunTimer } from "@/hooks/useRunTimer";
import React from "react";
import { isScript } from "../components/types";
import { TbLockCheck, TbLock, TbLockCancel, TbArrowBackUp, TbX } from "react-icons/tb";
import { useTabs } from "@/hooks/useTabs";
import { Tabs } from "@/hooks/Tabs";

export default function Home() {

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  // refs
  const refApiKey = React.useRef<HTMLInputElement>(null)
  const refSearchScript = React.useRef<HTMLInputElement>(null)

  // state

  const [searchScripts, setSearchScripts] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [showLogin, setShowLogin] = React.useState(true)

  // hooks

  const doExecute = useExecuteScript(baseUrl, apiKey)
  const runTimer = useRunTimer()

  type TabTypes = 'Scripts' | 'Favourites'
  const tabs = useTabs<TabTypes>(['Scripts', 'Favourites'], 'Scripts')

  /** Jumps up to the parent script (removes the child). */
  const setSearchScriptsToParent = () => {
    setSearchScripts(ps => ps.trim().split(' ').slice(0, -1).join(' '))
    refSearchScript.current?.focus()
  }

  /** Clears the search scripts. */
  const clearSearchScripts = () => {
    setSearchScripts('')
    refSearchScript.current?.focus()
  }

  /** Selects the script group. */
  const selectScriptGroup = (name: string) => {
    // NOTE: trailing space is important, for next selection
    setSearchScripts(ps => `${ps.trim()} ${name.trim()} `)
    refSearchScript.current?.focus()
  }

  /** Attempts to run the script. */
  const executeScript = (
    scriptPath: string,
    envNames: string = 'default',
    env: Record<string, string> = {}

  ) => {
    if (runTimer.isRunning) {
      runTimer.stop()
    }
    if (!showLogin) {
      runTimer.start()
      doExecute.mutateAsync({ scriptPath, envNames, env })
        .then(runTimer.stop)
        .catch(runTimer.stop)
    }
  }

  // const envs = useGet(`${baseUrl}/api/env`, bearerToken)
  // const triggers = useGet(`${baseUrl}/api/triggers`, bearerToken)
  const useGetScripts = useGet(`${baseUrl}/api/scripts`, apiKey)

  // effects

  // focus input on showLogin
  React.useEffect(() => {
    if (showLogin) {
      refApiKey.current?.focus()
    } else {
      refSearchScript.current?.focus()
    }
  }, [showLogin])

  // hide 'api-key' if successful after 1.5 seconds
  const refTimer = React.useRef<NodeJS.Timeout>()
  React.useEffect(() => {
    if (useGetScripts.isSuccess) {
      if (typeof refTimer.current !== 'undefined') clearTimeout(refTimer.current)
      refTimer.current = setTimeout(() => setShowLogin(false), 500)
    }
    return () => {
      if (typeof refTimer.current !== 'undefined') clearTimeout(refTimer.current)
    }
  }, [useGetScripts.isSuccess])

  interface FilteredObjects {
    parentPath: string[]
    scripts: Record<string, any>
  }

  // filters the visible scripts
  const filteredObjects: FilteredObjects = React.useMemo(() => {
    if (useGetScripts.isSuccess) {
      console.log('Re-evaluating filteredScripts...')
      const parentPath: string[] = []
      const filters = searchScripts.trim().split(' ').filter(f => f.length > 0)
      let current: Record<string, any> = useGetScripts.data
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
  }, [useGetScripts, searchScripts])

  return (
    <main className="flex flex-col items-center gap-4">
      <div className="bg-blue-800 dark:bg-gray-500/25 text-white w-full flex justify-center">
        <div className="flex items-center justify-between w-full max-w-[1000px] p-4">
          <div className="flex flex-col gap-0">
            <h1 className="truncate">mountainpass / hooked</h1>
            <div className="text-xs">{process.env.NEXT_PUBLIC_VERSION}</div>
          </div>
          <BlackButton
            className="bg-transparent border-white/20 text-xl text-blue-500"
            disabled={useGetScripts.isError}
            onClick={() => setShowLogin(ps => !ps)}
          >
            {useGetScripts.isSuccess
              ? <TbLockCheck className="text-green-500 text-xl" />
              : <TbLockCancel className="text-red-500 text-xl" />}
          </BlackButton>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 w-full px-4 pb-4 max-w-[1000px]">

        {/* Api Key */}
        <Section visible={showLogin || useGetScripts.isError}>
          <div className="w-full flex items-center justify-between">
            <h2>Api Key</h2>
            {useGetScripts.isSuccess
              ? <TbLockCheck className="text-green-500 text-xl" />
              : <div className="flex gap-3 items-center">
                <GreyText className="max-w-[200px] truncate">{useGetScripts.error?.message}</GreyText>
                <TbLockCancel className="text-red-500 text-xl" />
              </div>}
          </div>
          <input
            ref={refApiKey}
            type="text"
            className="border border-gray-200 dark:border-gray-800 w-full p-4 text-sm"
            placeholder="API Key"
            spellCheck={false}
            value={apiKey}
            onKeyUp={e => setApiKey((e.target as any).value)}
            onChange={e => setApiKey((e.target as any).value)}
          />
        </Section>

        <Section naked={true} visible={useGetScripts.isSuccess} fade={showLogin}>
          <Tabs {...tabs} />
        </Section>

        {/* Scripts List */}
        <Section visible={tabs.currentTab === 'Scripts' && useGetScripts.isSuccess} fade={showLogin} className="flex-1">
          <h2>Scripts</h2>
          <div className="flex">
            <input
              ref={refSearchScript}
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
            <BlackButton className="text-xl min-w-[54px] ml-[-1px]" onClick={() => setSearchScriptsToParent()}>
              <TbArrowBackUp className="text-xl" />
            </BlackButton>
            <BlackButton className="text-xl min-w-[54px] ml-[-1px]" onClick={() => clearSearchScripts()}>
              <TbX className="text-xl" />
            </BlackButton>
          </div>

          <div className="flex flex-col gap-1 h-[30dvh] overflow-auto [color-scheme:light_dark]">
            {useGetScripts.isSuccess && Object.entries(filteredObjects.scripts).map(([name, groupOrJob]) => {
              if (isScript(groupOrJob)) {
                // executable Script
                return (
                  <ListItem key={name} className="justify-between">
                    <span className="truncate">{name}</span>
                    <BlackButton onClick={() => executeScript(groupOrJob._scriptPath)}>Execute</BlackButton>
                  </ListItem>
                )
              } else {
                // Script Group
                return (
                  <ListItem key={name} className="cursor-pointer" onClick={() => selectScriptGroup(name)}>
                    <span className="truncate">{name}</span>
                    <span className="text-gray-300">({Object.values(groupOrJob).length})</span>
                  </ListItem>
                )
              }
            })}
            {useGetScripts.isLoading && <GreyText>Loading...</GreyText>}
            {useGetScripts.isSuccess && Object.keys(useGetScripts.data).length === 0 && <GreyText>No data</GreyText>}
            {useGetScripts.isError && <GreyText>{useGetScripts.error.message}</GreyText>}
          </div>
        </Section>

        {/* Results */}
        <Section visible={useGetScripts.isSuccess && (doExecute.isSuccess || doExecute.isPending || doExecute.isError)} fade={showLogin} className="flex-1">
          <div className="flex items-center justify-between">
            <h2>Results</h2>
            <div className="flex gap-3 items-center">
              <GreyText>{`${(runTimer.durationMs / 1000).toFixed(3)} seconds`}</GreyText>
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

        <pre className={`${process.env.NODE_ENV === 'production' ? 'hidden' : 'visible'} text-purple-500 bg-purple-500/20 w-full p-4 border border-purple-500`}>
          env = {process.env.NODE_ENV}
        </pre>
      </div>
    </main>
  );
}
