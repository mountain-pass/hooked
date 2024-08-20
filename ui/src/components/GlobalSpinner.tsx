import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { Spinner } from "./Spinner"

export const GlobalSpinner = ({ className = '' }: { className?: string }) => {
    
    // global fetching / mutating methods
    const isFetching = useIsFetching()
    const isMutating = useIsMutating()

    return (
        <div className={`animate-fade-in-out ${isFetching > 0 || isMutating > 0 ? 'show' : ''} fixed bottom-0 left-0 pb-6 pl-6 flex items-end justify-end z-10`}>
            <Spinner className="w-10 h-10" />
        </div>
        )
    }
