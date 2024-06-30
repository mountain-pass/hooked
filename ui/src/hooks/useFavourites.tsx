import React from "react"
import { useLocalStorageBackedStateV4 } from "./useLocalStorageBackedStateV4"

export const useFavourites = () => {

    const [favourites, setFavourites] = useLocalStorageBackedStateV4<string[]>(`favourites`, [])
    // const [favourites, setFavourites] = React.useState<string[]>([])

    const isFavourite = React.useCallback((scriptPath: string): boolean => {
        return (favourites ?? []).includes(scriptPath) ?? false
    }, [favourites])

    const toggleFavourite = React.useCallback((scriptPath: string) => {
        setFavourites((ps: string[]) => {
            if (ps.indexOf(scriptPath) !== -1) {
                return ps.filter(f => f !== scriptPath)
                    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            } else {
                return [...ps, scriptPath]
                    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            }
        })
    }, [setFavourites])

    return { favourites, isFavourite, toggleFavourite, setFavourites }
}