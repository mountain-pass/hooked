import { TbPlayerPlay, TbStar, TbStarFilled } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { UseFavouritesState, useFavourites } from "@/hooks/useFavourites"


export const ScriptRow = ({ name, scriptPath, favouritesState, executeScript }: {
    name: string,
    scriptPath: string,
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
                className={`flex-shrink-0 h-[54px] min-w-[54px] ml-[-1px] text-xl ${isFavourite(scriptPath) ? 'text-yellow-400' : ''}`}
                onClick={() => toggleFavourite(scriptPath)}
            >
                {isFavourite(scriptPath) ? <TbStarFilled /> : <TbStar />}
            </BlackButton>
            <BlackButton
                size="lg"
                className="rounded-r flex-shrink-0 h-[54px] min-w-[54px] ml-[-1px] sm:px-6 gap-3"
                onClick={() => executeScript(scriptPath)}
            >
                <div className="max-sm:hidden sm:visible">Execute</div>
                <TbPlayerPlay className="text-xl max-sm:visible sm:hidden" />
            </BlackButton>
        </div>
    )
}