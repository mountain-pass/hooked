import { KEYS, useExecuteScript, useGet } from "@/hooks/ReactQuery"
import React from "react"
import { Spinner } from "../Spinner"
import { Input } from "../common/Input"
import { BlackButton, Section } from "../components"
import { BaseScript, HasEnvScript, StdinScript, isDefined } from "../types"
import { ModalChildProps } from "./Modal"
import { ReactQueryTriggeredModal } from "./ReactQueryTriggeredModal"

export const ExcuteScriptContent = (props: ModalChildProps) => {
    // TODO  how/will the timer be incorporated?
    const { show, setShow, context } = props
    const [nextEnvIndex, setNextEnvIndex] = React.useState(0)
    const scriptConfig: HasEnvScript & BaseScript = context
    const [env, setEnv] = React.useState<Record<string, string>>({})
    const inputRef = React.useRef<HTMLInputElement>(null)

    const doExecute = useExecuteScript()

    const envEntries = React.useMemo(() => Object.entries(scriptConfig.$env || {}).filter(([k, v]: any[]) => v.$ask), [scriptConfig])
    const isLastEntry = React.useMemo(() => nextEnvIndex === envEntries.length - 1, [nextEnvIndex, envEntries])

    // key
    const currentEnvKey = React.useMemo(() => {
        return isDefined(envEntries) && isDefined(envEntries[nextEnvIndex]) ? envEntries[nextEnvIndex][0] : ''
    }, [envEntries, nextEnvIndex])

    const currentEnvConfig = useGet<StdinScript>(`/api/resolveEnvValue/default/script/${scriptConfig._scriptPath}/env/${currentEnvKey}`, !!show, 0)

    const onNextEnv = () => {
      setNextEnvIndex(ps => ps + 1)
      inputRef.current!.focus()
    }

    const onCloseModal = React.useCallback(() => {
      setNextEnvIndex(0)
      setEnv({})
      setShow(false)
    }, [setShow])

    const onExecute = () => {
      doExecute.mutateAsync({ scriptPath: scriptConfig!._scriptPath!, envNames: 'default', env })
      onCloseModal()
    }

    const onChange = (value: string) => {
      setEnv(ps => { 
          return { ...ps, [currentEnvKey]: value }
         })
    }

    // on show / hide
    React.useEffect(() => {
      if (show) {
        inputRef.current!.focus()
      } else {
        // modal is already closing, clean up the data
        onCloseModal()
      }
    }, [show, onCloseModal])

    return (<>
        {/* <pre>{JSON.stringify(scriptConfig, null, 2)}</pre> */}
        
        <Section visible={show} className="max-h-full min-h-1">
            <h2 className="flex justify-between align-middle">
              <span>Execute: &quot;{scriptConfig._scriptPath}&quot;</span>
              <span>({nextEnvIndex + 1}/{envEntries.length})</span>
            </h2>

            {/* <pre>{JSON.stringify(currentEnvConfig, null, 2)}</pre> */}

            { (currentEnvConfig.isLoading || currentEnvConfig.isPending) && <Spinner className="w-10 h-10" /> }
            
            {/* <div>currentEnvConfig={JSON.stringify(currentEnvConfig.data)}</div> */}
            {/* <div>env={JSON.stringify(env)}</div> */}
            <div>
              <label className="block px-1 py-3">{currentEnvConfig.data?.$ask}</label>
              <Input
                innerRef={inputRef}
                value={env[currentEnvKey] || ''}
                onChangeValue={value => onChange(value)}
              />
            </div>

            <div className={`grid grid-cols-1 gap-3 min-h-1 ${currentEnvConfig.data?.$choices ? 'visible' : 'hidden'}`}>
              <h3>Choices:</h3>
              <div className="grid grid-cols-1 gap-0 overflow-y-auto">
                  { (currentEnvConfig.data?.$choices as { name: string, value: string}[])?.map(choice => {
                      return (<BlackButton key={choice.name} title={choice.name} size="md" onClick={() => onChange(choice.value)}>{choice.name}</BlackButton>)
                  }) }
              </div>
            </div>

            <div className="grid grid-cols-2 grid-flow-row gap-2">

                {/* right */}
                <BlackButton title="Next" size="md"
                  className={"order-2 " + (!isLastEntry ? 'visible' : 'hidden')}
                  onClick={() => onNextEnv()}
                  disabled={(env[currentEnvKey] || '') === ''}
                >Next</BlackButton>
                <BlackButton title="Execute" size="md"
                  className={"order-2 " + (isLastEntry ? 'visible' : 'hidden')}
                  onClick={() => onExecute()}
                  disabled={(env[currentEnvKey] || '') === ''}
                >Execute</BlackButton>

                {/* left */}
                <BlackButton title="Cancel" size="md"
                  className="order-1"
                  onClick={() => onCloseModal()}
                >Cancel</BlackButton>
            </div>
        </Section>

    </>)
}

export const ExecuteScriptModal = () => {
    return (
        <ReactQueryTriggeredModal queryKey={KEYS.showExecuteModal()}>
              {ExcuteScriptContent}
        </ReactQueryTriggeredModal>
        )
}