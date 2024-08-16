import { useFavourites } from "@/hooks/useFavourites"
import { GreyText, Section } from "./components"
import { ExecuteScriptFunction } from "./types"
import { ScriptRow } from "./scripts/ScriptRow"

export interface FavouritesSectionProps {
    visible: boolean
    executeScript: ExecuteScriptFunction
}

export const FavouritesSection = ({ visible, executeScript }: FavouritesSectionProps) => {

    const favouritesState = useFavourites()
    const { favourites } = favouritesState

    return (
        <Section visible={visible} naked={true} className="flex-1">
            {/* <h2 className="max-sm:hidden sm:visible">Favourites</h2> */}
            {(favourites ?? []).length === 0 && <GreyText>No favourites.</GreyText>}
            {(favourites ?? []).length > 0 && (
                <div className="flex flex-col gap-1 max-w-full w-full">
                    {(favourites ?? [])
                        .map((scriptPath, i) => {
                            return <ScriptRow
                                key={scriptPath}
                                name={scriptPath}
                                script={scriptPath.split(' ')}
                                favouritesState={favouritesState}
                                executeScript={executeScript}
                            />
                        })}
                </div>
            )}
        </Section>)
}