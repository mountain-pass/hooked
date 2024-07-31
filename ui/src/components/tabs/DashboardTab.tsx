import { BlackButton, GreyText, Section } from "@/components/components"
import { ScriptRow } from "@/components/scripts/ScriptRow"
import { useExecuteScript } from "@/hooks/ReactQuery"
import { useRunTimer } from "@/hooks/useRunTimer"
import React from "react"
import { TextArea } from "../common/TextArea"
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

    const doExecute = useExecuteScript()
    const runTimer = useRunTimer()

    // reset the log on tab change
    React.useEffect(() => doExecute.reset(), [dashboard])

    /** Attempts to run the script. */
    const executeScript = React.useCallback((scriptPath: string) => {
        if (doExecute.isPending) {
            console.debug('Already executing script, skipping...')
            return
        }
        if (runTimer.isRunning) {
            runTimer.stop()
        }
        runTimer.start()
        doExecute.mutateAsync({ scriptPath, envNames: 'default', env: {} as Record<string, string> })
            .then(runTimer.stop)
            .catch(runTimer.stop)
    }, [doExecute, runTimer])

    // useMemo

    return (<>
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 w-full gap-4">
        { dashboard.sections?.map(section => <Section visible={visible} className="flex-1">
            <div className="flex items-start max-sm:px-2">
                <h2>{section.title}</h2>
            </div>

            <div className={`flex flex-col gap-1 overflow-auto [color-scheme:light_dark]`}>
                { section.fields.map(field => {
                    if (field.type === 'button') {
                        return <ScriptRow
                            name={field.label}
                            scriptPath={field.$script}
                            executeScript={executeScript}
                        />
                    } else if (field.type === 'display') {
                        return <DisplayRow name={field.label} scriptPath={field.$script} />
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