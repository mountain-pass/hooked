import { QueryFilters, QueryKey, useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { Modal } from './Modal'

export type ModalChild = ({ show, setShow }: { show: boolean, setShow: (show: boolean) => void }) => React.JSX.Element

export const GlobalModal = ({ queryKey, children }: { queryKey: QueryKey & QueryFilters, children: ModalChild }) => {
    const queryClient = useQueryClient()
    const showQuery = useQuery<any, Error, boolean>({
        queryKey,
        queryFn: () => queryClient.getQueriesData(queryKey)
    })
    const show = React.useMemo(() => {
        return typeof showQuery.data !== 'undefined' ? showQuery.data : false
    }, [showQuery.data])
    const setShow = (show: boolean) => {
        queryClient.setQueryData(queryKey, show)
    }

    return <Modal show={show} setShow={setShow} children={children} />
}