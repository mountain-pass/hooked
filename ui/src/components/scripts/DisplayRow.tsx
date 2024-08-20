import { InvocationResult, useGet } from "@/hooks/ReactQuery"
import { TbActivityHeartbeat } from "react-icons/tb"
import { TextArea } from "../common/TextArea"
import { ListItem } from "../components"


export const DisplayRow = ({ name, scriptPath }: {
    name: string,
    scriptPath: string,
}) => {
    
    const doGet = useGet<InvocationResult>('display', `/api/run/default/${scriptPath}`, !!scriptPath, 60_000)
    console.log(`%cRe-rendering DisplayRow`, 'color:magenta;')

    return (
        <div className="flex max-w-full w-full">
            <ListItem className="rounded-l max-sm:flex-col" fixedHeight={false}>
                <div className="flex gap-2">
                    <TbActivityHeartbeat className="text-xl flex-shrink-0 text-red-500" />
                    <span className="truncate self-center">{name}</span>
                </div>
                <div className="flex w-full overflow-auto">
                    <TextArea
                        className="max-sm:m-auto sm:ml-auto"
                        isLoading={doGet.isLoading}
                        style={doGet.data?.success ? 'success' : 'error'}
                        text={doGet.data?.success ? (doGet.data?.outputs.join('\n') || '-') : (doGet.error?.message || 'An error occurred.')}
                    />
                </div>
            </ListItem>
        </div>
    )
}