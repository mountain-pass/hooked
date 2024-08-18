import { useClearLastResult, useLastResult } from "@/hooks/ReactQuery"
import { TextArea } from "./common/TextArea"
import { BlackButton, GreyText, Section } from "./components"
import { isDefined } from "./types"

export type ResultsSectionProps = {
    visible: boolean
}

export const ResultsSection = ({ visible } : ResultsSectionProps) => {

    const results = useLastResult()
    const clearLastResult = useClearLastResult()

    return (<>
        {/* <div>results={JSON.stringify(results)}</div> */}

        <Section visible={visible} className="flex-1">
            <div className="flex items-start justify-between">
                <h2>Results</h2>
                <div className="flex gap-3 items-center">
                    { results.data && <GreyText>{`${(results.data.durationMillis / 1000).toFixed(3)} seconds`}</GreyText> }
                    <BlackButton title="Clear Results" className="rounded" size="md" onClick={() => clearLastResult.clear()}>Clear</BlackButton>
                </div>
            </div>

            <TextArea 
            isLoading={isDefined(results.data?.isLoading) ? results.data?.isLoading : false}
            style={results.data?.success ? 'success' : 'error'}
            text={(results.data?.outputs ?? []).join('\n')}
            />

        </Section>
        </>)
}