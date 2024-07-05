import { baseUrl, useLogin } from '@/hooks/ReactQuery'
import React from 'react'
import { TbLock, TbLockCancel, TbLockCheck } from 'react-icons/tb'
import { Input } from '../common/Input'
import { BlackButton, GreyText, Section } from '../components'

export const LoginPrompt = ({ showLogin, setShowLogin }: { showLogin: boolean, setShowLogin: (show: boolean) => void }) => {

    const [username, setUsername] = React.useState<string>('')
    const [password, setPassword] = React.useState<string>('')
    const useLoginMutation = useLogin()

    const doLogin = React.useCallback((username: string, password: string) => {
        useLoginMutation.mutateAsync({ username, password }, {
            onSuccess: () => {
                console.debug('Login successful')
                setUsername('')
                setPassword('')
                setShowLogin(false)
            }
        }).catch(() => console.warn('Login failed'))
    }, [useLoginMutation, setShowLogin])

    // focus input on showLogin
    const refUsername = React.useRef<HTMLInputElement>(null)
    React.useEffect(() => {
        if (showLogin && refUsername.current !== null) {
            console.debug('showing login? ', showLogin)
            refUsername.current?.focus()
        }
    }, [showLogin])

    return (

        <div className={`animate-fade-in-out ${showLogin ? 'show' : ''} flex items-start justify-center w-full h-full absolute top-0 left-0 right-0 bottom-0 backdrop-filter backdrop-blur-md`}>
            <div className="flex flex-col items-center justify-center p-4 w-full max-w-[500px]">
                <Section visible={showLogin || useLoginMutation.isError}>
                    <div className="w-full flex items-center justify-between">
                        <h2>Login</h2>
                        <div className="flex gap-3 items-center">
                            <GreyText className="max-w-[200px] truncate">{useLoginMutation.error?.message ?? ''}</GreyText>
                            <TbLock className={`${useLoginMutation.isError ? 'text-red-500' : 'text-blue-500'} text-xl cursor-pointer`} onClick={() => {
                                if (typeof window !== 'undefined') window.open(baseUrl, '_blank')
                            }} />
                        </div>
                    </div>
                    <form className="all-inherit" onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        doLogin(username, password)
                    }}>
                        <Input
                            innerRef={refUsername}
                            name="username"
                            placeholder="Username"
                            autoComplete="username"
                            value={username}
                            onChangeValue={setUsername}
                        />
                        <Input
                            placeholder="Password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChangeValue={setPassword}
                        />
                        <BlackButton type="submit" loading={useLoginMutation.isPending} size="md" disabled={username.length < 2 || password.length < 2} className="rounded">Login</BlackButton>
                    </form>
                </Section>
            </div>
        </div>
    )
}