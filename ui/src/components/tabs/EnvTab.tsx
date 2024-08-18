import { Section } from "@/components/components"
import { useGet } from "@/hooks/ReactQuery"
import { TextArea } from "../common/TextArea"
import { TopLevelEnvironments } from "../types"

export const EnvTab = ({ visible }: { visible: boolean }) => {
    const useGetEnv = useGet<TopLevelEnvironments>('/api/env', visible)
    return (<>
        <Section visible={visible} className="flex flex-col">
            <h2 className="max-sm:hidden">Environment</h2>
            <TextArea isLoading={useGetEnv.isLoading || useGetEnv.isPending} style="success" text={JSON.stringify(useGetEnv.data, null, 2)} />
        </Section>
    </>)
}