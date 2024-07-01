import React from 'react'
import { BlackButton, GreyText, Section } from './components'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KEYS, useGet } from '@/hooks/ReactQuery'
import { TbLockCancel, TbLockCheck } from 'react-icons/tb'
import { TopLevelScripts } from './types'

export const ApiKeyPrompt = ({ showLogin, setShowLogin }: { showLogin: boolean, setShowLogin: (show: boolean) => void }) => {
    const queryClient = useQueryClient()
    const apiKey = useQuery<string>({ queryKey: KEYS.apiKey() })
    const useGetScripts = useGet<TopLevelScripts>('/api/scripts', showLogin)

    // refs
    const refApiKey = React.useRef<HTMLInputElement>(null)

    // focus input on showLogin
    React.useEffect(() => {
        console.debug('Focus check...')
        if (showLogin) {
            refApiKey.current?.focus()
        }
    }, [showLogin])

    /** Hide 'api-key' if successful */
    React.useEffect(() => {
        console.debug('Checking showLogin...')
        setShowLogin(!useGetScripts.isSuccess)
    }, [useGetScripts.isSuccess, setShowLogin])

    return (

        <div
            className={`${showLogin ? 'visible' : 'hidden'} flex items-start justify-center w-full h-full absolute top-0 left-0 right-0 bottom-0 backdrop-filter backdrop-blur-sm`}
            onClick={() => setShowLogin(false)}
        >
            <div className="flex flex-col items-center justify-center p-4 w-full max-w-[1000px]" onClick={(e) => e.stopPropagation()}>
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
                        className="border border-gray-200 dark:border-neutral-700 placeholder-neutral-500 w-full p-4 text-sm"
                        placeholder="API Key"
                        spellCheck={false}
                        value={apiKey.data}
                        onKeyUp={e => queryClient.setQueryData(KEYS.apiKey(), () => ((e.target as any).value))}
                        onChange={e => queryClient.setQueryData(KEYS.apiKey(), () => ((e.target as any).value))}
                    />
                    <div className="flex justify-end">
                        <BlackButton size="md" disabled={!useGetScripts.isSuccess} className="rounded" onClick={() => setShowLogin(false)}>Close</BlackButton>
                    </div>
                </Section >
            </div>
        </div>
    )
}