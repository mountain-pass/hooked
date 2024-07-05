import { useGet, useLogout, useReloadConfiguration } from "@/hooks/ReactQuery"
import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import React from "react"
import { TbLogout, TbReload } from "react-icons/tb"
import { Spinner } from "./Spinner"
import { BlackButton } from "./components"
import { LoginPrompt } from "./modals/Login"
import { Modal } from "./modals/Modal"
import { TopLevelScripts } from "./types"

export const Banner = () => {
    console.debug('Re-rendering Banner...')

    const [showLogin, setShowLogin] = React.useState(true)
    const isFetching = useIsFetching()
    const isMutating = useIsMutating()

    const useGetScripts = useGet<TopLevelScripts>(`/api/scripts`, true)
    const useReload = useReloadConfiguration()
    const doLogoout = useLogout()

    // if error, show login
    React.useEffect(() => {
        if (useGetScripts.isError) {
            setShowLogin(true)
        }
    }, [useGetScripts.isError])

    // if success, hide login
    React.useEffect(() => {
        if (useGetScripts.isSuccess) {
            setShowLogin(false)
        }
    }, [useGetScripts.isSuccess])

    return (<>

        {/* banner */}
        <div className="bg-blue-800 dark:bg-neutral-900 border-b border-neutral-700 text-white w-full flex justify-center">
            <div className="flex items-center justify-between w-full max-w-[1000px] p-4">
                <div className="flex flex-col gap-0">
                    <h1 className="truncate">hooked</h1>
                    <div className="text-xs text-neutral-500">{process.env.NEXT_PUBLIC_VERSION}</div>
                </div>
                <div className="flex gap-1 items-center justify-end">
                    <BlackButton
                        size="md"
                        className="bg-transparent rounded h-[46px] w-[46px] text-xl text-blue-500"
                        onClick={() => useReload.mutate()}
                        title="Reload Configuration"
                    >
                        <TbReload className="text-xl" />
                    </BlackButton>
                    <BlackButton
                        size="md"
                        className="bg-transparent rounded h-[46px] w-[46px] text-xl text-blue-500"
                        onClick={() => doLogoout.mutate()}
                        title="Logout"
                    >
                        <TbLogout className="text-xl" />
                    </BlackButton>
                </div>
            </div>
        </div >

        {/* global loading spinner */}
        <div className={`animate-fade-in-out ${isFetching > 0 || isMutating > 0 ? 'show' : ''} fixed bottom-0 right-0 pb-6 pr-6 flex items-end justify-end z-10`}>
            <Spinner className="w-10 h-10" />
        </div>

        {/* api key */}

        <Modal show={showLogin} setShow={setShowLogin} allowBackgroundClose={false}>
            {LoginPrompt}
        </Modal>

    </>)
}