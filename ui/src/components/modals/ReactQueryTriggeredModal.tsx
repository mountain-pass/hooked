import { QueryFilters, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { Modal, ModalChild } from './Modal'
import { isDefined } from '../types'

export type ReactQueryTriggeredModalProps = { 
    queryKey: QueryKey & QueryFilters,
    children: ModalChild,
    showOverride?: boolean
}

/**
 * Uses a react-query value to trigger the modal.
 * @param param0 
 * @returns 
 */
export const ReactQueryTriggeredModal = ({ queryKey, children, showOverride }: ReactQueryTriggeredModalProps) => {
    const queryClient = useQueryClient()
    const showQuery = useQuery<any, Error, boolean>({
        queryKey,
        queryFn: () => {
            const data = queryClient.getQueryData(queryKey)
            console.log(`Fetching query data for key "${queryKey}" - data=`, JSON.stringify(data))
            return data
        }
    })
    const show = React.useMemo(() => {
        return isDefined(showOverride) ? showOverride : isDefined(showQuery.data) ? showQuery.data : false
    }, [showQuery.data, showOverride])
    const setShow = (show: boolean) => {
        queryClient.setQueryData(queryKey, show)
    }

    return <Modal show={show} setShow={setShow} context={showQuery.data}>{children}</Modal>
}