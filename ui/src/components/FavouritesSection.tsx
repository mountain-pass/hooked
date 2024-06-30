import React from "react"
import { BlackButton, GreyText, ListItem, Section } from "./components"
import { TbStar, TbStarFilled } from "react-icons/tb"
import { useFavourites } from "@/hooks/useFavourites"


export const FavouritesSection = ({ visible, fade, executeScript }: { visible: boolean, fade: boolean, executeScript: (scriptPath: string) => void }) => {

    const { favourites, isFavourite, toggleFavourite } = useFavourites()

    return (
        <Section visible={visible} fade={fade} className="flex-1">
            <h2>Favourites</h2>
            {(favourites ?? []).length === 0 && <GreyText>No favourites.</GreyText>}
            {(favourites ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                    {(favourites ?? [])
                        .map((scriptPath, i) => {
                            return (
                                <div className="flex" key={scriptPath}>
                                    <ListItem className="justify-between">
                                        <span className="truncate">{scriptPath}</span>
                                    </ListItem>
                                    <BlackButton
                                        className={`h-[54px] min-w-[54px] ml-[-1px] text-xl ${isFavourite(scriptPath) ? 'text-yellow-400' : ''}`}
                                        onClick={() => toggleFavourite(scriptPath)}
                                    >
                                        {isFavourite(scriptPath) ? <TbStarFilled /> : <TbStar />}
                                    </BlackButton>
                                    <BlackButton className="h-[54px] ml-[-1px] px-6" onClick={() => executeScript(scriptPath)}>Execute</BlackButton>
                                </div>
                            )
                        })}
                </div>
            )}
        </Section>)
}