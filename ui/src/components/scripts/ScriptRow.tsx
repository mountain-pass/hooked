import { TbPlayerPlay, TbStar } from "react-icons/tb"
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
        <div className="flex">
            <ListItem>
                <TbPlayerPlay className="text-xl text-green-500" />
                <span className="truncate">{name}</span>
            </ListItem>
            <BlackButton
                className={`h-[54px] min-w-[54px] ml-[-1px] text-xl ${isFavourite(scriptPath) ? 'text-yellow-400' : ''}`}
                onClick={() => toggleFavourite(scriptPath)}
            >
                <TbStar />
            </BlackButton>
            <BlackButton className="h-[54px] ml-[-1px] px-6 gap-3" onClick={() => executeScript(scriptPath)}>
                Execute
            </BlackButton>
        </div>
    )
}