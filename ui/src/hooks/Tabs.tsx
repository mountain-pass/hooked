import { BlackButton } from "@/components/components"
import { UseTabsState } from "./useTabs"

export const Tabs = ({ tabs, currentTab, setCurrentTab, className = '' }: UseTabsState<any> & { className?: string }) => {
    return (
        <div className="flex flex-start gap-2 w-full">
            {tabs.map(tab => (
                <BlackButton
                    title={`Show ${tab} tab`}
                    key={tab}
                    active={tab === currentTab}
                    className={`px-6 rounded ${className}`}
                    size="sm"
                    onClick={() => setCurrentTab(tab)}
                >
                    {tab}
                </BlackButton>
            ))}
        </div>
    )
}