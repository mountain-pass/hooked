import { FavouritesSection } from "@/components/FavouritesSection"
import { BlackButton, GreyText, Section } from "@/components/components"
import { GroupRow } from "@/components/scripts/GroupRow"
import { ScriptRow } from "@/components/scripts/ScriptRow"
import { TopLevelScripts, isScript } from "@/components/types"
import { useExecuteScriptWrapper, useGet } from "@/hooks/ReactQuery"
import { useFavourites } from "@/hooks/useFavourites"
import { useLocalStorageBackedStateV4 } from "@/hooks/useLocalStorageBackedStateV4"
import React from "react"
import { TbArrowBackUp, TbStar, TbStarFilled, TbX } from "react-icons/tb"
import { Input } from "../common/Input"
import { TextArea } from "../common/TextArea"
import { ResultsSection } from "../ResultsSection"

export const ScriptsTab = ({ visible }: {
    visible: boolean,
}) => {

    const useGetScripts = useGet<TopLevelScripts>(`/api/scripts`, visible)
    const { doExecute, runTimer, executeScript } = useExecuteScriptWrapper(useGetScripts.data)
    const isTouchScreen = typeof window === 'undefined' ? false : window.matchMedia("(pointer: coarse)").matches
    const refSearchScript = React.useRef<HTMLInputElement>(null)
    const [searchScripts, setSearchScripts] = useLocalStorageBackedStateV4<string>('searchScripts', '')
    const [showFavourites, setShowFavourites] = useLocalStorageBackedStateV4<boolean>('showFavourites', false)
    const FavouritesState = useFavourites()

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
        // NOTE: trailing space is important, for next selection. If name contains spaces, only use the first section.
        setSearchScripts((ps: string) => `${ps.trim()} ${name.split(' ')[0].trim()} `)
        if (!isTouchScreen) refSearchScript.current?.focus()
    }

    const toggleFavourites = () => setShowFavourites((ps: boolean) => !ps);

    interface FilteredObjects {
        scripts: Record<string, any>
    }

    return (<>
        <Section visible={visible} className="flex-1">
            <div className="flex items-start max-sm:justify-end justify-between">
                <h2 className="max-sm:hidden sm:visible">Scripts</h2>

                <BlackButton title="Toggle show Favourites" size="sm" active={showFavourites} className="rounded flex items-center justify-between gap-2" onClick={toggleFavourites}>
                    {showFavourites ? <TbStarFilled className="text-xl" /> : <TbStar className="text-xl" />}
                    <div>Favourites</div>
                </BlackButton>
            </div>

            {/* Favourites */}
            <FavouritesSection visible={showFavourites ?? false} executeScript={executeScript} />

            {/* Scripts */}
            <div className={`flex ${showFavourites ? 'hidden' : 'visible'}`}>
                <Input
                    className="rounded-l"
                    innerRef={refSearchScript}
                    placeholder="Search scripts"
                    value={searchScripts ?? ''}
                    onChangeValue={val => setSearchScripts(val)}
                    // on escape key, clear search
                    onKeyDown={e => {
                        if (e.key === 'Escape') setSearchScripts('')
                    }}
                />
                <BlackButton title="Jump up a group" size="lg" className="text-xl min-w-[54px] ml-[-1px]" onClick={() => setSearchScriptsToParent()}>
                    <TbArrowBackUp className="text-xl" />
                </BlackButton>
                <BlackButton title="Remove filter" size="lg" className="text-xl min-w-[54px] ml-[-1px] rounded-r" onClick={() => clearSearchScripts()}>
                    <TbX className="text-xl" />
                </BlackButton>
            </div>

            <div className={`flex flex-col gap-1 h-[30dvh] overflow-auto [color-scheme:light_dark] ${showFavourites ? 'hidden' : 'visible'}`}>
                {useGetScripts.isLoading && <GreyText>Loading...</GreyText>}
                {useGetScripts.isSuccess && Object.entries(filteredObjects.scripts).length === 0 && <GreyText>No matching scripts.</GreyText>}
                {useGetScripts.isSuccess && Object.entries(filteredObjects.scripts).length > 0 && Object.entries(filteredObjects.scripts)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([name, groupOrJob]) => {
                        if (isScript(groupOrJob)) {
                            // executable Script
                            return <ScriptRow
                                key={name}
                                name={groupOrJob._scriptPath ?? ''}
                                script={groupOrJob._scriptPathArray!}
                                favouritesState={FavouritesState}
                                executeScript={executeScript}
                            />
                        } else {
                            // Script Group
                            return <GroupRow key={name} name={name} childrenCount={Object.values(groupOrJob).length} selectScriptGroup={selectScriptGroup} />
                        }
                    })}
                {useGetScripts.isLoading && <GreyText>Loading...</GreyText>}
                {useGetScripts.isSuccess && Object.keys(useGetScripts.data).length === 0 && <GreyText>No data</GreyText>}
                {useGetScripts.isError && <GreyText>{useGetScripts.error.message}</GreyText>}
            </div>
        </Section>

        {/* Results */}
        <ResultsSection visible={true} />
    </>)
}