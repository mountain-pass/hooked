import { KEYS, useExecuteScript, useGet } from "@/hooks/ReactQuery"
import { useFavourites } from "@/hooks/useFavourites"
import React from "react"
import { TbPlayerPlay, TbStar, TbStarFilled } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { Script, hasEnvScript, isDefined } from "../types"
import { useQueryClient } from "@tanstack/react-query"

export interface ScriptRowProps {
    name: string,
    disabled?: boolean,
    showFavourites?: boolean,
    scriptPath: string,
}

export const ScriptRow = ({ name, disabled, showFavourites, scriptPath }: ScriptRowProps) => {

    const queryClient = useQueryClient()
    const useExecute = useExecuteScript()
    const { isFavourite, toggleFavourite } = useFavourites()
    const isCurrentFavourite = React.useMemo(() => isFavourite(scriptPath), [isFavourite, scriptPath])
    const scriptConfig = useGet<Script>(`/api/scripts/${scriptPath}`, !disabled, 0)

    const requiresModal = React.useMemo(() => {
        return hasEnvScript(scriptConfig.data) && Object.values(scriptConfig.data.$env).some((v: any) => isDefined(v.$ask))
    }, [scriptConfig.data])

    console.log(`%cRe-rendering ScriptRow`, 'color:magenta;')

    const doExecute = () => {
        // if unresolved $env vars exist with $ask
        if (requiresModal) {
            queryClient.setQueryData(KEYS.showExecuteModal(), scriptConfig.data)
        } else {
            useExecute.mutateAsync({ scriptPath, env: {}, envNames: 'default'})
        }
    }

    return (
        <div className="flex max-w-full w-full">

            {/* Label */}
            <ListItem className="rounded-l">
                <TbPlayerPlay className="text-xl flex-shrink-0 text-blue-500" />
                <div className="truncate">{name}</div>
            </ListItem>

            {/* Favourite Star */}
            <BlackButton
                title="Toggle Favourite"
                size="lg"
                className={`flex-shrink-0 h-[54px] min-w-[54px] text-xl border-l-0 ${isCurrentFavourite ? 'text-yellow-400' : ''} ${showFavourites ? 'visible' : 'hidden' }`}
                onClick={() => toggleFavourite(scriptPath)}
            >
                {isCurrentFavourite ? <TbStarFilled /> : <TbStar />}
            </BlackButton>

            {/* Execute Button */}
            <BlackButton
                title="Execute Script"
                size="lg"
                className="rounded-r flex-shrink-0 h-[54px] min-w-[54px] sm:px-6 gap-3 border-l-0"
                onClick={doExecute}
                disabled={disabled}
            >
                <div className="max-sm:hidden px-2">Execute</div>
                <TbPlayerPlay className="text-green-500 text-xl sm:hidden" />
            </BlackButton>
        </div>
    )
}