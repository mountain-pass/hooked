import { Section } from "@/components/components"
import { ScriptRow } from "@/components/scripts/ScriptRow"
import { KEYS } from "@/hooks/ReactQuery"
import { useQueryClient } from "@tanstack/react-query"
import React from "react"
import { ResultsSection } from "../ResultsSection"
import { DisplayRow } from "../scripts/DisplayRow"

export interface DashboardConfiguration {
    title: string,
    path: string
    sections: {
        title: string,
        fields: {
            label: string
            type: 'display' | 'button'
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
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 w-full gap-4">
        { dashboard.sections?.map((section, i) => <Section key={section.title + i} visible={visible} className="flex-1">
            <div className="flex items-start max-sm:px-2">
                <h2>{section.title}</h2>
            </div>

            <div className={`flex flex-col gap-1 overflow-auto [color-scheme:light_dark]`}>
                { section.fields.map((field, i) => {
                    if (field.type === 'button') {
                        return <ScriptRow
                            key={field.label + i}
                            name={field.label}
                            scriptPath={field.$script}
                            showFavourites={false}
                            disabled={false}
                        />
                    } else if (field.type === 'display') {
                        return <DisplayRow 
                            key={field.label + i}
                            name={field.label}
                            scriptPath={field.$script}
                        />
                    }
                })}
            </div>
        </Section> 
    )}
    </div>

        {/* Results */}
        <ResultsSection visible={true} />
    </>)
}