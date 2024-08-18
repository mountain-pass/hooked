import React from "react"

/**  */
export const useRunTimer = () => {
    const startTime = React.useRef(0)
    const endTime = React.useRef(0)
    const [isRunning, setIsRunning] = React.useState(false)
    const [durationMs, setDurationMs] = React.useState(0)
    const intervalRef = React.useRef<any | undefined>()
  
    const start = () => {
      startTime.current = Date.now()
      setDurationMs(0)
      setIsRunning(true)
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTime.current)
      }, 1000)
    }
  
    const stop = (): number => {
      endTime.current = Date.now()
      clearInterval(intervalRef.current)
      setDurationMs(Date.now() - startTime.current)
      setIsRunning(false)
      return endTime.current
    }
  
    return { isRunning, durationMs, start, stop }
  
  }