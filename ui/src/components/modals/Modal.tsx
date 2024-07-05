import React from 'react'

export type ModalChildProps = { show: boolean, setShow: (show: boolean) => void }

export type ModalChild = ({ show, setShow }: ModalChildProps) => React.JSX.Element

/**
 * Facilitates wrapping sections in a modal window.
 * @param param0 
 * @returns 
 */
export const Modal = ({
    show,
    setShow,
    children,
    allowBackgroundClose = true
}: {
    show: boolean,
    setShow: (show: boolean) => void,
    children: ModalChild
    allowBackgroundClose?: boolean
}) => {
    const Child = children
    return (
        <div
            className={`animate-fade-in-out ${show ? 'show' : ''} flex items-start justify-center w-full h-full absolute top-0 left-0 right-0 bottom-0 backdrop-filter backdrop-blur-md`}
            onClick={() => allowBackgroundClose && setShow(false)}
        >
            <div className="flex flex-col items-center justify-center p-4 w-full max-w-[500px]" onClick={(e) => e.stopPropagation()}>
                <Child show={show} setShow={setShow} />
            </div>
        </div>
    )
}