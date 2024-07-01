import { ListItem, Section } from "@/components/components"
import { useGet } from "@/hooks/ReactQuery"
import { TbClock } from "react-icons/tb"
import { Triggers } from "../types"


export const TriggersTab = ({ visible }: { visible: boolean }) => {
    const useGetTriggers = useGet<Triggers>('/api/triggers', visible)
    return (<>
        <Section visible={visible} className="flex flex-col">
            <h2 className="max-sm:hidden">Triggers</h2>
            {/* <TextArea {...useGetTriggers} renderText={(data) => JSON.stringify(data, null, 2)} /> */}

            <div className={`flex flex-col gap-1 [color-scheme:light_dark]`}>
                {useGetTriggers.isSuccess && Object.entries(useGetTriggers.data).map(([triggerName, trigger]) => {
                    return <ListItem key={triggerName} className="justify-between gap-3 rounded">
                        <div className="flex gap-4 min-w-0">
                            <TbClock className="text-xl flex-shrink-0 text-green-500" />
                            <span className="truncate font-bold">{triggerName}</span>
                        </div>
                        <div className="flex gap-4 min-w-0">
                            <span className="whitespace-nowrap truncate font-mono text-blue-500">{trigger.$cron}</span>
                            <span className="max-sm:hidden whitespace-nowrap truncate font-mono">{trigger.$job}</span>
                        </div>
                    </ListItem>
                })}
            </div>
        </Section>
    </>)
}