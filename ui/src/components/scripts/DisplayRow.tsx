import { UseFavouritesState } from "@/hooks/useFavourites"
import { TbPlayerPlay, TbStar, TbStarFilled, TbActivityHeartbeat } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { isDefined, isString } from "../types"
import { useExecuteScript, useGet } from "@/hooks/ReactQuery"
import { useRunTimer } from "@/hooks/useRunTimer"
import React from "react"
import { useInterval } from "@/hooks/useInterval"


export const DisplayRow = ({ name, scriptPath }: {
    name: string,
    scriptPath: string,
}) => {
    
    const doExecute = useExecuteScript()
    const [lastResult, setLastResult] = React.useState<any>()

    /** Attempts to run the script. */
    const executeScript = React.useCallback((scriptPath: string) => {
        if (doExecute.isPending) {
            console.debug('Already executing script, skipping...')
            return
        }
        doExecute.mutateAsync({ scriptPath, envNames: 'default', env: {} as Record<string, string> })
            .then((result) => {
                setLastResult(result)
            })
    }, [doExecute])

    useInterval(() => {
        if (isString(scriptPath)) {
            executeScript(scriptPath)
        }
    }, 30_000)

    React.useEffect(() => {
        if (isString(scriptPath)) {
            executeScript(scriptPath)
        }
    }, [scriptPath])

    return (
        <div className="flex max-w-full w-full">
            <ListItem className="rounded-l max-sm:flex-col" fixedHeight={false}>
                <div className="flex gap-2">
                    <TbActivityHeartbeat className="text-xl flex-shrink-0 text-red-500" />
                    <span className="truncate self-center">{name}</span>
                </div>
                <div className="flex w-full overflow-auto">
                    <pre className="max-sm:m-auto sm:ml-auto">{lastResult?.outputs.join('\n')}</pre>
                </div>
            </ListItem>
        </div>
    )
}