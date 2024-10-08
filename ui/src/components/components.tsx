import React from "react"
import { Spinner } from "./Spinner"

export const GreyText = ({ className = '', children }: { className?: string, children: React.ReactNode }) => (
  <i className={`text-neutral-400 dark:text-neutral-500 text-sm ${className}`}>{children}</i>
)

export const BlackButton = ({ children, disabled, active, loading, size = 'lg', title, className = '', onClick, ...props }:
  { loading?: boolean, disabled?: boolean, active?: boolean, size: 'sm' | 'md' | 'lg', title: string, className?: string, children: React.ReactNode } & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => {
  const dims = size === 'sm' ? 'min-h-[38px] min-w-[38px] h-[38px]'
    : size === 'md' ? 'min-h-[46px] min-w-[46px] h-[46px]'
      : size === 'lg' ? 'min-h-[54px] min-w-[54px] h-[54px]'
        : ''
  return (
    <button
      type="button"
      disabled={disabled}
      className={`
      flex items-center justify-start border 
      ${active
          ? `border-neutral-500 bg-neutral-100 hover:bg-neutral-200 
          dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-400 `
          : `border-neutral-300  bg-white hover:bg-neutral-200
          dark:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-700 `} 
      px-3 py-2 
      ${dims} 
      text-sm 
      ${className}
      disabled:cursor-not-allowed 
      disabled:dark:border-neutral-800 disabled:dark:text-neutral-700 disabled:hover:dark:bg-neutral-900 
      disabled:border-neutral-300 disabled:text-neutral-300 disabled:hover:bg-white
      `}
      onClick={onClick}
      title={title}
      {...props}
    >
      <Spinner className={`${loading ? 'visible' : 'hidden'} aspect-square w-full h-full`} />
      {!loading && children}
    </button>
  )
}

export const OutputPre = ({ visible, className = '', size, children }: { visible: boolean, className?: string, size?: 'sm' | 'lg', children: React.ReactNode }) => (
  <pre className={`${visible ? 'visible' : 'hidden'} ${className} ${size === 'lg' ? 'text-2xl min-h-[56px]' : 'text-sm min-h-[44px]'} p-3 bg-slate-200 dark:bg-slate-900 overflow-auto [color-scheme:light_dark]`}>
    {children}
  </pre>
)

export const ListItem = ({ className = '', fixedHeight = true, children, onClick }: { onClick?: () => void, fixedHeight?: boolean, className?: string, children: React.ReactNode }) => (
  <div className={`border border-gray-200 dark:border-neutral-700 max-w-full w-full min-w-0 ${fixedHeight ? 'h-[54px] min-h-[54px]' : 'p-3'} px-4 text-sm text-left flex gap-2 items-center bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-white/5 ${className}`}
    onClick={onClick}>
    {children}
  </div>
)

export const Section = ({ visible, naked, className = '', children }: { visible?: boolean, naked?: boolean, className?: string, children: React.ReactNode }) => (
  <section className={`
  rounded 
  ${naked ? '' : 'max-sm:py-4 max-sm:px-2 p-4 border border-neutral-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900'} 
  w-full flex flex-col gap-4 
  ${visible ? 'visible' : 'hidden'} 
  ${className}
  `}>
    {children}
  </section >
)
