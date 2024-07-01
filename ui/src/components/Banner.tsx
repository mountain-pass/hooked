import { TbLockCancel, TbLockCheck } from "react-icons/tb"
import { BlackButton } from "./components"
import { useGet } from "@/hooks/ReactQuery"
import React from "react"
import { ApiKeyPrompt } from "./ApiKeyPrompt"
import { TopLevelScripts } from "./types"


export const Banner = () => {
    console.debug('Re-rendering Banner...')

    const [showLogin, setShowLogin] = React.useState(true)

    const useGetScripts = useGet<TopLevelScripts>(`/api/scripts`, true)

    const setShowLoginGuard = React.useCallback((show: boolean) => {
        if (useGetScripts.isSuccess) {
            setShowLogin(show)
        }
    }, [useGetScripts.isSuccess, setShowLogin])

    return (<>

        {/* banner */}
        <div className="bg-blue-800 dark:bg-neutral-900 border-b border-neutral-700 text-white w-full flex justify-center">
            <div className="flex items-center justify-between w-full max-w-[1000px] p-4">
                <div className="flex flex-col gap-0">
                    <h1 className="truncate">mountainpass / hooked</h1>
                    <div className="text-xs text-neutral-500">{process.env.NEXT_PUBLIC_VERSION}</div>
                </div>
                <BlackButton
                    className="bg-transparent rounded h-[46px] w-[46px] text-xl text-blue-500"
                    disabled={useGetScripts.isError}
                    size="md"
                    onClick={() => setShowLogin(ps => !ps)}
                >
                    {useGetScripts.isSuccess
                        ? <TbLockCheck className="text-green-500 text-xl" />
                        : <TbLockCancel className="text-red-500 text-xl" />}
                </BlackButton>
            </div>
        </div>

        {/* api key */}
        <ApiKeyPrompt showLogin={showLogin} setShowLogin={setShowLoginGuard} />
    </>)
}