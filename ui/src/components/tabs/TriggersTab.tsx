import { BlackButton, Section } from "@/components/components"
import { useGet } from "@/hooks/ReactQuery"
import { TriggerRow } from "../scripts/TriggerRow"
import { CronTrigger, Triggers } from "../types"
import { Modal } from "../modals/Modal"
import React from "react"


export const TriggersTab = ({ visible }: { visible: boolean }) => {
    const useGetTriggers = useGet<Triggers>('/api/triggers', visible)
    const [showEdit, setShowEdit] = React.useState<boolean>(false)

    const onEdit = (name: string, trigger: CronTrigger) => {
        setShowEdit(true)
    }

    return (<>
        <Section visible={visible} className="flex flex-col">
            <h2 className="max-sm:hidden">Triggers</h2>
            <div className={`flex flex-col gap-1 [color-scheme:light_dark]`}>
                {useGetTriggers.isSuccess && Object.entries(useGetTriggers.data).map(([triggerName, trigger]) => {
                    return <TriggerRow key={triggerName} name={triggerName} trigger={trigger} onEdit={onEdit} />
                })}
            </div>
        </Section>

        <Modal show={showEdit} setShow={setShowEdit}>
            {({ show, setShow }) => {
                return (<>
                    <Section visible={show}>
                        <h2>Edit Trigger</h2>
                        <div className="grid grid-cols-2 gap-2">
                            <BlackButton size="md" onClick={() => setShow(false)}>Save</BlackButton>
                            <BlackButton size="md" onClick={() => setShow(false)}>Close</BlackButton>
                        </div>
                    </Section>
                </>)
            }}
        </Modal>
    </>)
}