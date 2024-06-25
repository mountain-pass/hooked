import React from "react"

export const GreyText = ({ className = '', children }: { className?: string, children: React.ReactNode }) => (
  <i className={`text-gray-400 dark:text-gray-700 text-sm ${className}`}>{children}</i>
)

export const BlackButton = ({ children, className = '', onClick }: { onClick: () => void, className?: string, children: React.ReactNode }) => (
  <button className={`border border-gray-200 dark:border-gray-800 px-3 py-2 min-h-[38px] min-w-[38px] bg-white dark:bg-transparent hover:bg-black/10 dark:hover:bg-white/10 text-sm ${className}`}
    onClick={onClick}>
    {children}
  </button>
)

export const OutputPre = ({ visible, className = '', children }: { visible: boolean, className?: string, children: React.ReactNode }) => (
  <pre className={`${visible ? 'visible' : 'hidden'} ${className} text-sm p-3 bg-slate-200 dark:bg-slate-900 overflow-auto [color-scheme:light_dark]`}>
    {children}
  </pre>
)

export const ListItem = ({ className = '', children, onClick }: { onClick?: () => void, className?: string, children: React.ReactNode }) => (
  <div className={`border border-gray-200 dark:border-gray-800 w-full min-h-[64px] h-[64px] px-4 text-sm text-left flex gap-2 items-center bg-white dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 ${className}`}
    onClick={onClick}>
    {children}
  </div>
)

export const Section = ({ visible, className = '', children }: { visible: boolean, className?: string, children: React.ReactNode }) => (
  <section className={`border border-gray-200 dark:border-gray-800 bg-slate-100 dark:bg-slate-800/25 w-full p-4 flex flex-col gap-4 ${visible ? 'visible' : 'hidden'} ${className}`}>
    {children}
  </section >
)