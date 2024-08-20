import { QueryFilters, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { Modal, ModalChild } from './Modal'
import { isDefined } from '../types'
import { KEYS, useCacheValue } from '@/hooks/ReactQuery'

export type ReactQueryTriggeredModalProps = { 
    className?: string
    queryKey: QueryKey & QueryFilters,
    children: ModalChild,
    showOverride?: boolean
}

/**
 * Uses a react-query value to trigger the modal.
 * @param param0 
 * @returns 
 */
export const ReactQueryTriggeredModal = ({ queryKey, children, showOverride, className = '' }: ReactQueryTriggeredModalProps) => {

    const queryClient = useQueryClient()
    const showQuery = useCacheValue(queryKey)

    const show = React.useMemo(() => {
        return isDefined(showOverride) ? showOverride : isDefined(showQuery.data) ? showQuery.data : false
    }, [showQuery.data, showOverride])

    const setShow = (show: boolean) => {
        queryClient.setQueryData(queryKey, show)
    }

    return <Modal
        show={!!show} 
        setShow={setShow} 
        context={showQuery.data} 
        className={className}
        >
            {children}
        </Modal>
}