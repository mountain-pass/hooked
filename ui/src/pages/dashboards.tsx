import { Banner } from "@/components/Banner";
import { BlackButton, Section } from "@/components/components";
import { ReactQueryTriggeredModal } from "@/components/modals/ReactQueryTriggeredModal";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { isString } from "@/components/types";
import { useGet } from "@/hooks/ReactQuery";
import { Tabs } from "@/hooks/Tabs";
import { useTabs } from "@/hooks/useTabs";

export default function Dashboards() {

    const useGetDashboards = useGet<{ title: string, path: string}[]>(`/api/dashboard/list`, true)
    const tabs = useTabs<string>('dashboardTab', useGetDashboards.data?.map(x => x.path) ?? [], (useGetDashboards.data?.map(x => x.path).find(x => x)) ?? '')
    const useGetDashboardConfig = useGet<{ title: string, path: string}[]>(`/api/dashboard/get/${tabs.currentTab}`, isString(tabs.currentTab) && tabs.currentTab.trim().length > 0)

    return (<>
      <main className="flex flex-col items-center gap-4">
        <Banner showRefresh={false} showLogout={true} />
        <div className="flex flex-col items-center gap-4 w-full px-4 pb-4">
          <Tabs {...tabs} />
          <DashboardTab visible={useGetDashboardConfig.isFetched} dashboard={useGetDashboardConfig.data ?? {} as any} />
        </div>
      </main>
    </>
    );
}