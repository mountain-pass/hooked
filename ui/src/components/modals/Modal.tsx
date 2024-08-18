import React from 'react'
import { isDefined } from '../types'

export type ModalChildProps = { 
    show: boolean, 
    setShow: (show: boolean) => void
    context?: any,
}

export type ModalChild = ({ show, setShow }: ModalChildProps) => React.JSX.Element

export type ModalProps = ModalChildProps & {
    children: ModalChild
    enableBackgroundClose?: boolean
    className?: string
}

/**
 * Facilitates wrapping sections in a modal window.
 * @param param0 
 * @returns 
 */
export const Modal = ({
    show,
    setShow,
    context,
    children,
    enableBackgroundClose = true,
    className = ''
}: ModalProps) => {
    const Child = children
    return (
        <div
            className={`animate-fade-in-out ${show ? 'show' : ''} flex items-start justify-center w-full h-full absolute top-0 left-0 right-0 bottom-0 backdrop-filter backdrop-blur-md`}
            onClick={() => enableBackgroundClose && setShow(false)}
        >
            <div className={`flex flex-col items-center justify-center p-4 w-full max-w-[500px] max-h-full ${className}`} onClick={(e) => e.stopPropagation()}>
                <Child show={isDefined(show) && show} setShow={setShow} context={context || {}} />
            </div>
        </div>
    )
}