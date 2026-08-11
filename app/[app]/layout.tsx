import { SidebarProvider } from '@/context/SidebarContext'
import { SearchProvider } from '@/context/SearchContext'
import Sidebar from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { getDevice } from '@/lib/device'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ app: string }>
}) {
  const device = await getDevice()
  const { app: workspaceSlug } = await params

  if (device === 'mobile') {
    return (
      <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface">
        <main className="pb-28">{children}</main>
        <MobileBottomNav workspaceSlug={workspaceSlug} />
      </div>
    )
  }

  // Fetch workspace display name for the GlobalHeader breadcrumb
  const supabase = await createClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('slug', workspaceSlug)
    .single()

  const workspaceName = workspace?.name ?? workspaceSlug

  return (
    <SidebarProvider>
      <SearchProvider>
        <div className="flex min-h-screen bg-[#FAFAF7]">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <GlobalHeader workspaceName={workspaceName} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </SearchProvider>
    </SidebarProvider>
  )
}