import { useFavourites } from "@/hooks/useFavourites"
import { GreyText, Section } from "./components"
import { ScriptRow } from "./scripts/ScriptRow"
import { KEYS, useCacheValue } from "@/hooks/ReactQuery"

export interface FavouritesSectionProps {
    visible: boolean
}

export const FavouritesSection = ({ visible }: FavouritesSectionProps) => {

    const useFavourites = useCacheValue<string[]>(KEYS.cachedFavourites())

    return (
        <Section visible={visible} naked={true} className="flex-1">
            {/* <h2 className="max-sm:hidden sm:visible">Favourites</h2> */}
            {(useFavourites.data ?? []).length === 0 && <GreyText>No favourites.</GreyText>}
            {(useFavourites.data ?? []).length > 0 && (
                <div className="flex flex-col gap-1 max-w-full w-full">
                    {(useFavourites.data ?? [])
                        .map((scriptPath, i) => {
                            return <ScriptRow
                                key={scriptPath}
                                name={scriptPath}
                                scriptPath={scriptPath}
                                showFavourites={true}
                                disabled={false}
                            />
                        })}
                </div>
            )}
        </Section>)
}