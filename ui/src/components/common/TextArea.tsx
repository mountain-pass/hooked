import React from 'react'
import { OutputPre } from "../components"

interface TextAreaProps {
    isPending: boolean
    isSuccess: boolean
    isError: boolean
    data: any
    error: any
    renderText: (data: any) => string
}

export const TextArea = (doExecute: TextAreaProps) => {
    return (<>
        {/* shimmer */}
        <div className={`${doExecute.isPending ? 'visible' : 'hidden'} animate-pulse flex space-x-4`}>
            <div className="min-h-[44px] w-full bg-slate-200 dark:bg-slate-900"></div>
        </div>

        {/* results - success */}
        <OutputPre visible={doExecute.isSuccess} className="text-blue-500">
            {doExecute.renderText(doExecute.data)}
        </OutputPre>

        {/* results - error */}
        <OutputPre visible={doExecute.isError} className="text-red-500">
            {'Error:\n'}
            {(doExecute.error as Error)?.message}
            {'\n'}
            {(doExecute.error as any)?.body?.message}
        </OutputPre>
    </>)
}