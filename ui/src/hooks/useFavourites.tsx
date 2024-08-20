import React from "react"
import { useLocalStorageBackedStateV4 } from "./useLocalStorageBackedStateV4"
import { useQueryClient } from "@tanstack/react-query"
import { KEYS } from "./ReactQuery"

export interface UseFavouritesState {
    favourites: string[]
    isFavourite: (scriptPath: string) => boolean
    toggleFavourite: (scriptPath: string) => void
    setFavourites: (favourites: string[]) => void
}

export const useFavourites = (): UseFavouritesState => {

    const [favourites, setFavourites] = useLocalStorageBackedStateV4<string[]>(`favourites`, [])
    const queryClient = useQueryClient()

    // onload

    React.useEffect(() => {
        queryClient.setQueryData(KEYS.cachedFavourites(), favourites)
    }, [favourites, queryClient])

    // utility functions

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

    return { favourites: favourites ?? [], isFavourite, toggleFavourite, setFavourites }
}