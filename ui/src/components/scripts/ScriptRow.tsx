import { UseFavouritesState } from "@/hooks/useFavourites"
import { TbPlayerPlay, TbStar, TbStarFilled } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { isDefined } from "../types"


export const ScriptRow = ({ name, scriptPath, disableExecution, favouritesState, executeScript }: {
    name: string,
    scriptPath: string,
    disableExecution?: boolean,
    favouritesState?: UseFavouritesState,
    executeScript: (scriptPath: string) => void
}) => {

    return (
        <div className="flex max-w-full w-full">
            <ListItem className="rounded-l">
                <TbPlayerPlay className="text-xl flex-shrink-0 text-green-500" />
                <div className="truncate">{name}</div>
            </ListItem>
            { isDefined(favouritesState) && <BlackButton
                title="Toggle Favourite"
                size="lg"
                className={`flex-shrink-0 h-[54px] min-w-[54px] text-xl border-l-0 ${favouritesState.isFavourite(scriptPath) ? 'text-yellow-400' : ''}`}
                onClick={() => favouritesState.toggleFavourite(scriptPath)}
            >
                {favouritesState.isFavourite(scriptPath) ? <TbStarFilled /> : <TbStar />}
            </BlackButton>
}
            <BlackButton
                title="Execute Script"
                size="lg"
                className="rounded-r flex-shrink-0 h-[54px] min-w-[54px] sm:px-6 gap-3 border-l-0"
                onClick={() => executeScript(scriptPath)}
                disabled={disableExecution}
            >
                <div className="max-sm:hidden visible px-2">Execute</div>
                <TbPlayerPlay className="text-xl max-sm:visible hidden" />
            </BlackButton>
        </div>
    )
}