import { BlackButton, GreyText, Section } from "@/components/components"
import { ScriptRow } from "@/components/scripts/ScriptRow"
import { useExecuteScriptWrapper, useGet } from "@/hooks/ReactQuery"
import React from "react"
import { TextArea } from "../common/TextArea"
import { DisplayRow } from "../scripts/DisplayRow"
import { TopLevelScripts } from "../types"

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

    const useGetScripts = useGet<TopLevelScripts>(`/api/scripts`, visible)
    const { doExecute, runTimer, executeScript } = useExecuteScriptWrapper(useGetScripts.data)

    // reset the log on tab change
    React.useEffect(() => doExecute.reset(), [dashboard])

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
                            script={field.$script.split(' ')}
                            executeScript={executeScript}
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
        <Section visible={visible && (doExecute.isSuccess || doExecute.isPending || doExecute.isError)} className="flex-1">
            <div className="flex items-start justify-between">
                <h2>Results</h2>
                <div className="flex gap-3 items-center">
                    <GreyText>{`${(runTimer.durationMs / 1000).toFixed(3)} seconds`}</GreyText>
                    <BlackButton title="Clear Results" className="rounded" size="md" onClick={() => doExecute.reset()}>Clear</BlackButton>
                </div>
            </div>

            <TextArea {...doExecute} renderText={(data) => `Success:\n${(data?.outputs ?? []).join('\n')}`} />

        </Section>
    </>)
}