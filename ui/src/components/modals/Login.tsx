import { baseUrl, useLogin } from '@/hooks/ReactQuery'
import React from 'react'
import { TbLock } from 'react-icons/tb'
import { Input } from '../common/Input'
import { BlackButton, GreyText, Section } from '../components'

export const LoginPrompt = ({ show, setShow }: { show: boolean, setShow: (show: boolean) => void }) => {

    const [username, setUsername] = React.useState<string>('')
    const [password, setPassword] = React.useState<string>('')
    const useLoginMutation = useLogin()

    const doLogin = React.useCallback((username: string, password: string) => {
        useLoginMutation.mutateAsync({ username, password }, {
            onSuccess: () => {
                console.debug('Login successful')
                setUsername('')
                setPassword('')
                setShow(false)
            }
        }).catch(() => console.warn('Login failed'))
    }, [useLoginMutation, setShow])

    // focus input on showLogin
    const refUsername = React.useRef<HTMLInputElement>(null)
    React.useEffect(() => {
        if (show && refUsername.current !== null) {
            refUsername.current?.focus()
        }
    }, [show])

    return (
        <Section visible={show}>
            <div className="w-full flex items-center justify-between">
                <h2>Login</h2>
                <div className="flex gap-3 items-center">
                    <GreyText className="max-w-[200px] truncate">{useLoginMutation.error?.message ?? ''}</GreyText>
                    <TbLock className={`${useLoginMutation.isError ? 'text-red-500' : 'text-blue-500'} text-xl cursor-pointer`} onClick={() => {
                        if (typeof window !== 'undefined') window.open(baseUrl, '_blank')
                    }} />
                </div>
            </div>
            <form className="contents" onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                doLogin(username, password)
            }}>
                <Input
                    innerRef={refUsername}
                    name="username"
                    placeholder="Username"
                    autoComplete="username"
                    className="rounded"
                    value={username}
                    onChangeValue={setUsername}
                />
                <Input
                    placeholder="Password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="rounded"
                    value={password}
                    onChangeValue={setPassword}
                />
                <BlackButton
                    type="submit"
                    loading={useLoginMutation.isPending}
                    size="md"
                    disabled={username.length < 2 || password.length < 2}
                    className="rounded"
                    title="Login"
                >
                    Login
                </BlackButton>
            </form>
        </Section>
    )
}