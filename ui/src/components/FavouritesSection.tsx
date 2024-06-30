import { useFavourites } from "@/hooks/useFavourites"
import { GreyText, Section } from "./components"
import { ScriptRow } from "./scripts/ScriptRow"


export const FavouritesSection = ({ visible, fade, executeScript }: { visible: boolean, fade: boolean, executeScript: (scriptPath: string) => void }) => {

    const favouritesState = useFavourites()
    const { favourites } = favouritesState

    return (
        <Section visible={visible} fade={fade} className="flex-1">
            <h2>Favourites</h2>
            {(favourites ?? []).length === 0 && <GreyText>No favourites.</GreyText>}
            {(favourites ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                    {(favourites ?? [])
                        .map((scriptPath, i) => {
                            return <ScriptRow
                                key={scriptPath}
                                name={scriptPath}
                                scriptPath={scriptPath}
                                favouritesState={favouritesState}
                                executeScript={executeScript}
                            />
                        })}
                </div>
            )}
        </Section>)
}