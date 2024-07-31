import { useLocalStorageBackedStateV4 } from "./useLocalStorageBackedStateV4"

export interface UseTabsState<TabType extends string> {
    currentTab: TabType
    setCurrentTab: (tab: TabType) => void
    tabs: TabType[]
}

export const useTabs = <TabType extends string>(storageKey: string, tabs: TabType[], initialTab: TabType): UseTabsState<TabType> => {
    const [currentTab, setCurrentTab] = useLocalStorageBackedStateV4(storageKey, initialTab ?? tabs[0])
    return { currentTab: currentTab ?? initialTab ?? tabs[0], setCurrentTab, tabs }
}
