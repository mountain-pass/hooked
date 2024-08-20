import { useGet, useLogout, useReloadConfiguration } from "@/hooks/ReactQuery"
import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import React from "react"
import { TbLogout, TbReload } from "react-icons/tb"
import { Spinner } from "./Spinner"
import { BlackButton } from "./components"
import { LoginPrompt } from "./modals/Login"
import { Modal } from "./modals/Modal"
import { AuthorisedUser, TopLevelScripts } from "./types"
import { GlobalSpinner } from "./GlobalSpinner"

export interface BannerProps {
    showRefresh?: boolean
    showLogout?: boolean
    adminOnly?: boolean
}

export const Banner = ({ showLogout = true, showRefresh = false, adminOnly = false }: BannerProps) => {
    console.debug('%cRe-rendering Banner', 'color:magenta;')

    const [showLogin, setShowLogin] = React.useState(true)

    const useGetScripts = useGet<AuthorisedUser>(`/api/me`, true, 0)
    const useReload = useReloadConfiguration()
    const doLogoout = useLogout()

    // if error, show login
    React.useEffect(() => {
        if (useGetScripts.isError) {
            setShowLogin(true)
        } else if (useGetScripts.isSuccess && adminOnly && !useGetScripts.data.accessRoles.includes('admin')) {
            setShowLogin(true)
        }
    }, [useGetScripts.isError, adminOnly, useGetScripts.data?.accessRoles, useGetScripts.isSuccess])

    // if success, hide login
    React.useEffect(() => {
        if (useGetScripts.isSuccess && (!adminOnly || useGetScripts.data.accessRoles.includes('admin'))) {
            setShowLogin(false)
        }
    }, [useGetScripts.isSuccess, adminOnly, useGetScripts.data?.accessRoles])

    return (<>

        {/* banner */}
        <div className="bg-blue-800 dark:bg-neutral-900 border-b border-neutral-700 text-white w-full flex justify-center">
            <div className="flex items-center justify-between w-full py-4 px-5">
                <div className="flex flex-col gap-0">
                    <h1 className="truncate">hooked</h1>
                    <div className="text-xs text-neutral-500">{process.env.NEXT_PUBLIC_VERSION}</div>
                </div>
                <div className="flex gap-1 items-center justify-end">
                    { showRefresh && <BlackButton
                        size="md"
                        className="bg-transparent rounded h-[46px] w-[46px] text-xl text-blue-500"
                        onClick={() => useReload.mutate()}
                        title="Reload Configuration"
                    >
                        <TbReload className="text-xl" />
                    </BlackButton>
}
                    { showLogout && <BlackButton
                        size="md"
                        className="bg-transparent rounded h-[46px] w-[46px] text-xl text-blue-500"
                        onClick={() => doLogoout.mutate()}
                        title="Logout"
                    >
                        <TbLogout className="text-xl" />
                    </BlackButton>
}
                </div>
            </div>
        </div >

        {/* global loading spinner */}
        <GlobalSpinner />

        {/* api key */}

        <Modal show={showLogin} setShow={setShowLogin} enableBackgroundClose={false}>
            {LoginPrompt}
        </Modal>

    </>)
}