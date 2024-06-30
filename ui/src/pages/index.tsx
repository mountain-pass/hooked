import { FavouritesSection } from "@/components/FavouritesSection";
import { ScriptsSection } from "@/components/ScriptsSection";
import { BlackButton, GreyText, OutputPre, Section } from "@/components/components";
import { useExecuteScript, useGet } from "@/hooks/ReactQuery";
import { Tabs } from "@/hooks/Tabs";
import { useRunTimer } from "@/hooks/useRunTimer";
import { useTabs } from "@/hooks/useTabs";
import React from "react";
import { TbLockCancel, TbLockCheck } from "react-icons/tb";

export default function Home() {
  console.debug('Re-rendering Home...')

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  // refs

  const refApiKey = React.useRef<HTMLInputElement>(null)
  const refSearchScript = React.useRef<HTMLInputElement>(null)

  // state
  const [apiKey, setApiKey] = React.useState('')
  const [showLogin, setShowLogin] = React.useState(true)

  // react-query

  const doExecute = useExecuteScript(baseUrl, apiKey)
  // const envs = useGet(`${baseUrl}/api/env`, bearerToken)
  // const triggers = useGet(`${baseUrl}/api/triggers`, bearerToken)
  const useGetScripts = useGet(`${baseUrl}/api/scripts`, apiKey)

  // hooks

  const runTimer = useRunTimer()
  type TabTypes = 'Scripts' | 'Favourites'
  const tabs = useTabs<TabTypes>(['Scripts', 'Favourites'], 'Scripts')

  // effects

  // focus input on showLogin
  React.useEffect(() => {
    console.debug('Focus check...')
    if (showLogin) {
      refApiKey.current?.focus()
    } else {
      refSearchScript.current?.focus()
    }
  }, [showLogin])

  /** Hide 'api-key' if successful after 1.5 seconds. */
  React.useEffect(() => {
    console.debug('Checking showLogin...')
    setShowLogin(!useGetScripts.isSuccess)
  }, [useGetScripts.isSuccess])

  // functions

  /** Attempts to run the script. */
  const executeScript = (
    scriptPath: string
  ) => {
    if (runTimer.isRunning) {
      runTimer.stop()
    }
    if (!showLogin) {
      runTimer.start()
      doExecute.mutateAsync({ scriptPath, envNames: 'default', env: {} as Record<string, string> })
        .then(runTimer.stop)
        .catch(runTimer.stop)
    }
  }

  return (
    <main className="flex flex-col items-center gap-4">

      {/* banner */}
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

      {/* main */}
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
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            className="border border-gray-200 dark:border-gray-800 w-full p-4 text-sm"
            placeholder="API Key"
            spellCheck={false}
            value={apiKey}
            onKeyUp={e => setApiKey((e.target as any).value)}
            onChange={e => setApiKey((e.target as any).value)}
          />
        </Section>

        {/* Tabs */}
        <Section naked={true} visible={useGetScripts.isSuccess} fade={showLogin}>
          <Tabs {...tabs} />
        </Section>

        {/* Favourites */}
        <FavouritesSection visible={tabs.currentTab === 'Favourites' && useGetScripts.isSuccess} fade={showLogin} executeScript={executeScript} />

        {/* Scripts */}
        <ScriptsSection visible={tabs.currentTab === 'Scripts' && useGetScripts.isSuccess} fade={showLogin} executeScript={executeScript} baseUrl={baseUrl} apiKey={apiKey} />

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
          <OutputPre visible={doExecute.isSuccess} className="text-blue-500">
            {'Success:\n'}
            {(doExecute.data?.outputs ?? []).join('\n')}
          </OutputPre>

          {/* results - error */}
          <OutputPre visible={doExecute.isError} className="text-red-500">
            {'Error:\n'}
            {(doExecute.error as Error)?.message}
            {'\n'}
            {(doExecute.error as any)?.body?.message}
          </OutputPre>
        </Section>

        {/* <pre className={`${process.env.NODE_ENV === 'production' ? 'hidden' : 'visible'} text-purple-500 bg-purple-500/20 w-full p-4 border border-purple-500`}>
          env = {process.env.NODE_ENV}
        </pre> */}
      </div>
    </main >
  );
}
