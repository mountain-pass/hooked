import { UseFavouritesState } from "@/hooks/useFavourites"
import { TbPlayerPlay, TbStar, TbStarFilled } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"


export const ScriptRow = ({ name, scriptPath, disableExecution, favouritesState, executeScript }: {
    name: string,
    scriptPath: string,
    disableExecution?: boolean,
    favouritesState: UseFavouritesState,
    executeScript: (scriptPath: string) => void
}) => {

    const { toggleFavourite, isFavourite } = favouritesState

    return (
        <div className="flex max-w-full w-full">
            <ListItem className="rounded-l">
                <TbPlayerPlay className="text-xl flex-shrink-0 text-green-500" />
                <div className="truncate">{name}</div>
            </ListItem>
            <BlackButton
                size="lg"
                className={`flex-shrink-0 h-[54px] min-w-[54px] text-xl border-l-0 ${isFavourite(scriptPath) ? 'text-yellow-400' : ''}`}
                onClick={() => toggleFavourite(scriptPath)}
            >
                {isFavourite(scriptPath) ? <TbStarFilled /> : <TbStar />}
            </BlackButton>
            <BlackButton
                size="lg"
                className="rounded-r flex-shrink-0 h-[54px] min-w-[54px] sm:px-6 gap-3 border-l-0"
                onClick={() => executeScript(scriptPath)}
                disabled={disableExecution}
            >
                <div className="max-sm:hidden sm:visible">Execute</div>
                <TbPlayerPlay className="text-xl max-sm:visible sm:hidden" />
            </BlackButton>
        </div>
    )
}