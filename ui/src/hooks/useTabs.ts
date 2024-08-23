import React from 'react'
import { isString } from "@/components/types"
import { useLocalStorageBackedStateV4 } from "./useLocalStorageBackedStateV4"

export interface UseTabsState<TabType extends string> {
    currentTab: TabType
    setCurrentTab: (tab: TabType) => void
    tabs: TabType[]
}

export const useTabs = <TabType extends string>(storageKey: string, tabs: TabType[], initialTab: TabType): UseTabsState<TabType> => {
    const [currentTab, setCurrentTab] = useLocalStorageBackedStateV4(storageKey, initialTab ?? tabs[0])
    React.useEffect(() => {
        if (isString(currentTab) && tabs.length > 0 && !tabs.some(t => t === currentTab)) {
            setCurrentTab(initialTab)
        }
    }, [currentTab, tabs])
    return { currentTab: currentTab ?? initialTab ?? tabs[0], setCurrentTab, tabs }
}
