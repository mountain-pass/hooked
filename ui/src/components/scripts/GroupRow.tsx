import { TbFolderOpen } from "react-icons/tb"
import { ListItem } from "../components"


export const GroupRow = ({ name, childrenCount, selectScriptGroup }: { name: string, childrenCount: number, selectScriptGroup: (name: string) => void }) => {

    return (
        <ListItem key={name} className="cursor-pointer" onClick={() => selectScriptGroup(name)}>
            <TbFolderOpen className="text-blue-500 text-xl" />
            <span className="truncate">{name}</span>
            <span className="text-gray-300">({childrenCount})</span>

        </ListItem>
    )
}