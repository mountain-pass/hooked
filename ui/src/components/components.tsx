import React from "react"

export const GreyText = ({ className = '', children }: { className?: string, children: React.ReactNode }) => (
  <i className={`text-gray-400 dark:text-gray-700 text-sm ${className}`}>{children}</i>
)

export const BlackButton = ({ children, disabled, active, className = '', onClick }: { disabled?: boolean, active?: boolean, onClick: () => void, className?: string, children: React.ReactNode }) => (
  <button
    disabled={disabled}
    className={`flex items-center justify-center border ${active ? 'border-blue-500 bg-black/10 dark:bg-white/10 ' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent hover:bg-black/10 dark:hover:bg-white/10'} px-3 py-2 min-h-[38px] min-w-[38px] text-sm ${className}`}
    onClick={onClick}>
    {children}
  </button>
)

export const OutputPre = ({ visible, className = '', children }: { visible: boolean, className?: string, children: React.ReactNode }) => (
  <pre className={`${visible ? 'visible' : 'hidden'} ${className} text-sm p-3 bg-slate-200 dark:bg-slate-900 overflow-auto [color-scheme:light_dark]`}>
    {children}
  </pre >
)

export const ListItem = ({ className = '', children, onClick }: { onClick?: () => void, className?: string, children: React.ReactNode }) => (
  <div className={`border border-gray-200 dark:border-gray-800 max-w-full w-full min-w-0 h-[54px] min-h-[54px] px-4 text-sm text-left flex gap-2 items-center bg-white dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 ${className}`}
    onClick={onClick}>
    {children}
  </div>
)

export const Section = ({ visible, fade, naked, className = '', children }: { visible?: boolean, naked?: boolean, fade?: boolean, className?: string, children: React.ReactNode }) => (
  <section className={`${naked ? '' : 'p-4 border border-gray-200 dark:border-gray-800 bg-slate-100 dark:bg-slate-800/25'} w-full flex flex-col gap-4 ${visible ? 'visible' : 'hidden'} ${fade ? 'opacity-40 blur-sm' : ''} ${className}`}>
    {children}
  </section >
)