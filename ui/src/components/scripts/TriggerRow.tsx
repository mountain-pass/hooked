import { TbClock, TbEdit } from "react-icons/tb"
import { BlackButton, ListItem } from "../components"
import { CronTrigger } from "../types"


export const TriggerRow = ({ name, trigger, onEdit }: {
    name: string,
    trigger: CronTrigger,
    onEdit: (name: string, trigger: CronTrigger) => void
}) => {

    return (
        <div className="flex max-w-full w-full">
            <ListItem key={name} className="justify-between gap-3 rounded-l rounded-r">
                <div className="flex gap-4 min-w-0">
                    <TbClock className="text-xl flex-shrink-0 text-green-500" />
                    <span className="truncate">{name}</span>
                </div>
                <div className="flex gap-4 min-w-0">
                    <span className="whitespace-nowrap truncate font-mono text-blue-500">{trigger.$cron}</span>
                    <span className="max-sm:hidden whitespace-nowrap truncate font-mono text-purple-500">{trigger.$job}</span>
                </div>
            </ListItem>
            {/* <BlackButton
                size="lg"
                className={`flex-shrink-0 h-[54px] min-w-[54px] text-xl rounded-r border-l-0`}
                onClick={() => onEdit(name, trigger)}
            >
                <TbEdit />
            </BlackButton> */}
        </div>
    )
}