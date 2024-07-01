import { Banner } from "@/components/Banner";
import { EnvTab } from "@/components/tabs/EnvTab";
import { ScriptsTab } from "@/components/tabs/ScriptsTab";
import { TriggersTab } from "@/components/tabs/TriggersTab";
import { Tabs } from "@/hooks/Tabs";
import { useTabs } from "@/hooks/useTabs";

export default function Home() {
  console.debug('Re-rendering Home...')

  type TabTypes = 'Overview' | 'Environment' | 'Scripts' | 'Triggers' | 'Imports' | 'Plugins'
  const TAB_VALUES: TabTypes[] = ['Environment', 'Scripts', 'Triggers'];
  const tabs = useTabs<TabTypes>(TAB_VALUES, TAB_VALUES[0])

  return (<>
    <main className="flex flex-col items-center gap-4">
      <Banner />
      <div className="flex flex-col items-center gap-4 w-full px-4 pb-4 max-w-[1000px]">
        <Tabs {...tabs} />
        <ScriptsTab visible={tabs.currentTab === 'Scripts'} />
        <EnvTab visible={tabs.currentTab === 'Environment'} />
        <TriggersTab visible={tabs.currentTab === 'Triggers'} />
      </div>
    </main>
  </>
  );
}
