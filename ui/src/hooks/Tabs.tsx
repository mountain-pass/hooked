import { BlackButton } from "@/components/components"
import { UseTabsState } from "./useTabs"

export const Tabs = ({ tabs, currentTab, setCurrentTab, className = '' }: UseTabsState<any> & { className?: string }) => {
    return (
        <div className="flex flex-start gap-2 w-full">
            {tabs.map(tab => (
                <BlackButton
                    key={tab}
                    active={tab === currentTab}
                    className={`py-4 px-6 ${className}`}
                    onClick={() => setCurrentTab(tab)}
                >
                    {tab}
                </BlackButton>
            ))}
        </div>
    )
}