import { baseUrl, useGet } from '@/hooks/ReactQuery'
import React from 'react'
import { TbLockCancel, TbLockCheck } from 'react-icons/tb'
import { Input } from '../common/Input'
import { BlackButton, GreyText, Section } from '../components'
import { TopLevelScripts } from '../types'

/**
 * THIS IS THE OLD LOGIN SCREEN, WHERE WE USED TO USE AN API KEY (STILL PRESENT!)
 * @param param0 
 * @returns 
 */
export const ApiKeyPrompt = ({ showLogin, setShowLogin }: { showLogin: boolean, setShowLogin: (show: boolean) => void }) => {

    const [apiKey, setApiKey] = React.useState<string>('')
    const useGetScripts = useGet<TopLevelScripts>('meta', '/api/scripts', showLogin)

    // refs

    const refApiKey = React.useRef<HTMLInputElement>(null)

    // function

    const setApiKeyValue = (value: string) => {
        //     setApiKey(value)
        //     queryClient.setQueryData(KEYS.apiKey(), value)
    }

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
            className={`animate-fade-in-out ${showLogin ? 'show' : ''} flex items-start justify-center w-full h-full absolute top-0 left-0 right-0 bottom-0 backdrop-filter backdrop-blur-md`}
            onClick={() => setShowLogin(false)}
        >
            <div className="flex flex-col items-center justify-center p-4 w-full max-w-[500px]" onClick={(e) => e.stopPropagation()}>
                <Section visible={showLogin || useGetScripts.isError}>
                    <div className="w-full flex items-center justify-between">
                        <h2>Api Key</h2>
                        {useGetScripts.isSuccess
                            ? <TbLockCheck className="text-green-500 text-xl" />
                            : <div className="flex gap-3 items-center">
                                <GreyText className="max-w-[200px] truncate">{useGetScripts.error?.message}</GreyText>
                                <TbLockCancel className="text-red-500 text-xl cursor-pointer" onClick={() => {
                                    if (typeof window !== 'undefined') window.open(baseUrl, '_blank')
                                }} />
                            </div>}
                    </div>
                    <Input
                        ref={refApiKey}
                        placeholder="API Key"
                        value={apiKey}
                        onChangeValue={val => setApiKeyValue(val)}
                    />
                    <BlackButton
                        title="Login"
                        size="md"
                        disabled={!useGetScripts.isSuccess}
                        className="rounded"
                        onClick={() => setShowLogin(false)}
                    >
                        Close
                    </BlackButton>
                </Section >
            </div>
        </div>
    )
}