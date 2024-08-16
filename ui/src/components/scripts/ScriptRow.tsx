import { UseFavouritesState } from "@/hooks/useFavourites"
import { TbPlayerPlay, TbStar, TbStarFilled } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { BaseScript, ExecuteScriptFunction, ExecuteScriptParam, Script, isDefined } from "../types"

export interface ScriptRowProps {
    name: string,
    script: ExecuteScriptParam,
    disableExecution?: boolean,
    favouritesState?: UseFavouritesState,
    executeScript: ExecuteScriptFunction
}

export const ScriptRow = ({ name, script, disableExecution, favouritesState, executeScript }: ScriptRowProps) => {
    return (
        <div className="flex max-w-full w-full">
            <ListItem className="rounded-l">
                <TbPlayerPlay className="text-xl flex-shrink-0 text-blue-500" />
                <div className="truncate">{name}</div>
            </ListItem>
            { isDefined(favouritesState) && <BlackButton
                title="Toggle Favourite"
                size="lg"
                className={`flex-shrink-0 h-[54px] min-w-[54px] text-xl border-l-0 ${favouritesState.isFavourite(script) ? 'text-yellow-400' : ''}`}
                onClick={() => favouritesState.toggleFavourite(script)}
            >
                {favouritesState.isFavourite(script) ? <TbStarFilled /> : <TbStar />}
            </BlackButton>
}
            <BlackButton
                title="Execute Script"
                size="lg"
                className="rounded-r flex-shrink-0 h-[54px] min-w-[54px] sm:px-6 gap-3 border-l-0"
                onClick={() => executeScript(script)}
                disabled={disableExecution}
            >
                <div className="max-sm:hidden px-2">Execute</div>
                <TbPlayerPlay className="text-green-500 text-xl sm:hidden" />
            </BlackButton>
        </div>
    )
}