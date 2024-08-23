import React from 'react'
import { OutputPre } from "../components"
import { Spinner } from '../Spinner'

interface TextAreaProps {
    isLoading: boolean
    style: 'success' | 'error'
    text: string,
    className?: string
}

export const TextArea = ({ isLoading, style, text, className = '' }: TextAreaProps) => {
    return (<>
        {/* shimmer */}
        <div className={`${isLoading ? 'visible' : 'hidden'} animate-pulse flex space-x-4 w-full ${className}`}>
            <div className="min-h-[44px] w-full flex-1 bg-slate-200 dark:bg-slate-900">
            </div>
        </div>

        {/* results - success */}
        <OutputPre visible={!isLoading} className={`${style === 'error' ? 'text-red-500' : 'text-blue-500'} ${className}`}>
            {text}
        </OutputPre>
    </>)
}