import { Section } from "@/components/components"
import { useGet } from "@/hooks/ReactQuery"
import { TextArea } from "../common/TextArea"

export const EnvTab = ({ visible }: { visible: boolean }) => {
    const useGetEnv = useGet('/api/env', visible)
    return (<>
        <Section visible={visible} className="flex flex-col">
            <h2 className="max-sm:hidden">Environment</h2>
            <TextArea {...useGetEnv} renderText={(data) => JSON.stringify(data, null, 2)} />
        </Section>
    </>)
}