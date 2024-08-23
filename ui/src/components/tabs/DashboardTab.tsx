import { BlackButton, Section } from "@/components/components"
import { ScriptRow } from "@/components/scripts/ScriptRow"
import { KEYS } from "@/hooks/ReactQuery"
import { useQueryClient } from "@tanstack/react-query"
import React from "react"
import { ResultsSection } from "../ResultsSection"
import { DisplayRow } from "../scripts/DisplayRow"
import { Spinner } from "../Spinner"
import { TbRefresh } from "react-icons/tb"
import { DisplayChip } from "../scripts/DisplayChip"


type MapFunction<Type> = (element: Type, index: number, thiz: Iterator<Type>) => any

class Iterator<Type> {
    private array: Type[]
    private nextIndex = 0
    constructor(array: Type[]) {
        this.array = array
    }

    hasNext(): boolean {
        return this.nextIndex < this.array.length
    }

    peek(): Type | undefined {
        if (this.hasNext()) {
            return this.array[this.nextIndex]
        }
    }

    next(): Type | undefined {
        return this.array[this.nextIndex++]
    }

    mapWhile(whileTruthy: (peekElement: Type) => any, mapElement: MapFunction<Type>): any[] {
        const collectMap = []
        while (this.hasNext() && whileTruthy(this.peek()!)) {
            collectMap.push(mapElement(this.next()!, 1, this))
        }
        return collectMap
    }

    map(mapElement: MapFunction<Type>): any[] {
        return this.mapWhile(() => true, mapElement)
    }
}

export interface DashboardConfiguration {
    title: string,
    path: string
    sections: {
        title: string,
        fields: {
            label: string
            type: 'display' | 'button' | 'chip'
            $script: string
        }[]
    }[]
}


export const DashboardTab = ({ visible, dashboard }: {
    visible: boolean,
    dashboard: DashboardConfiguration
}) => {
    
    const queryClient = useQueryClient()
    console.log('%cRe-rendering DashboardTab', 'color:magenta;')

    // reset the log on tab change
    React.useEffect(() => {
        if (!visible) {
            queryClient.invalidateQueries({ queryKey: KEYS.executeScript() })
        }
    }, [visible, queryClient])


    // useMemo

    return (<>
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 w-full">
        { dashboard.sections?.map((section, i) => <>
        <Section key={section.title + i} visible={visible}>

            {/* title */}
            <div className="flex items-start max-sm:px-2 justify-between">
                <h2 className="overflow-hidden text-ellipsis">{section.title}</h2>
                <BlackButton size="md" title="Refresh" onClick={() => queryClient.invalidateQueries({ queryKey: KEYS.getCategory('display')})}>
                    <TbRefresh className="text-xl" />
                </BlackButton>
            </div>

            {/* button / display */}
            <div className={`flex flex-col gap-2 overflow-auto [color-scheme:light_dark]`}>
                { new Iterator(section.fields).map((field, i, iter) => {
                    if (field.type === 'button') {
                        return <ScriptRow
                            key={field.label + i}
                            name={field.label}
                            scriptPath={field.$script}
                            buttonOnly={true}
                        />
                    } else if (field.type === 'display') {
                        return <DisplayRow 
                            key={field.label + i}
                            name={field.label}
                            scriptPath={field.$script}
                        />
                    } else if (field.type === 'chip') {
                        return <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                            <DisplayChip 
                                key={field.label + i}
                                name={field.label}
                                scriptPath={field.$script}
                            />
                            { iter.mapWhile(el => el.type === 'chip', (nextField, nextI) => {
                                return <DisplayChip 
                                    key={nextField.label + nextI}
                                    name={nextField.label}
                                    scriptPath={nextField.$script}
                                />
                            })}
                            </div>
                    }
                })}
            </div>
        </Section> 
    </>)}
    </div>

        {/* Results */}
        <ResultsSection visible={true} />
    </>)
}