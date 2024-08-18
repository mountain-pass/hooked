import React from 'react'
import { OutputPre } from "../components"

interface TextAreaProps {
    isLoading: boolean
    style: 'success' | 'error'
    text: string
}

export const TextArea = ({isLoading, style, text}: TextAreaProps) => {
    return (<>
        {/* shimmer */}
        <div className={`${isLoading ? 'visible' : 'hidden'} animate-pulse flex space-x-4`}>
            <div className="min-h-[44px] w-full bg-slate-200 dark:bg-slate-900"></div>
        </div>

        {/* results - success */}
        <OutputPre visible={!isLoading} className={style === 'error' ? 'text-red-500' : 'text-blue-500'}>
            {text}
        </OutputPre>
    </>)
}