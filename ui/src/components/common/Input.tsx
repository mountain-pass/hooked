import { DetailedHTMLProps, InputHTMLAttributes } from "react"

type OnChangeValue = { onChangeValue: (value: string) => void }
type InnerRef = { innerRef?: React.RefObject<HTMLInputElement> }

export const Input = ({ className = '', onChangeValue, innerRef, ...props }: OnChangeValue & InnerRef & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
    return (
        <input
            ref={innerRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            className={`border border-gray-200 dark:border-neutral-700 placeholder-neutral-500 w-full p-4 text-sm ${className}`}
            spellCheck={false}
            onKeyUp={e => onChangeValue((e.target as any).value)}
            onChange={e => onChangeValue((e.target as any).value)}
            {...props}
        />
    )
}