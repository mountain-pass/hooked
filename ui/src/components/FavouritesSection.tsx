import { useFavourites } from "@/hooks/useFavourites"
import { GreyText, Section } from "./components"
import { ScriptRow } from "./scripts/ScriptRow"


export const FavouritesSection = ({ visible, executeScript }: { visible: boolean, executeScript: (scriptPath: string) => void }) => {

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
                                scriptPath={scriptPath}
                                favouritesState={favouritesState}
                                executeScript={executeScript}
                            />
                        })}
                </div>
            )}
        </Section>)
}