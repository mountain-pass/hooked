import { InvocationResult, useGet } from "@/hooks/ReactQuery"
import { TextArea } from "../common/TextArea"
import { ListItem } from "../components"


export const DisplayChip = ({ name, scriptPath }: {
    name: string,
    scriptPath: string,
}) => {
    
    const doGet = useGet<InvocationResult>('display', `/api/run/default/${scriptPath}`, !!scriptPath, 60_000)
    console.log(`%cRe-rendering DisplayRow`, 'color:magenta;')

    return (
        <ListItem className="rounded flex-col overflow-hidden" fixedHeight={false}>
            <TextArea
                className="text-2xl min-h-[56px] overflow-hidden"
                isLoading={doGet.isLoading}
                style={doGet.data?.success ? 'success' : 'error'}
                text={doGet.data?.success ? (doGet.data?.outputs.join('\n') || '-') : (doGet.error?.message || 'An error occurred.')}
            />
            <span className="truncate self-center text-neutral-500 overflow-hidden text-ellipsis">{name}</span>
        </ListItem>
    )
}