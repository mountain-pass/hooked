import React from "react"
import { useFavourites } from "@/hooks/useFavourites"
import { BlackButton, GreyText, ListItem, Section } from "./components"
import { useLocalStorageBackedStateV4 } from "@/hooks/useLocalStorageBackedStateV4"
import { TbArrowBackUp, TbStar, TbStarFilled, TbX } from "react-icons/tb"
import { useGet } from "@/hooks/ReactQuery"
import { isScript } from "./types"

export const ScriptsSection = ({ visible, fade, executeScript, baseUrl, apiKey }: {
    visible: boolean,
    fade: boolean,
    executeScript: (scriptPath: string) => void,
    baseUrl: string,
    apiKey: string
}) => {

    const isTouchScreen = typeof window === 'undefined' ? false : window.matchMedia("(pointer: coarse)").matches
    const refSearchScript = React.useRef<HTMLInputElement>(null)
    const { isFavourite, toggleFavourite } = useFavourites()
    const [searchScripts, setSearchScripts] = useLocalStorageBackedStateV4<string>('searchScripts', '')
    const useGetScripts = useGet(`${baseUrl}/api/scripts`, apiKey)

    // useMemo

    /** Filters the visible scripts. */
    const filteredObjects: FilteredObjects = React.useMemo(() => {
        console.debug('Re-evaluating filteredScripts...')
        if (useGetScripts.isSuccess) {
            const filters = searchScripts?.trim().split(' ').filter(f => f.length > 0) ?? []
            let current: Record<string, any> = useGetScripts.data
            for (const filter of filters) {
                const filtered = Object.entries(current).filter(([name, groupOrJob]) => {
                    return name.toLowerCase().startsWith(filter.toLowerCase())
                })
                if (filtered.length === 1) {
                    // exact match...
                    const tmp = filtered[0][1]
                    if (isScript(tmp)) {
                        // found script
                        current = Object.fromEntries(filtered)
                        break
                    } else {
                        // found group
                        current = tmp
                    }
                } else {
                    current = Object.fromEntries(filtered)
                }
            }
            return { scripts: current }
        }
        return { scripts: {} }
    }, [useGetScripts.isSuccess, useGetScripts.data, searchScripts])

    // functions

    /** Jumps up to the parent script (removes the child). */
    const setSearchScriptsToParent = () => {
        setSearchScripts((ps: string) => ps.trim().split(' ').slice(0, -1).join(' '))
        if (!isTouchScreen) refSearchScript.current?.focus()
    }

    /** Clears the search scripts. */
    const clearSearchScripts = () => {
        setSearchScripts('')
        if (!isTouchScreen) refSearchScript.current?.focus()
    }

    /** Selects the script group. */
    const selectScriptGroup = (name: string) => {
        // NOTE: trailing space is important, for next selection
        setSearchScripts((ps: string) => `${ps.trim()} ${name.trim()} `)
        if (!isTouchScreen) refSearchScript.current?.focus()
    }

    interface FilteredObjects {
        scripts: Record<string, any>
    }

    return (<>
        <Section visible={visible} fade={fade} className="flex-1">
            <h2>Scripts</h2>
            <div className="flex">
                <input
                    ref={refSearchScript}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    className="border border-gray-200 dark:border-gray-800 w-full p-4 text-sm"
                    placeholder="Search scripts"
                    spellCheck={false}
                    value={searchScripts}
                    onChange={e => setSearchScripts(e.target.value)}
                    // on escape key, clear searc
                    onKeyDown={e => {
                        if (e.key === 'Escape') setSearchScripts('')
                    }}
                />
                <BlackButton className="text-xl min-w-[54px] ml-[-1px]" onClick={() => setSearchScriptsToParent()}>
                    <TbArrowBackUp className="text-xl" />
                </BlackButton>
                <BlackButton className="text-xl min-w-[54px] ml-[-1px]" onClick={() => clearSearchScripts()}>
                    <TbX className="text-xl" />
                </BlackButton>
            </div>

            <div className="flex flex-col gap-1 h-[30dvh] overflow-auto [color-scheme:light_dark]">
                {useGetScripts.isLoading && <GreyText>Loading...</GreyText>}
                {useGetScripts.isSuccess && Object.entries(filteredObjects.scripts).length === 0 && <GreyText>No matching scripts.</GreyText>}
                {useGetScripts.isSuccess && Object.entries(filteredObjects.scripts).length > 0 && Object.entries(filteredObjects.scripts).map(([name, groupOrJob]) => {
                    if (isScript(groupOrJob)) {
                        // executable Script
                        return (
                            <div className="flex" key={name}>
                                <ListItem className="justify-between">
                                    <span className="truncate">{name}</span>
                                </ListItem>
                                <BlackButton
                                    className={`h-[54px] min-w-[54px] ml-[-1px] text-xl ${isFavourite(groupOrJob._scriptPath) ? 'text-yellow-400' : ''}`}
                                    onClick={() => toggleFavourite(groupOrJob._scriptPath)}
                                >
                                    {isFavourite(groupOrJob._scriptPath) ? <TbStarFilled /> : <TbStar />}
                                </BlackButton>
                                <BlackButton className="h-[54px] ml-[-1px] px-6" onClick={() => executeScript(groupOrJob._scriptPath)}>Execute</BlackButton>
                            </div>
                        )
                    } else {
                        // Script Group
                        return (
                            <ListItem key={name} className="cursor-pointer" onClick={() => selectScriptGroup(name)}>
                                <span className="truncate">{name}</span>
                                <span className="text-gray-300">({Object.values(groupOrJob).length})</span>
                            </ListItem>
                        )
                    }
                })}
                {useGetScripts.isLoading && <GreyText>Loading...</GreyText>}
                {useGetScripts.isSuccess && Object.keys(useGetScripts.data).length === 0 && <GreyText>No data</GreyText>}
                {useGetScripts.isError && <GreyText>{useGetScripts.error.message}</GreyText>}
            </div>
        </Section>

        {/* <pre className={`${process.env.NODE_ENV === 'production' ? 'hidden' : 'visible'} text-purple-500 bg-purple-500/20 w-full p-4 border border-purple-500`}>
            {JSON.stringify({ isTouchScreen }, null, 2)}
        </pre> */}
    </>)
}